import { useState } from 'react'
import { api } from '../api/client'
import Sheet from './Sheet'
import { Textarea } from './Field'

export default function SuspendUser({ user, onClose, onDone }) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submit = async e => {
    e.preventDefault()
    if (!reason.trim() || busy) return
    setBusy(true)
    setError('')
    try { await api.suspendUser(user.id, reason.trim()); onDone(); onClose() }
    catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }
  return <Sheet title={`Suspender ${user.username}`} onClose={() => { if (!busy) onClose() }} size="sm">
    <form className="stack" onSubmit={submit}>
      <Textarea label="Motivo da suspensão" value={reason} onChange={e => setReason(e.target.value)} required maxLength={300} disabled={busy} />
      {error && <p className="error" role="alert">{error}</p>}
      <div className="row"><button className="danger-btn" disabled={busy || !reason.trim()}>{busy ? 'Suspendendo…' : 'Suspender conta'}</button><button type="button" className="secondary" disabled={busy} onClick={onClose}>Cancelar</button></div>
    </form>
  </Sheet>
}
