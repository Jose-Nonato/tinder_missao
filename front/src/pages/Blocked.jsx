import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import Avatar from '../components/Avatar'
import EmptyIllustration from '../components/EmptyIllustration'

export default function Blocked() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.blockedUsers()
      .then(setUsers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const unblock = async (u) => {
    setError('')
    try {
      await api.unblockUser(u.id)
      setUsers((list) => list.filter((x) => x.id !== u.id))
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <p className="center loading">Carregando…</p>

  return (
    <>
      <h1 className="page-title">Bloqueados</h1>
      <p className="muted section-lead">
        Pessoas bloqueadas não veem o seu perfil e você não vê o delas. Dá para desbloquear quando quiser.
      </p>
      {error && <p className="error" role="alert">{error}</p>}
      {users.length === 0 && !error && (
        <div className="empty-state">
          <EmptyIllustration />
          <h2>Você não bloqueou ninguém</h2>
          <p>Para bloquear alguém, abra o perfil da pessoa em Descobrir, Matches ou na conversa.</p>
          <Link to="/discover" className="cta">Voltar a descobrir</Link>
        </div>
      )}
      <ul className="plain-list">
        {users.map((u) => (
          <li className="list-row" key={u.id}>
            <Avatar src={u.photo} name={u.username} />
            <div className="grow">
              <b>{u.username}</b>
              <small className="muted">Bloqueado em {new Date(u.blocked_at).toLocaleDateString('pt-BR')}</small>
            </div>
            <button type="button" className="secondary" onClick={() => unblock(u)}>Desbloquear</button>
          </li>
        ))}
      </ul>
    </>
  )
}
