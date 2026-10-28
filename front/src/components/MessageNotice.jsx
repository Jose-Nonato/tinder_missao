import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useChat } from '../chat/ChatContext'
import Icon from './Icon'

export default function MessageNotice() {
  const { user } = useAuth()
  const { subscribe, conversations } = useChat()
  const { pathname } = useLocation()
  const [notice, setNotice] = useState(null)
  useEffect(() => subscribe(event => {
    if (event.type !== 'message' || event.message.recipient_id !== user.id) return
    const id = event.message.sender_id
    if (pathname === `/messages/${id}`) return
    setNotice({ id, owner: user.id })
  }), [subscribe, user.id, pathname])
  const visible = notice?.owner === user.id && pathname !== `/messages/${notice?.id}`
  const name = conversations.find(c => c.user.id === notice?.id)?.user.username
  return <div className="message-notice" aria-live="polite" aria-atomic="true">
    {visible && <div className="notice-content">
      <span>Nova mensagem{name ? ` de ${name}` : ''}</span>
      <Link className="cta" to={`/messages/${notice.id}`} onClick={() => setNotice(null)}>Abrir</Link>
      <button className="icon-btn" type="button" aria-label="Dispensar aviso de mensagem" onClick={() => setNotice(null)}><Icon name="x" size={18} /></button>
    </div>}
  </div>
}
