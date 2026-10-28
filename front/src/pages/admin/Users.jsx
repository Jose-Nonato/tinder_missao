import SuspendUser from '../../components/SuspendUser'
import Select from '../../components/form/Select'
import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'

export default function Users() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState([])
  const [error, setError] = useState('')
  const [suspending, setSuspending] = useState(null)

  const load = () => api.listUsers().then(setUsers).catch((e) => setError(e.message))
  useEffect(() => { load() }, [])

  const changeRole = async (u, role) => {
    setError('')
    try {
      await api.setRole(u.id, role)
      load()
    } catch (e) { setError(e.message) }
  }

  const reactivate = async (u) => {
    setError('')
    try {
      await api.reactivateUser(u.id)
      load()
    } catch (e) { setError(e.message) }
  }

  return (
    <>
      <h1 className="page-title">Usuários</h1>
      {suspending && <SuspendUser user={suspending} onClose={() => setSuspending(null)} onDone={load} />}
      {error && <p className="error" role="alert">{error}</p>}
      <div className="table-wrap">
        <table className="table-cards">
          <caption className="sr-only">Usuários cadastrados</caption>
          <thead><tr><th>Usuário</th><th>Email</th><th>Papel</th><th>Conta</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td data-label="Usuário"><b>{u.username}</b></td>
                <td data-label="Email">{u.email}</td>
                <td data-label="Papel">
                  <Select
                    aria-label={`Papel de ${u.username}`}
                    value={u.role}
                    disabled={u.id === me.id}
                    onChange={(e) => changeRole(u, e.target.value)}
                  >
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </Select>
                </td>
                <td data-label="Conta">
                  {u.role === 'admin' ? '—' : u.suspended ? (
                    <>
                      <span className="tag suspended">suspensa</span>{' '}
                      <button className="link" onClick={() => reactivate(u)}>Reativar</button>
                    </>
                  ) : (
                    <button className="link danger" onClick={() => setSuspending(u)}>Suspender</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
