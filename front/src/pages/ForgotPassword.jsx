import { TextInput } from '../components/form/Controls'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import AuthShell from '../components/AuthShell'
import Icon from '../components/Icon'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [contact, setContact] = useState('')
  const [sentMessage, setSentMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = await api.forgotPassword(email, contact)
      setSentMessage(res.message) // a resposta é a mesma exista a conta ou não
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (sentMessage) {
    return (
      <AuthShell>
        <div className="card auth">
          <span className="empty-ico"><Icon name="check" size={32} /></span>
          <h1>Pedido enviado</h1>
          <p role="status">{sentMessage}</p>
          <p className="muted">
            Quando a administração liberar, você receberá um link para criar a nova senha. Ele vale por
            tempo limitado e só pode ser usado uma vez.
          </p>
          <Link to="/login" className="cta">Voltar para o login</Link>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <form className="card auth" onSubmit={submit}>
        <h1>Esqueci minha senha</h1>
        <p className="muted">
          A redefinição é feita pela administração do app. Informe o email da conta e uma forma de falar
          com você, para confirmarmos que é você mesmo.
        </p>
        <label>Email da conta
          <TextInput
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={254}
            required
          />
        </label>
        <label>Como podemos falar com você? <small className="muted">(WhatsApp, telefone…)</small>
          <TextInput
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            maxLength={200}
            placeholder="Ex.: WhatsApp (11) 99999-0000"
          />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="big" disabled={busy}>{busy ? 'Enviando…' : 'Pedir redefinição'}</button>
        <p className="auth-links"><Link to="/login">Voltar para o login</Link></p>
      </form>
    </AuthShell>
  )
}
