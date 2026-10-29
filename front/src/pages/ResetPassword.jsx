import { PublicMobileHeader } from '../navigation/MobileNavigation'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import AuthShell from '../components/AuthShell'
import PasswordInput from '../components/PasswordInput'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!token) {
    return (
      <><PublicMobileHeader /><AuthShell>
        <div className="card auth">
          <h1>Link inválido</h1>
          <p>Este link de redefinição está incompleto. Peça um novo.</p>
          <Link to="/forgot-password" className="cta">Pedir novo link</Link>
        </div>
      </AuthShell></>
    )
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('As senhas não conferem')
      return
    }
    setBusy(true)
    try {
      await api.resetPassword(token, password)
      navigate('/login', { replace: true, state: { message: 'Senha redefinida! Entre com a nova senha.' } })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <><PublicMobileHeader /><AuthShell>
      <form className="card auth" onSubmit={submit}>
        <h1>Nova senha</h1>
        <PasswordInput
          label="Nova senha"
          hint="Mínimo de 8 caracteres."
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          maxLength={128}
          required
        />
        <PasswordInput
          label="Repita a nova senha"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          minLength={8}
          maxLength={128}
          required
        />
        {error && (
          <p className="error" role="alert">
            {error} {error.includes('inválido') && <Link to="/forgot-password">Pedir novo link</Link>}
          </p>
        )}
        <button className="big" disabled={busy}>{busy ? 'Salvando…' : 'Redefinir senha'}</button>
        <p className="muted">Por segurança, você será desconectado de todos os dispositivos.</p>
      </form>
    </AuthShell></>
  )
}
