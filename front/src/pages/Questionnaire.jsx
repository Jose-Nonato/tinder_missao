import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, assetUrl } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import Icon from '../components/Icon'
import { NO_OPINION } from '../constants'

export default function Questionnaire() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  // primeiro acesso: precisa responder tudo para liberar o app
  const required = user.role === 'user' && !user.questionnaire_completed
  const [questions, setQuestions] = useState([])
  const [chosen, setChosen] = useState({}) // { [code]: optionId }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    Promise.all([api.activeQuestions(), api.myAnswers()])
      .then(([qs, mine]) => {
        setQuestions(qs)
        setChosen(Object.fromEntries(mine.answers.map((a) => [a.questionId, a.optionId])))
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const pick = (code, optionId) => {
    setSaved(false)
    setChosen({ ...chosen, [code]: optionId })
  }

  const save = async () => {
    setError('')
    try {
      // só envia respostas de perguntas ainda ativas
      const answers = questions
        .filter((q) => chosen[q.code])
        .map((q) => ({ questionId: q.code, optionId: chosen[q.code] }))
      await api.saveAnswers(answers)
      await refreshUser()
      if (required) navigate('/', { replace: true })
      else setSaved(true)
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <p className="center loading">Carregando…</p>
  const answered = questions.filter((q) => chosen[q.code]).length

  return (
    <>
      <h1 className="page-title">Questionário</h1>
      {required && (
        <p className="notice">Antes de continuar, responda todas as perguntas abaixo.</p>
      )}
      {questions.length === 0 && <p>Nenhuma pergunta disponível no momento.</p>}
      {questions.length > 0 && (
        <div className="q-progress">
          <div className="q-progress-text">
            <span>{answered} de {questions.length} respondidas</span>
            {answered === questions.length && <span className="ok"><Icon name="check" size={18} /> Completo</span>}
          </div>
          <div className="meter" role="progressbar" aria-label="Progresso do questionário" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={answered}>
            <div style={{ width: `${(answered / questions.length) * 100}%` }} />
          </div>
        </div>
      )}
      {questions.map((q) => (
        <section className="card" key={q.code}>
          <span className="tag">{q.topic}</span>
          <h2 className="q-question">{q.text}</h2>
          {q.image && <img className="qimg" src={assetUrl(q.image.url)} alt={q.image.altText} />}
          <div className="options" role="radiogroup" aria-label={q.text}>
            {q.options.map((o) => (
              <label key={o.id} className={chosen[q.code] === o.id ? 'opt selected' : 'opt'}>
                <input
                  type="radio"
                  name={q.code}
                  checked={chosen[q.code] === o.id}
                  onChange={() => pick(q.code, o.id)}
                />
                {o.image && (
                  <img className="oimg" src={assetUrl(o.image.url)} alt={o.image.altText || o.text} />
                )}
                <span>{o.text}</span>
              </label>
            ))}
            <label className={chosen[q.code] === NO_OPINION ? 'opt none selected' : 'opt none'}>
              <input
                type="radio"
                name={q.code}
                checked={chosen[q.code] === NO_OPINION}
                onChange={() => pick(q.code, NO_OPINION)}
              />
              <span>Não tenho opinião <small className="muted">(não entra na compatibilidade)</small></span>
            </label>
          </div>
        </section>
      ))}
      {error && <p className="error" role="alert">{error}</p>}
      {questions.length > 0 && (
        <div className="sticky-actions">
          <span className="grow">
            {required && answered < questions.length
              ? `Faltam ${questions.length - answered} para continuar`
              : 'Pronto para salvar'}
          </span>
          {saved && <span className="ok" role="status">Salvo!</span>}
          <button className="big" onClick={save} disabled={required ? answered < questions.length : answered === 0}>
            Salvar respostas
          </button>
        </div>
      )}
    </>
  )
}
