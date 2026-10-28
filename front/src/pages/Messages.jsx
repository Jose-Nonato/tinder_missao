import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { useChat } from '../chat/ChatContext'
import Avatar from '../components/Avatar'
import Icon from '../components/Icon'
import Sheet from '../components/Sheet'
import UserActions from '../components/UserActions'
import { icebreakers } from '../components/icebreakers'

const time = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
const day = (iso) => new Date(iso).toLocaleDateString('pt-BR')
const sameDay = (iso) => day(iso) === day(new Date().toISOString())
// hora se for de hoje, senão dd/mm
const short = (iso) => (sameDay(iso) ? time(iso) : new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }))

function ConversationList({ conversations, me }) {
  if (conversations.length === 0) {
    return (
      <div className="empty-state compact">
        <span className="empty-ico"><Icon name="chat" size={32} /></span>
        <p>Nenhum match ainda. Curta pessoas em Descobrir para conversar.</p>
        <Link to="/discover" className="cta">Descobrir</Link>
      </div>
    )
  }
  return (
    <ul className="plain-list">
      {conversations.map((c) => {
        const last = c.last_message
        return (
          <li key={c.user.id}>
            <NavLink to={`/messages/${c.user.id}`} className={({ isActive }) => `conv${isActive ? ' active' : ''}`}>
              <Avatar src={c.user.photo} name={c.user.username} />
              <div className="grow conv-text">
                <div className="conv-top">
                  <b>{c.user.username}</b>
                  {last && <time dateTime={last.created_at} className="muted">{short(last.created_at)}</time>}
                </div>
                <div className={`conv-last${c.unread > 0 ? ' unread' : ''}`}>
                  {last ? `${last.sender_id === me ? 'Você: ' : ''}${last.text}` : 'Novo match! Diga oi.'}
                </div>
              </div>
              {c.unread > 0 && (
                <>
                  <span className="badge-count solid" aria-hidden="true">{c.unread}</span>
                  <span className="sr-only">{c.unread} {c.unread === 1 ? 'mensagem não lida' : 'mensagens não lidas'}</span>
                </>
              )}
            </NavLink>
          </li>
        )
      })}
    </ul>
  )
}

function Thread({ other }) {
  const { user: me } = useAuth()
  const chat = useChat()
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [unavailable, setUnavailable] = useState(false)
  const [text, setText] = useState('')
  const [menu, setMenu] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const composer = useRef(null)
  const follow = useRef(true)
  const [firstUnread, setFirstUnread] = useState(null)
  const scroller = useRef(null)
  const bottom = useRef(null)
  const prevHeight = useRef(null) // preserva a posição ao carregar mensagens antigas

  useEffect(() => {
    let cancelled = false
    api.matches().then(matches => {
      if (!cancelled) setSuggestions(icebreakers(matches.find(m => m.profile.id === other.id)?.profile.breakdown))
    }).catch(() => {})
    api.history(other.id)
      .then((h) => {
        if (cancelled) return
        setFirstUnread(h.messages.find(m => m.sender_id === other.id && !m.read_at)?.id ?? null)
        setMessages(h.messages)
        setHasMore(h.has_more)
        api.markRead(other.id).catch(() => {})
      })
      .catch((err) => !cancelled && (err.status === 404 ? setUnavailable(true) : setError(err.message)))
      .finally(() => !cancelled && setLoading(false))
    chat.setActive(other.id)
    return () => { cancelled = true; chat.setActive(null) }
  }, [other.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => chat.subscribe((ev) => {
    if (ev.type === 'message') {
      const m = ev.message
      if (m.sender_id !== other.id && m.recipient_id !== other.id) return
      if (m.sender_id === other.id) setFirstUnread(id => id ?? m.id)
      setMessages((list) => {
        if (list.some((x) => x.id === m.id)) return list
        // eco da minha própria mensagem otimista: troca a pendente pela definitiva
        const pending = m.client_id ? list.findIndex((x) => x.client_id === m.client_id) : -1
        if (pending >= 0) return list.map((x, i) => (i === pending ? m : x))
        return [...list, m]
      })
      if (m.sender_id === other.id) api.markRead(other.id).catch(() => {})
    }
    if (ev.type === 'read' && ev.by === other.id) {
      const now = new Date().toISOString()
      setMessages((list) => list.map((m) => (m.sender_id === me.id && !m.read_at ? { ...m, read_at: now } : m)))
    }
    if (ev.type === 'error' && ev.client_id) {
      setMessages((list) => list.map((m) => (m.client_id === ev.client_id && m.pending ? { ...m, pending: false, failed: ev.detail } : m)))
    }
  }), [chat, other.id, me.id])

  useLayoutEffect(() => {
    const el = scroller.current
    if (prevHeight.current != null) {
      el.scrollTop = el.scrollHeight - prevHeight.current
      prevHeight.current = null
    } else if (follow.current) {
      bottom.current?.scrollIntoView({ block: 'end' })
    }
  }, [messages])

  const loadOlder = async () => {
    try {
      const h = await api.history(other.id, messages[0].id)
      prevHeight.current = scroller.current.scrollHeight
      setMessages((list) => [...h.messages, ...list])
      setHasMore(h.has_more)
    } catch (err) { setError(err.message) }
  }

  const submit = (e) => {
    e.preventDefault()
    const body = text.trim()
    if (!body) return
    setError('')
    try {
      const clientId = chat.send(other.id, body)
      follow.current = true
      setMessages((list) => [...list, {
        id: clientId, client_id: clientId, sender_id: me.id, recipient_id: other.id,
        text: body, created_at: new Date().toISOString(), read_at: null, pending: true,
      }])
      setText('')
    } catch (err) {
      setError(err.message)
    }
  }

  if (unavailable) {
    return (
      <section className="thread">
        <header className="thread-head">
          <Link to="/messages" className="icon-btn back" aria-label="Voltar para as conversas"><Icon name="arrow-left" /></Link>
          <b>Conversa indisponível</b>
        </header>
        <p className="pad">Esta conversa não está mais disponível.</p>
      </section>
    )
  }

  return (
    <section className="thread" aria-label={`Conversa com ${other.username}`}>
      <header className="thread-head">
        <Link to="/messages" className="icon-btn back" aria-label="Voltar para as conversas">
          <Icon name="arrow-left" />
        </Link>
        <Avatar src={other.photo} name={other.username} size="sm" />
        <div className="grow thread-who">
          <b>{other.username}{other.age != null && `, ${other.age}`}</b>
          <small className="muted" role="status">{chat.status === 'open' ? 'Conectado' : 'Reconectando…'}</small>
        </div>
        <button type="button" className="icon-btn" onClick={() => setMenu(true)} aria-label={`Mais opções de ${other.username}`} aria-haspopup="dialog">
          <Icon name="more" />
        </button>
      </header>

      <div className="messages" ref={scroller} onScroll={e => { const el = e.currentTarget; follow.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80 }}>
        {loading && <p className="center muted">Carregando…</p>}
        {hasMore && <button type="button" className="secondary small center-btn" onClick={loadOlder}>Mensagens anteriores</button>}
        {!loading && messages.length === 0 && (
          <div className="first-msg icebreakers">
            <h2>Uma conversa começa com curiosidade</h2>
            <p className="muted">Vocês deram match! {suggestions.length ? 'Escolha uma ideia sobre um tópico em comum e edite do seu jeito.' : 'Que tal se apresentar?'} </p>
            {suggestions.map(suggestion => <button className="secondary" type="button" key={suggestion} onClick={() => { setText(suggestion); composer.current?.focus() }}>{suggestion}</button>)}
            {suggestions.length > 0 && <small className="muted">Nada é enviado até você tocar em Enviar.</small>}
          </div>
        )}
        {messages.map((m, i) => {
          const mine = m.sender_id === me.id
          const newDay = i === 0 || day(messages[i - 1].created_at) !== day(m.created_at)
          return (
            <div key={m.id}>
              {m.id === firstUnread && <div className="unread-divider" role="separator" aria-label="Novas mensagens">Novas mensagens</div>}
              {newDay && <div className="day">{sameDay(m.created_at) ? 'Hoje' : day(m.created_at)}</div>}
              <div className={`bubble${mine ? ' mine' : ''}`}>
                <span className="bubble-text">{m.text}</span>
                <span className="meta">
                  <time dateTime={m.created_at}>{time(m.created_at)}</time>
                  {mine && (
                    m.failed ? <span> · Não enviada</span>
                      : m.pending ? <span> · Enviando…</span>
                        : (
                          <>
                            <Icon name={m.read_at ? 'check-check' : 'check'} size={16} />
                            <span className="sr-only">{m.read_at ? 'Lida' : 'Enviada'}</span>
                          </>
                        )
                  )}
                </span>
                {m.failed && <span className="bubble-error" role="alert">{m.failed}</span>}
              </div>
            </div>
          )
        })}
        <div ref={bottom} />
      </div>

      {error && <p className="error pad" role="alert">{error}</p>}
      <form className="composer" onSubmit={submit}>
        <label className="sr-only" htmlFor="msg">Mensagem</label>
        <input
          id="msg"
          ref={composer}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={1000}
          placeholder="Escreva uma mensagem"
          autoComplete="off"
          enterKeyHint="send"
        />
        <button className="send" disabled={!text.trim() || chat.status !== 'open'} aria-label="Enviar mensagem">
          <Icon name="send" size={22} />
        </button>
      </form>

      {menu && (
        <Sheet title={other.username} onClose={() => setMenu(false)} size="sm">
          <UserActions
            profile={other}
            onDone={(_, { blocked }) => {
              if (!blocked) return // denúncia sem bloqueio: a conversa continua
              setMenu(false)
              chat.loadConversations()
              navigate('/messages', { replace: true })
            }}
          />
        </Sheet>
      )}
    </section>
  )
}

export default function Messages() {
  const { userId } = useParams()
  const { user: me } = useAuth()
  const { conversations, loadConversations } = useChat()
  // a lista pode ter mudado em outras telas (bloquear, desbloquear, match novo)
  useEffect(() => { loadConversations() }, [loadConversations])
  const other = conversations.find((c) => c.user.id === userId)?.user

  return (
    <>
      <h1 className="page-title">Mensagens</h1>
      <div className={`chat${userId ? ' has-thread' : ''}`}>
        <aside className="conv-list" aria-label="Conversas">
          <ConversationList conversations={conversations} me={me.id} />
        </aside>
        {userId ? (
          other ? <Thread key={userId} other={other} /> : <div className="thread"><p className="pad muted">Carregando…</p></div>
        ) : (
          <div className="thread thread-empty">
            <Icon name="chat" size={40} />
            <p className="muted">Selecione uma conversa.</p>
          </div>
        )}
      </div>
    </>
  )
}
