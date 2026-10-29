import { TextInput } from '../components/form/Controls'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import Legal from './Legal'
import { PublicMobileHeader } from '../navigation/MobileNavigation'
import AuthShell from '../components/AuthShell'
import PasswordInput from '../components/PasswordInput'
import TermsConsent from '../components/TermsConsent'
import { registrationPayload } from '../legal/consent'

export default function Register() {
  const { '*': document } = useParams()
  const reading = document === 'termos' || document === 'privacidade'
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await api.register(registrationPayload(form, accepted))
      await login(form.email, form.password)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
    <div hidden={reading}>
    <PublicMobileHeader />
    <AuthShell>
      <form className="card auth" onSubmit={submit}>
        <h1>Criar conta</h1>
        <label>Usuário
          <TextInput
            value={form.username}
            onChange={set('username')}
            autoComplete="username"
            minLength={3}
            maxLength={30}
            pattern="[A-Za-z0-9_.\-]+"
            title="Letras, números, ponto, hífen e sublinhado"
            required
          />
        </label>
        <label>Email
          <TextInput
            type="email"
            inputMode="email"
            autoComplete="email"
            value={form.email}
            onChange={set('email')}
            maxLength={254}
            required
          />
        </label>
        <PasswordInput
          label="Senha"
          hint="Mínimo de 8 caracteres."
          autoComplete="new-password"
          value={form.password}
          onChange={set('password')}
          minLength={8}
          maxLength={128}
          required
        />
        <TermsConsent checked={accepted} onChange={setAccepted} />
        {error && <p className="error" role="alert">{error}</p>}
        <button className="big" disabled={busy}>{busy ? 'Criando…' : 'Cadastrar'}</button>
        <p className="auth-links">Já tem conta? <Link to="/login">Entrar</Link></p>
      </form>
    </AuthShell>
    </div>
    {reading && <Legal privacy={document === 'privacidade'} />}
    </>
  )
}
