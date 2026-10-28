import SuspendUser from '../../components/SuspendUser'
import Select from '../../components/form/Select'
import { TextArea } from '../../components/form/Controls'
import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import PhotoGallery from '../../components/PhotoGallery'
import { REASONS } from '../../components/UserActions'

const STATUS = { open: 'aberta', resolved: 'resolvida', dismissed: 'descartada' }
const TABS = [
  ['open', 'Abertas'],
  ['resolved', 'Resolvidas'],
  ['dismissed', 'Descartadas'],
  ['', 'Todas'],
]
const fmt = (iso) => new Date(iso).toLocaleString('pt-BR')

function Detail({ reportId, onChanged }) {
  const [d, setD] = useState(null)
  const [note, setNote] = useState('')
  const [suspending, setSuspending] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    api.reportDetail(reportId).then(setD).catch((e) => setError(e.message))
  }, [reportId, version])

  const act = async (fn) => {
    setBusy(true)
    setError('')
    try {
      await fn()
      setVersion((v) => v + 1)
      onChanged()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const decide = (status) => act(async () => {
    await api.setReportStatus(reportId, status, note)
    setNote('')
  })

  const reactivate = () => {
    if (!confirm(`Reativar a conta de ${d.reported.username}?`)) return
    act(() => api.reactivateUser(d.reported.id))
  }

  if (!d) return error ? <p className="error" role="alert">{error}</p> : <p className="muted">Carregando detalhes…</p>
  const p = d.reported_profile
  const place = p && [p.city, p.state, p.country].filter(Boolean).join(', ')

  return (
    <div className="report-detail">
      {suspending && <SuspendUser user={d.reported} onClose={() => setSuspending(false)} onDone={() => { setVersion(v => v + 1); onChanged() }} />}
      <div className="report-profile">
        {p ? (
          <>
            <PhotoGallery photos={p.photos} name={d.reported.username} />
            <div>
              <b>{d.reported.username}</b>{p.age != null && `, ${p.age} anos`}
              {p.gender && <span className="muted"> · {p.gender === 'male' ? 'masculino' : 'feminino'}</span>}
              {place && <div className="muted">📍 {place}</div>}
              {(p.profession || p.university) && (
                <div className="muted">{[p.profession, p.university].filter(Boolean).join(' · ')}</div>
              )}
              {p.description && <p className="bio">{p.description}</p>}
            </div>
          </>
        ) : (
          <p className="muted">Este usuário ainda não preencheu o perfil.</p>
        )}
      </div>

      {d.reported_suspended && (
        <p className="notice">Conta suspensa. Motivo: {d.suspended_reason || '—'}</p>
      )}

      {d.resolved_by && (
        <p className="muted">
          {STATUS[d.status] === 'resolvida' ? 'Resolvida' : 'Descartada'} por <b>{d.resolved_by.username}</b>
          {d.resolved_at && ` em ${fmt(d.resolved_at)}`}
          {d.resolution_note && <> — “{d.resolution_note}”</>}
        </p>
      )}

      <h4>Outras denúncias contra {d.reported.username} ({d.history.length})</h4>
      {d.history.length === 0 && <p className="muted">Nenhuma outra denúncia.</p>}
      {d.history.map((h) => (
        <div className="history-item" key={h.id}>
          <b>{REASONS[h.reason] ?? h.reason}</b> · por {h.reporter.username} · {fmt(h.created_at)} ·{' '}
          <span className={`status-${h.status}`}>{STATUS[h.status]}</span>
          {h.details && <div className="quote">{h.details}</div>}
        </div>
      ))}

      <label>Observação do administrador (opcional)
        <TextArea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2}
          placeholder="Ex.: conferido, sem violação das regras" />
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="row wrap">
        {d.status !== 'resolved' && <button disabled={busy} onClick={() => decide('resolved')}>Marcar como resolvida</button>}
        {d.status !== 'dismissed' && <button disabled={busy} className="secondary" onClick={() => decide('dismissed')}>Descartar</button>}
        {d.status !== 'open' && <button disabled={busy} className="link" onClick={() => decide('open')}>reabrir</button>}
        <span className="grow" />
        {d.reported_suspended ? (
          <button disabled={busy} className="secondary" onClick={reactivate}>Reativar conta</button>
        ) : (
          <button disabled={busy} className="danger-btn" onClick={() => setSuspending(true)}>Suspender conta</button>
        )}
      </div>
    </div>
  )
}

export default function Reports() {
  const [status, setStatus] = useState('open')
  const [reason, setReason] = useState('')
  const [reports, setReports] = useState([])
  const [summary, setSummary] = useState(null)
  const [openId, setOpenId] = useState(null)
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0) // incrementa para recarregar a lista

  useEffect(() => {
    Promise.all([api.listReports(status, reason), api.reportsSummary()])
      .then(([list, counts]) => { setReports(list); setSummary(counts); setError('') })
      .catch((e) => setError(e.message))
  }, [status, reason, version])

  const count = (key) => (summary ? (key ? summary[key] : summary.open + summary.resolved + summary.dismissed) : '')

  return (
    <>
      <h1 className="page-title">Denúncias</h1>
      <div className="row between wrap">
        <div className="tabs">
          {TABS.map(([key, label]) => (
            <button key={key} className={status === key ? 'tab active' : 'tab'} onClick={() => { setStatus(key); setOpenId(null) }}>
              {label} {summary && <span className="count">{count(key)}</span>}
            </button>
          ))}
        </div>
        <Select aria-label="Filtrar por motivo" value={reason} onChange={(e) => setReason(e.target.value)}>
          <option value="">Todos os motivos</option>
          {Object.entries(REASONS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Select>
      </div>

      {error && <p className="error" role="alert">{error}</p>}
      {reports.length === 0 && !error && <p>Nenhuma denúncia nesta lista.</p>}
      {reports.map((r) => (
        <section className="card" key={r.id}>
          <div className="row between">
            <div>
              <b>{r.reported.username}</b> foi denunciado por <b>{r.reporter.username}</b>
              {r.reported_suspended && <span className="tag suspended"> · suspenso</span>}
              <div className="muted">
                {fmt(r.created_at)} · {r.reports_against_user} denúncia(s) contra este usuário
              </div>
            </div>
            <span className={`tag status-${r.status}`}>{STATUS[r.status]}</span>
          </div>
          <div><b>Motivo:</b> {REASONS[r.reason] ?? r.reason}</div>
          {r.details && <div className="quote">{r.details}</div>}
          <div>
            <button className="link" onClick={() => setOpenId(openId === r.id ? null : r.id)}>
              {openId === r.id ? 'ocultar detalhes' : 'ver detalhes e decidir'}
            </button>
          </div>
          {openId === r.id && <Detail reportId={r.id} onChanged={() => setVersion((v) => v + 1)} />}
        </section>
      ))}
    </>
  )
}
