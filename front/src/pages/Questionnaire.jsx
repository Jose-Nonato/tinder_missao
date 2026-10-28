import { Radio } from '../components/form/Controls'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, assetUrl } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import Icon from '../components/Icon'
import { NO_OPINION } from '../constants'
import { firstPending } from './questionProgress'

export default function Questionnaire() {
  const { user, refreshUser, logout } = useAuth()
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
  const [completedTopic, setCompletedTopic] = useState('')
  const queue = useRef(Promise.resolve())
  const revision = useRef(0)
  const dirty = useRef(false)

  useEffect(() => {
    Promise.all([api.activeQuestions(), api.myAnswers()])
      .then(([qs, mine]) => {
        setQuestions(qs)
        const answers = Object.fromEntries(mine.answers.map((a) => [a.questionId, a.optionId]))
        setChosen(answers)
        setStep(firstPending(qs, answers))
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { questionRef.current?.focus({ preventScroll: true }) }, [step])

  useEffect(() => {
    const warn = e => { if (dirty.current) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [])

  const persist = (next) => {
    const current = ++revision.current
    dirty.current = true
    setSaved(false)
    setSaving(true)
    setError('')
    const answers = questions.filter(q => next[q.code]).map(q => ({ questionId: q.code, optionId: next[q.code] }))
    // Serializa snapshots para uma resposta antiga nunca sobrescrever a mais recente.
    const request = queue.current.then(() => api.saveAnswers(answers))
    queue.current = request.catch(() => {})
    return request.then(() => {
      if (current === revision.current) { dirty.current = false; setSaved(true) }
      return true
    }).catch(err => {
      if (current === revision.current) setError(`Não foi possível salvar. ${err.message} Tente novamente antes de sair.`)
      return false
    }).finally(() => { if (current === revision.current) setSaving(false) })
  }

  useEffect(() => {
    if (!completedTopic) return
    const timer = setTimeout(() => setCompletedTopic(''), 4000)
    return () => clearTimeout(timer)
  }, [completedTopic])

  const pick = (code, optionId) => {
    const next = { ...chosen, [code]: optionId }
    setChosen(next)
    const topic = questions.find(q => q.code === code)?.topic
    const siblings = questions.filter(q => q.topic === topic)
    const newlyComplete = siblings.some(q => !chosen[q.code]) && siblings.every(q => next[q.code])
    persist(next).then(ok => { if (ok && newlyComplete) setCompletedTopic(topic) })
  }

  const save = async (leave = false) => {
    if (!await persist(chosen)) return
    try { await refreshUser() } catch (err) { setError(err.message); return }
    if (leave) {
      try { await logout(); navigate('/login', { replace: true }) } catch (err) { setError(err.message) }
    }
    else if (questions.every(q => chosen[q.code])) navigate('/', { replace: true })
  }

  if (loading) return <div className="skeleton question-skeleton" aria-label="Carregando perguntas" aria-busy="true" />
  const answered = questions.filter((q) => chosen[q.code]).length

  return (
    <>
      <h1 className="page-title">Questionário</h1>
      {required && (
        <p className="notice">Antes de continuar, responda todas as perguntas. Cada resposta é salva automaticamente. Você pode parar e retomar depois.</p>
      )}
      {questions.length === 0 && <p>Nenhuma pergunta disponível no momento.</p>}
      {questions.length > 0 && (
        <div className="q-progress">
          <div className="q-progress-text">
            <span>{answered} de {questions.length} respondidas · Faltam {questions.length - answered}</span>
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
                <Radio
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
              <Radio
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
      <div className="topic-confirmation" role="status">{completedTopic && <span key={completedTopic}><Icon name="check" size={18} /> {completedTopic} concluída</span>}</div>
      {error && <p className="error" role="alert">{error}</p>}
      {questions.length > 0 && (
        <div className="sticky-actions q-save">
          <span className="grow">
            {required && answered < questions.length
              ? `Faltam ${questions.length - answered} para continuar`
              : 'Pronto para salvar'}
          </span>
          <span className="ok" role="status">{saving ? 'Salvando…' : saved ? 'Salvo' : ''}</span>
          <button className="secondary" onClick={() => save(true)} disabled={saving || answered === 0}>Salvar e continuar depois</button>
          <button onClick={() => save()} disabled={saving || answered === 0}>
            {answered === questions.length ? 'Concluir' : 'Salvar agora'}
          </button>
        </div>
      )}
    </>
  )
}
