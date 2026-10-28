import { useState } from 'react'
import { api } from '../api/client'
import Icon from './Icon'

export const REASONS = {
  fake_profile: 'Perfil falso',
  inappropriate_content: 'Conteúdo impróprio',
  harassment: 'Assédio ou ofensas',
  underage: 'Parece ser menor de idade',
  spam: 'Spam ou golpe',
  other: 'Outro motivo',
}

// Botões "Bloquear" e "Denunciar" para um perfil. `onDone` é chamado depois que a ação
// funciona, para o pai tirar a pessoa da tela: onDone(id, { blocked }).
export default function UserActions({ profile, onDone }) {
  const [reporting, setReporting] = useState(false)
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [alsoBlock, setAlsoBlock] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false) // denúncia enviada (sem bloqueio)

  const run = async (fn, blocked) => {
    setBusy(true)
    setError('')
    try {
      await fn()
      onDone(profile.id, { blocked })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const block = () => {
    if (!confirm(`Bloquear ${profile.username}? Vocês deixarão de ver um ao outro.`)) return
    run(() => api.blockUser(profile.id), true)
  }

  const report = (e) => {
    e.preventDefault()
    run(async () => {
      await api.reportUser(profile.id, reason, details, alsoBlock)
      setReporting(false)
      setReason('')
      setDetails('')
      setSent(true)
    }, alsoBlock)
  }

  return (
    <div className="user-actions">
      <div className="row">
        <button type="button" className="secondary" disabled={busy} onClick={block}>
          <Icon name="ban" size={20} /> Bloquear
        </button>
        <button
          type="button"
          className="secondary danger-outline"
          disabled={busy}
          aria-expanded={reporting}
          onClick={() => { setReporting(!reporting); setSent(false) }}
        >
          <Icon name="flag" size={20} /> Denunciar
        </button>
      </div>
      {reporting && (
        <form className="card report-form" onSubmit={report}>
          <label>Motivo
            <select value={reason} onChange={(e) => setReason(e.target.value)} required>
              <option value="" disabled>Selecione</option>
              {Object.entries(REASONS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label>Detalhes (opcional)
            <textarea value={details} onChange={(e) => setDetails(e.target.value)} maxLength={500} rows={3} />
          </label>
          <label className="check">
            <input type="checkbox" checked={alsoBlock} onChange={(e) => setAlsoBlock(e.target.checked)} />
            Bloquear também
          </label>
          <div className="row">
            <button disabled={busy || !reason}>Enviar denúncia</button>
            <button type="button" className="secondary" onClick={() => setReporting(false)}>Cancelar</button>
          </div>
        </form>
      )}
      {sent && <p className="ok" role="status">Denúncia enviada. Obrigado!</p>}
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  )
}
