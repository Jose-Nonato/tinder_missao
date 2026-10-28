import Select from '../../components/form/Select'
import { TextInput, Switch, FileUpload } from '../../components/form/Controls'
import { useEffect, useState } from 'react'
import { api, assetUrl } from '../../api/client'
import Icon from '../../components/Icon'
import { WEIGHTS } from '../../constants'

const EMPTY = {
  topic: '',
  weight: 1,
  text: '',
  imageUrl: '',
  imageAlt: '',
  options: [{ id: 'A', text: '' }, { id: 'B', text: '' }],
  active: true,
}

const toForm = (q) => ({
  code: q.code,
  topic: q.topic,
  weight: q.weight ?? 1,
  text: q.text,
  imageUrl: q.image?.url ?? '',
  imageAlt: q.image?.altText ?? '',
  options: q.options.map((o) => ({ ...o })),
  active: q.active,
})

const toPayload = (f) => ({
  topic: f.topic,
  weight: Number(f.weight),
  text: f.text,
  image: f.imageUrl ? { url: f.imageUrl, altText: f.imageAlt } : null,
  options: f.options.map((o) => ({ id: o.id, text: o.text, image: o.image ?? null })),
  active: f.active,
})

function QuestionForm({ initial, editing, onSave, onCancel }) {
  const [f, setF] = useState(initial)
  const [error, setError] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const setOption = (i, text) =>
    setF({ ...f, options: f.options.map((o, j) => (j === i ? { ...o, text } : o)) })
  const setOptionImage = (i, image) =>
    setF({ ...f, options: f.options.map((o, j) => (j === i ? { ...o, image } : o)) })

  const uploadOptionImage = async (i, file) => {
    if (!file) return
    setError('')
    try {
      const { url } = await api.uploadImage(file)
      setOptionImage(i, { url, altText: f.options[i].text })
    } catch (err) {
      setError(err.message)
    }
  }

  const addOption = () => {
    const id = String.fromCharCode(65 + f.options.length) // A, B, C…
    setF({ ...f, options: [...f.options, { id, text: '' }] })
  }
  const removeOption = (i) => setF({ ...f, options: f.options.filter((_, j) => j !== i) })

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await onSave(f)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <h2>{editing ? 'Editar pergunta' : 'Nova pergunta'}</h2>
      <div className="row">
        <label>Tópico<TextInput value={f.topic} onChange={set('topic')} required /></label>
        <Select label="Importância na compatibilidade" value={f.weight} onChange={set('weight')}>
            {Object.entries(WEIGHTS).map(([value, label]) => (
              <option key={value} value={value}>{value} · {label}</option>
            ))}
          </Select>
      </div>
      <label>Pergunta<TextInput value={f.text} onChange={set('text')} required /></label>
      <div className="row">
        <label>URL da imagem<TextInput value={f.imageUrl} onChange={set('imageUrl')} /></label>
        <label>Texto alternativo<TextInput value={f.imageAlt} onChange={set('imageAlt')} /></label>
      </div>
      <fieldset>
        <legend>Opções</legend>
        {f.options.map((o, i) => (
          <div className="opt-edit" key={o.id}>
            <b aria-hidden="true">{o.id}</b>
            <TextInput type="text" aria-label={`Texto da opção ${o.id}`} value={o.text} onChange={(e) => setOption(i, e.target.value)} required />
            {o.image ? (
              <>
                <img className="thumb" src={assetUrl(o.image.url)} alt={o.image.altText} />
                <button type="button" className="link danger" onClick={() => setOptionImage(i, null)}>Tirar imagem</button>
              </>
            ) : (
              <FileUpload aria-label={`Imagem da opção ${o.id}`} accept="image/png,image/jpeg,image/gif,image/webp"
                onChange={(e) => { uploadOptionImage(i, e.target.files[0]); e.target.value = '' }} />
            )}
            {/* só remove a última, para manter os ids A, B, C… sequenciais */}
            {i === f.options.length - 1 && f.options.length > 2 && (
              <button type="button" className="link" onClick={() => removeOption(i)}>Remover</button>
            )}
          </div>
        ))}
        <button type="button" className="secondary" onClick={addOption}><Icon name="plus" size={20} /> Opção</button>
      </fieldset>
      <label className="check">
        <Switch checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />
        Ativa
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="row">
        <button>Salvar</button>
        <button type="button" className="secondary" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  )
}

export default function Questions() {
  const [list, setList] = useState([])
  const [form, setForm] = useState(null) // { initial, editing } | null
  const [error, setError] = useState('')

  const load = () => api.listQuestions().then(setList).catch((e) => setError(e.message))
  useEffect(() => { load() }, [])

  const save = async (f) => {
    if (form.editing) await api.updateQuestion(f.code, toPayload(f))
    else await api.createQuestion(toPayload(f))
    setForm(null)
    load()
  }

  const toggle = async (q) => {
    try {
      await api.updateQuestion(q.code, { active: !q.active })
      load()
    } catch (e) { setError(e.message) }
  }

  const remove = async (q) => {
    if (!confirm(`Excluir "${q.text}"? As respostas já dadas pelos usuários permanecem.`)) return
    try {
      await api.deleteQuestion(q.code)
      load()
    } catch (e) { setError(e.message) }
  }

  return (
    <>
      <div className="row between">
        <h1 className="page-title">Perguntas</h1>
        {!form && (
          <button onClick={() => setForm({ initial: EMPTY, editing: false })}>
            <Icon name="plus" size={20} /> Nova pergunta
          </button>
        )}
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {form && (
        <QuestionForm
          initial={form.initial}
          editing={form.editing}
          onSave={save}
          onCancel={() => setForm(null)}
        />
      )}
      <div className="table-wrap">
        <table className="table-cards">
          <caption className="sr-only">Perguntas cadastradas</caption>
          <thead>
            <tr><th>ID</th><th>Tópico</th><th>Pergunta</th><th>Peso</th><th>Status</th><th><span className="sr-only">Ações</span></th></tr>
          </thead>
          <tbody>
            {list.map((q) => (
              <tr key={q.code} className={q.active ? '' : 'off'}>
                <td data-label="ID" className="mono" title={q.code}>…{q.code.slice(-6)}</td>
                <td data-label="Tópico">{q.topic}</td>
                <td data-label="Pergunta">{q.text}</td>
                <td data-label="Peso" title={WEIGHTS[q.weight ?? 1]}>{q.weight ?? 1}</td>
                <td data-label="Status">{q.active ? 'ativa' : 'inativa'}</td>
                <td className="actions">
                  <button className="link" onClick={() => setForm({ initial: toForm(q), editing: true })}>Editar</button>
                  <button className="link" onClick={() => toggle(q)}>{q.active ? 'Desativar' : 'Ativar'}</button>
                  <button className="link danger" onClick={() => remove(q)}>Excluir</button>
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan="6">Nenhuma pergunta cadastrada.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}
