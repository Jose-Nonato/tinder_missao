import { useEffect, useRef, useState } from 'react'
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
  const questionRef = useRef(null)
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([api.activeQuestions(), api.myAnswers()])
      .then(([qs, mine]) => {
        setQuestions(qs)
        setChosen(Object.fromEntries(mine.answers.map((a) => [a.questionId, a.optionId])))
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { questionRef.current?.focus({ preventScroll: true }) }, [step])

  const pick = (code, optionId) => {
    setSaved(false)
    setChosen({ ...chosen, [code]: optionId })
  }

  const save = async () => {
    setError('')
    setSaving(true)
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
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="skeleton question-skeleton" aria-label="Carregando perguntas" aria-busy="true" />
  const answered = questions.filter((q) => chosen[q.code]).length

  return (
    <>
      <h1 className="page-title">Questionário</h1>
      {required && (
        <p className="notice">Antes de continuar, responda todas as perguntas. Suas escolhas só são enviadas ao salvar.</p>
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
      {questions.slice(step, step + 1).map((q) => (
        <section className="card q-card" key={q.code}>
          <div className="q-step-meta"><span className="tag">{q.topic}</span><span>{step + 1} / {questions.length}</span></div>
          <h2 className="q-question" ref={questionRef} tabIndex={-1}>{q.text}</h2>
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
      {questions.length > 0 && <div className="q-navigation">
        <button className="secondary" disabled={step === 0} onClick={() => setStep(step - 1)}>Anterior</button>
        <span className="muted" aria-live="polite">Pergunta {step + 1} de {questions.length}</span>
        <button disabled={step === questions.length - 1} onClick={() => setStep(step + 1)}>Próxima</button>
      </div>}
      {error && <p className="error" role="alert">{error}</p>}
      {questions.length > 0 && (
        <div className="sticky-actions q-save">
          <span className="grow">
            {required && answered < questions.length
              ? `Faltam ${questions.length - answered} para continuar`
              : 'Pronto para salvar'}
          </span>
          {saved && <span className="ok" role="status">Salvo!</span>}
          <button className="big" onClick={save} disabled={saving || (required ? answered < questions.length : answered === 0)}>
            {saving ? 'Salvando…' : 'Salvar respostas'}
          </button>
        </div>
      )}
    </>
  )
}
