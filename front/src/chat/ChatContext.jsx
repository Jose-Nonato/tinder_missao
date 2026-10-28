import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { api, wsUrl } from '../api/client'
import { useAuth } from '../auth/AuthContext'

const ChatContext = createContext(null)
const NONE = [] // referência estável para "sem conversas"

const CLOSE_FORBIDDEN = 4403 // conta suspensa ou sem permissão: não adianta reconectar

// Mantém uma única conexão WebSocket enquanto o usuário está logado e com o perfil completo.
// Guarda a lista de conversas (com não lidas) e repassa os eventos para quem estiver ouvindo.
export function ChatProvider({ children }) {
  const { user } = useAuth()
  const enabled = Boolean(
    user && user.role === 'user' && user.questionnaire_completed && user.profile_completed,
  )
  const meId = user?.id

  // Lista de conversas guardada junto com o dono, para nunca mostrar a de outro usuário.
  const [data, setData] = useState({ owner: null, list: [] })
  const conversations = enabled && data.owner === meId ? data.list : NONE
  const setConversations = useCallback(
    (next) => setData((d) => {
      const current = d.owner === meId ? d.list : []
      return { owner: meId, list: typeof next === 'function' ? next(current) : next }
    }),
    [meId],
  )
  const [status, setStatus] = useState('closed') // connecting | open | closed
  const wsRef = useRef(null)
  const listeners = useRef(new Set())
  const activeRef = useRef(null) // conversa aberta na tela (suas mensagens chegam já lidas)

  const loadConversations = useCallback(
    () => api.conversations().then(setConversations).catch(() => {}),
    [setConversations],
  )

  useEffect(() => {
    if (!enabled) return undefined
    let stopped = false
    let retry = 0
    let timer

    const applyMessage = (m) => {
      const other = m.sender_id === meId ? m.recipient_id : m.sender_id
      const incoming = m.recipient_id === meId
      setConversations((list) => {
        const found = list.find((c) => c.user.id === other)
        if (!found) {
          loadConversations() // match novo que ainda não estava na lista
          return list
        }
        const unread = incoming && activeRef.current !== other ? found.unread + 1 : found.unread
        return [{ ...found, last_message: m, unread }, ...list.filter((c) => c !== found)]
      })
    }

    const onEvent = (ev) => {
      if (ev.type === 'message') applyMessage(ev.message)
      if (ev.type === 'read_sync') {
        setConversations((list) => list.map((c) => (c.user.id === ev.with ? { ...c, unread: 0 } : c)))
      }
      listeners.current.forEach((fn) => fn(ev))
    }

    const connect = async () => {
      setStatus('connecting')
      let token
      try {
        token = await api.freshToken()
      } catch {
        if (!stopped) timer = setTimeout(connect, 3000)
        return
      }
      if (stopped) return
      const ws = new WebSocket(wsUrl())
      wsRef.current = ws
      // o token vai na primeira mensagem, não na URL
      ws.onopen = () => ws.send(JSON.stringify({ type: 'auth', token }))
      ws.onmessage = (e) => {
        const ev = JSON.parse(e.data)
        if (ev.type === 'ready') {
          retry = 0
          setStatus('open')
          loadConversations() // recupera o que chegou enquanto estava desconectado
          return
        }
        onEvent(ev)
      }
      ws.onclose = (e) => {
        if (wsRef.current === ws) wsRef.current = null
        setStatus('closed')
        if (stopped || e.code === CLOSE_FORBIDDEN) return
        retry += 1
        timer = setTimeout(connect, Math.min(1000 * 2 ** retry, 15000))
      }
    }

    loadConversations()
    connect()
    return () => {
      stopped = true
      clearTimeout(timer)
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [enabled, meId, loadConversations, setConversations])

  const send = useCallback((to, text) => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) throw new Error('Sem conexão com o chat')
    const clientId = crypto.randomUUID()
    ws.send(JSON.stringify({ type: 'message', to, text, client_id: clientId }))
    return clientId
  }, [])

  const subscribe = useCallback((fn) => {
    listeners.current.add(fn)
    return () => listeners.current.delete(fn)
  }, [])

  const setActive = useCallback((userId) => { activeRef.current = userId }, [])

  const unreadTotal = useMemo(() => conversations.reduce((n, c) => n + c.unread, 0), [conversations])

  const value = { conversations, unreadTotal, status, send, subscribe, setActive, loadConversations }
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export const useChat = () => useContext(ChatContext)
