import { useState } from 'react'
import { topicAgreement } from './topicAgreement'

export default function CompatibilityDetails({ profile, alwaysOpen = false }) {
  const [open, setOpen] = useState(false)
  const expanded = alwaysOpen || open

  if (profile.common_questions === 0) {
    return <small className="muted">Sem perguntas respondidas em comum para comparar.</small>
  }

  return (
    <div className="compat">
      <small className="muted">
        Concordam em {profile.agreements} de {profile.common_questions} perguntas
      </small>
      {!alwaysOpen && (
        <button type="button" className="link" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? 'Ocultar detalhes' : `Por que ${profile.compatibility}%?`}
        </button>
      )}
      {expanded && (
        <div className="compat-details">
          <div className="compat-summary"><div><h3>Afinidade por tópico</h3><p className="muted">Concordâncias entre as perguntas comparadas, sem ponderação. O percentual geral considera os pesos.</p></div></div>
          <div className="topic-bars">{topicAgreement(profile.breakdown).map(t => <div key={t.topic}>
            <div className="row between"><b>{t.topic}</b><small>{t.agreements} de {t.total} em acordo</small></div>
            <div className="meter" role="img" aria-label={`${t.topic}: ${t.agreements} concordâncias e ${t.total - t.agreements} divergências`}><div style={{ width: `${t.percent}%` }} /></div>
          </div>)}</div>
          <p className="muted">
            As perguntas mais importantes pesam mais no resultado. Perguntas em que um dos dois não tem
            opinião ficam de fora.
          </p>
          {profile.ignored_questions > 0 && (
            <p className="muted">
              {profile.ignored_questions} {profile.ignored_questions === 1 ? 'pergunta ficou' : 'perguntas ficaram'} de
              fora (sem resposta ou “não tenho opinião” de um dos dois).
            </p>
          )}
        </div>
      )}
    </div>
  )
}
