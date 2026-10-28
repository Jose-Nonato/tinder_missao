import { useState } from 'react'
import { WEIGHTS } from '../constants'
import Icon from './Icon'
import AffinityScore from './AffinityScore'
import { topicAgreement } from './topicAgreement'

// Explica de onde vem a porcentagem: quais perguntas entraram, se concordam ou divergem e
// quanto cada uma pesa. Mostra só "concordam/divergem", nunca a resposta da outra pessoa.
// Cor nunca é o único sinal: cada item tem ícone (✓ / ✕) e título.
export default function CompatibilityDetails({ profile, alwaysOpen = false }) {
  const [open, setOpen] = useState(false)
  const expanded = alwaysOpen || open

  if (profile.common_questions === 0) {
    return <small className="muted">Sem perguntas respondidas em comum para comparar.</small>
  }

  const agree = profile.breakdown.filter((i) => i.agree)
  const differ = profile.breakdown.filter((i) => !i.agree)

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
          <div className="compat-summary"><AffinityScore value={profile.compatibility} /><div><h3>Afinidade por tópico</h3><p className="muted">Concordâncias entre as perguntas comparadas, sem ponderação. O percentual geral considera os pesos.</p></div></div>
          <div className="topic-bars">{topicAgreement(profile.breakdown).map(t => <div key={t.topic}>
            <div className="row between"><b>{t.topic}</b><small>{t.agreements} de {t.total} em acordo</small></div>
            <div className="meter" role="img" aria-label={`${t.topic}: ${t.agreements} concordâncias e ${t.total - t.agreements} divergências`}><div style={{ width: `${t.percent}%` }} /></div>
          </div>)}</div>
          <p className="muted">
            As perguntas mais importantes pesam mais no resultado. Perguntas em que um dos dois não tem
            opinião ficam de fora.
          </p>
          {[['Concordam', agree, 'ok'], ['Divergem', differ, 'no']].map(([title, items, kind]) =>
            items.length > 0 && (
              <div key={title}>
                <h4>{title} ({items.length})</h4>
                <ul>
                  {items.map((i) => (
                    <li key={i.question_id} className={kind}>
                      <Icon name={kind === 'ok' ? 'check' : 'x'} size={18} />
                      <div>
                        <span className="tag">{i.topic}</span> {i.text}
                        <span className="weight" title="Importância da pergunta">
                          peso {i.weight} · {WEIGHTS[i.weight]}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
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
