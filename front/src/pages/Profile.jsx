import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, assetUrl } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import Icon from '../components/Icon'

const MAX_PHOTOS = 6
const MIN_AGE = 18

// Data máxima aceita no campo: hoje menos 18 anos (o back valida de novo).
const latestBirthDate = () => {
  const d = new Date()
  d.setFullYear(d.getFullYear() - MIN_AGE)
  return d.toISOString().slice(0, 10)
}

const EMPTY = {
  photos: [],
  birth_date: '',
  gender: '',
  interested_in: '',
  description: '',
  profession: '',
  university: '',
  city: '',
  state: '',
  country: '',
}

export default function Profile() {
  const { user, refreshUser, logoutAll } = useAuth()
  const navigate = useNavigate()
  const required = user.role === 'user' && !user.profile_completed
  const [f, setF] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api.myProfile()
      .then((p) => { if (p) setF({ ...EMPTY, ...p, birth_date: p.birth_date ?? '' }) })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const set = (k) => (e) => { setSaved(false); setF({ ...f, [k]: e.target.value }) }

  const addPhotos = async (files) => {
    setError('')
    setUploading(true)
    try {
      const urls = []
      for (const file of [...files].slice(0, MAX_PHOTOS - f.photos.length)) {
        urls.push((await api.uploadPhoto(file)).url)
      }
      setSaved(false)
      setF((cur) => ({ ...cur, photos: [...cur.photos, ...urls] }))
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const removePhoto = (url) => setF({ ...f, photos: f.photos.filter((p) => p !== url) })
  const makeMain = (url) => setF({ ...f, photos: [url, ...f.photos.filter((p) => p !== url)] })

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (f.photos.length === 0) {
      setError('Adicione pelo menos uma foto')
      return
    }
    try {
      await api.saveProfile(f)
      await refreshUser()
      if (required) navigate('/', { replace: true })
      else setSaved(true)
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <p className="center">Carregando…</p>

  const signOutEverywhere = async () => {
    if (!confirm('Sair de todos os dispositivos? Você precisará entrar de novo em cada um.')) return
    try {
      await logoutAll()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <>
    <form onSubmit={submit}>
      <h1 className="page-title">Meu perfil</h1>
      {required && <p className="notice" role="status">Quase lá! Complete seu perfil para começar a ver pessoas.</p>}

      <section className="card">
        <h2>Fotos <span className="muted">({f.photos.length}/{MAX_PHOTOS})</span></h2>
        <p className="muted">A primeira foto é a principal. Toque em “principal” para trocar.</p>
        <div className="photo-grid">
          {f.photos.map((url, i) => (
            <div className="photo-item" key={url}>
              <img src={assetUrl(url)} alt={`Foto ${i + 1}`} />
              {i === 0 && <span className="badge">principal</span>}
              <div className="photo-actions">
                {i > 0 && <button type="button" className="link" onClick={() => makeMain(url)}>principal</button>}
                <button type="button" className="link danger" onClick={() => removePhoto(url)}>remover</button>
              </div>
            </div>
          ))}
          {f.photos.length < MAX_PHOTOS && (
            <label className="photo-add">
              <Icon name="plus" size={28} />
              <span>{uploading ? 'Enviando…' : 'Adicionar foto'}</span>
              <input
                type="file"
                multiple
                accept="image/png,image/jpeg,image/gif,image/webp"
                disabled={uploading}
                onChange={(e) => { addPhotos(e.target.files); e.target.value = '' }}
              />
            </label>
          )}
        </div>
      </section>

      <section className="card">
        <h2>Sobre você</h2>
        <label>Data de nascimento
          <input type="date" value={f.birth_date} onChange={set('birth_date')} max={latestBirthDate()} required />
          <small className="muted">Só maiores de 18 anos podem usar o app. Os outros usuários veem apenas a sua idade.</small>
        </label>
        <div className="row">
          <label>Eu sou
            <select value={f.gender} onChange={set('gender')} required>
              <option value="" disabled>Selecione</option>
              <option value="male">Masculino</option>
              <option value="female">Feminino</option>
            </select>
          </label>
          <label>Quero ver
            <select value={f.interested_in} onChange={set('interested_in')} required>
              <option value="" disabled>Selecione</option>
              <option value="men">Homens</option>
              <option value="women">Mulheres</option>
              <option value="both">Ambos</option>
            </select>
          </label>
        </div>
        <label>Descrição
          <textarea value={f.description} onChange={set('description')} maxLength={500} rows={4} required
            placeholder="Fale um pouco sobre você" />
        </label>
        <div className="row">
          <label>Profissão<input value={f.profession} onChange={set('profession')} maxLength={100} /></label>
          <label>Universidade<input value={f.university} onChange={set('university')} maxLength={100} /></label>
        </div>
        <div className="row">
          <label>Cidade<input value={f.city} onChange={set('city')} maxLength={100} required /></label>
          <label>Estado<input value={f.state} onChange={set('state')} maxLength={100} required /></label>
          <label>País<input value={f.country} onChange={set('country')} maxLength={100} required /></label>
        </div>
      </section>

      {error && <p className="error" role="alert">{error}</p>}
      <div className="sticky-actions">
        <span className="grow">{uploading ? 'Enviando fotos…' : ''}</span>
        {saved && <span className="ok" role="status">Salvo!</span>}
        <button className="big" disabled={uploading}>Salvar perfil</button>
      </div>
    </form>

    <section className="card">
      <h2>Segurança</h2>
      <p className="muted">
        Use esta opção se perdeu um aparelho ou acha que alguém acessou a sua conta.
      </p>
      <div>
        <button type="button" className="secondary" onClick={signOutEverywhere}>
          Sair de todos os dispositivos
        </button>
      </div>
    </section>
    </>
  )
}
