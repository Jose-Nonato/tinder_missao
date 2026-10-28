import { TextInput } from '../components/form/Controls'
import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import AuthShell from '../components/AuthShell'
import '../styles/login-mobile.css'
import Icon from '../components/Icon'
import PasswordInput from '../components/PasswordInput'

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const flash = useLocation().state?.message // ex.: "Senha redefinida"
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/" replace />

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell compactMobile>
      <form className="card auth" onSubmit={submit} noValidate={false}>
        <h1>Entrar</h1>
        {flash && <p className="ok" role="status">{flash}</p>}
        <label>Email
          <TextInput
            type="email"
            inputMode="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={254}
            required
          />
        </label>
        <PasswordInput
          label="Senha"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          maxLength={128}
          required
        />
        {error && <p className="error" role="alert">{error}</p>}
        <button className="big" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
        <p className="auth-links">
          <Link className="btn-text" to="/forgot-password"><Icon name="key" size={16} />Esqueci minha senha</Link>
        </p>
        <p className="auth-links">Não tem conta? <Link to="/register">Cadastre-se</Link></p>
      </form>
    </AuthShell>
  )
}
