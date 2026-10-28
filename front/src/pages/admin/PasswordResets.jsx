import { useEffect, useState } from 'react'
import { api } from '../../api/client'

const STATUS = { pending: 'pendente', issued: 'link gerado', completed: 'concluído', dismissed: 'descartado' }
const TABS = [
  ['pending', 'Pendentes'],
  ['issued', 'Link gerado'],
  ['completed', 'Concluídos'],
  ['dismissed', 'Descartados'],
]
const fmt = (iso) => new Date(iso).toLocaleString('pt-BR')

// O link só existe aqui, na tela, no momento em que é gerado: o servidor guarda apenas o hash.
function IssuedLink({ link }) {
  const [copied, setCopied] = useState(false)
  const url = `${location.origin}/reset-password?token=${link.token}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      // sem permissão de área de transferência: o campo abaixo continua selecionável
    }
  }

  return (
    <div className="issued-link">
      <b>Link gerado — entregue-o somente à pessoa, depois de confirmar quem ela é.</b>
      <div className="row">
        <input readOnly value={url} onFocus={(e) => e.target.select()} />
        <button type="button" onClick={copy}>{copied ? 'Copiado!' : 'Copiar'}</button>
      </div>
      <small className="muted">
        Válido até {fmt(link.expires_at)} e de uso único. Ele não aparece de novo: se perder, gere outro
        (o anterior deixa de valer).
      </small>
    </div>
  )
}

export default function PasswordResets() {
  const [status, setStatus] = useState('pending')
  const [list, setList] = useState([])
  const [summary, setSummary] = useState(null)
  const [links, setLinks] = useState({}) // { [id]: { token, expires_at } }
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)

  useEffect(() => {
    Promise.all([api.passwordResets(status), api.passwordResetSummary()])
      .then(([items, counts]) => { setList(items); setSummary(counts); setError('') })
      .catch((e) => setError(e.message))
  }, [status, version])

  const run = async (fn) => {
    setError('')
    try {
      await fn()
      setVersion((v) => v + 1)
    } catch (e) { setError(e.message) }
  }

  const issue = (r) => run(async () => {
    const link = await api.issueResetToken(r.id)
    setLinks((cur) => ({ ...cur, [r.id]: link }))
    // o pedido passa a "link gerado": vai para essa aba, senão o cartão (e o link) sumiriam da tela
    setStatus('issued')
  })

  const dismiss = (r) => {
    if (!confirm(`Descartar o pedido de ${r.user.username}? Qualquer link já gerado deixa de valer.`)) return
    run(async () => {
      await api.dismissReset(r.id)
      setLinks((cur) => ({ ...cur, [r.id]: undefined }))
    })
  }

  return (
    <>
      <h1 className="page-title">Redefinição de senha</h1>
      <p className="notice">
        Confirme a identidade da pessoa pelo contato informado <b>antes</b> de gerar e entregar o link:
        com ele, qualquer um define a senha da conta.
      </p>
      <div className="tabs">
        {TABS.map(([key, label]) => (
          <button key={key} className={status === key ? 'tab active' : 'tab'} onClick={() => setStatus(key)}>
            {label} {summary && <span className="count">{summary[key]}</span>}
          </button>
        ))}
      </div>

      {error && <p className="error" role="alert">{error}</p>}
      {list.length === 0 && !error && <p>Nenhum pedido nesta lista.</p>}
      {list.map((r) => (
        <section className="card" key={r.id}>
          <div className="row between">
            <div>
              <b>{r.user.username}</b> <span className="muted">· {r.email}</span>
              <div className="muted">
                Pedido em {fmt(r.requested_at)}
                {r.account_created_at && ` · conta criada em ${new Date(r.account_created_at).toLocaleDateString('pt-BR')}`}
              </div>
            </div>
            <span className="tag">{STATUS[r.status]}</span>
          </div>
          <div><b>Contato informado:</b> {r.contact || <span className="muted">(não informado)</span>}</div>
          {r.issued_by && (
            <div className="muted">Link gerado por {r.issued_by.username} em {fmt(r.issued_at)}</div>
          )}
          {links[r.id] && <IssuedLink link={links[r.id]} />}
          {(r.status === 'pending' || r.status === 'issued') && (
            <div className="row">
              <button onClick={() => issue(r)}>{r.status === 'issued' ? 'Gerar novo link' : 'Gerar link'}</button>
              <button className="secondary" onClick={() => dismiss(r)}>Descartar</button>
            </div>
          )}
        </section>
      ))}
    </>
  )
}
