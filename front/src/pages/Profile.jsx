import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, assetUrl } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import Icon from '../components/Icon'
import ProfileSheet from '../components/ProfileSheet'
import { Input, Select, Textarea } from '../components/Field'

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
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const gallery = useRef(null)
  const positions = useRef(new Map())

  useLayoutEffect(() => {
    const previous = positions.current
    positions.current = new Map()
    gallery.current?.querySelectorAll('[data-photo]').forEach(el => {
      const rect = el.getBoundingClientRect()
      positions.current.set(el.dataset.photo, rect)
      const from = previous.get(el.dataset.photo)
      if (from && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        el.animate([{ transform: `translate(${from.left - rect.left}px, ${from.top - rect.top}px) scale(${from.width / rect.width}, ${from.height / rect.height})` }, { transform: 'none' }], { duration: 320, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' })
      }
    })
  }, [f.photos])

  useEffect(() => {
    api.myProfile()
      .then((p) => { if (p) setF({ ...EMPTY, ...p, birth_date: p.birth_date ?? '' }) })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const set = (k) => (e) => { setSaved(false); setF({ ...f, [k]: e.target.value }) }

  const addPhotos = async (files) => {
    setPhotoError('')
    setUploading(true)
    try {
      const urls = []
      for (const file of [...files].slice(0, MAX_PHOTOS - f.photos.length)) {
        urls.push((await api.uploadPhoto(file)).url)
      }
      setSaved(false)
      setF((cur) => ({ ...cur, photos: [...cur.photos, ...urls] }))
    } catch (err) {
      setPhotoError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const updatePhotos = (photos) => { setSaved(false); setPhotoError(''); setF((cur) => ({ ...cur, photos })) }
  const removePhoto = (index) => updatePhotos(f.photos.filter((_, i) => i !== index))
  const movePhoto = (index, to) => {
    const photos = [...f.photos]
    photos.splice(to, 0, photos.splice(index, 1)[0])
    updatePhotos(photos)
  }

  const showPreview = async () => {
    setPreviewLoading(true)
    try {
      const profile = await api.myProfile()
      if (!profile) { setError('Salve seu perfil antes de abrir a prévia.'); return }
      const birth = profile.birth_date && new Date(`${profile.birth_date}T00:00:00`)
      const today = new Date()
      const age = birth ? today.getFullYear() - birth.getFullYear() - Number(today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) : null
      setPreview({ ...profile, username: user.username, age })
    } catch (err) { setError(err.message) }
    finally { setPreviewLoading(false) }
  }

  const submit = async (e) => {
    e.preventDefault()
    if (saving || uploading) return
    setError('')
    if (f.photos.length === 0) {
      setPhotoError('Adicione pelo menos uma foto para salvar seu perfil.')
      document.getElementById('profile-photos')?.focus()
      return
    }
    setSaving(true)
    setSaved(false)
    try {
      await api.saveProfile(f)
      await refreshUser()
      if (required) navigate('/', { replace: true })
      else setSaved(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
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
    <form className="profile-form profile-editor" onSubmit={submit} aria-busy={saving}>
      <header className="profile-heading"><div><h1 className="page-title">Meu perfil</h1><p className="muted">Seu jeito de se apresentar. Seu jeito de se conectar.</p></div><span className="tag">{user.username}</span></header>
      <div className="profile-preview-action"><button className="secondary" type="button" onClick={showPreview} disabled={previewLoading}>{previewLoading ? 'Carregando prévia…' : 'Como meu perfil aparece'}</button><small className="muted">A prévia mostra sua última versão salva.</small></div>
      {preview && <ProfileSheet profile={preview} preview onClose={() => setPreview(null)} />}
      {required && <p className="notice" role="status">Quase lá! Complete seu perfil para começar a ver pessoas.</p>}
      <fieldset className="profile-fields" disabled={saving}>
        <legend className="sr-only">Editar meu perfil</legend>
        <div className="profile-columns">
          <div className="profile-column">
            <section className="card profile-section" aria-labelledby="photos-title">
              <div className="row between"><h2 id="photos-title">Suas fotos</h2><span className="muted">{f.photos.length} / {MAX_PHOTOS}</span></div>
              <p className="muted">A primeira é sua foto principal. Use as setas para organizar a ordem.</p>
              <div className="profile-gallery" ref={gallery}>
                {f.photos.map((url, i) => <div className="profile-photo" key={url} data-photo={url}>
                  <div className="profile-photo-image"><img src={assetUrl(url)} alt={`Foto ${i + 1}`} /><span className="badge">{i === 0 ? 'Principal' : i + 1}</span>
                  <button type="button" className="photo-remove icon-btn" disabled={uploading} aria-label={`Remover foto ${i + 1}`} onClick={() => removePhoto(i)}><Icon name="x" size={18} /></button></div>
                  <div className="photo-order"><button type="button" className="secondary" disabled={i === 0 || uploading} aria-label={`Mover foto ${i + 1} para antes`} onClick={() => movePhoto(i, i - 1)}><Icon name="chevron-left" size={18} /></button><button type="button" className="secondary" disabled={i === f.photos.length - 1 || uploading} aria-label={`Mover foto ${i + 1} para depois`} onClick={() => movePhoto(i, i + 1)}><Icon name="chevron-right" size={18} /></button></div>
                </div>)}
                {f.photos.length < MAX_PHOTOS && <label className="photo-add profile-upload">
                  <Icon name="plus" size={28} /><span>{uploading ? 'Enviando…' : 'Adicionar foto'}</span><small>Até {MAX_PHOTOS} fotos</small>
                  <input id="profile-photos" type="file" multiple accept="image/png,image/jpeg,image/gif,image/webp" disabled={uploading} aria-describedby={photoError ? 'photo-error' : undefined} onChange={(e) => { addPhotos(e.target.files); e.target.value = '' }} />
                </label>}
              </div>
              {photoError && <p className="error" id="photo-error" role="alert">{photoError}</p>}
            </section>
            <section className="card profile-section" aria-labelledby="about-title">
              <h2 id="about-title">Sobre você</h2>
              <Textarea label="Descrição" value={f.description} onChange={set('description')} maxLength={500} rows={5} required placeholder="Fale um pouco sobre você" helper="Conte o que você gosta de fazer e o que faz uma conversa valer a pena." />
              <span className="bio-count" aria-label={`${f.description.length} de 500 caracteres`}>{f.description.length} / 500</span>
              <Input label="Profissão" value={f.profession} onChange={set('profession')} maxLength={100} />
              <Input label="Universidade" value={f.university} onChange={set('university')} maxLength={100} />
            </section>
          </div>
          <div className="profile-column">
            <section className="card profile-section" aria-labelledby="data-title">
              <h2 id="data-title">Seus dados</h2>
              <Input label="Data de nascimento" type="date" value={f.birth_date} onChange={set('birth_date')} max={latestBirthDate()} required helper="Você precisa ter 18 anos. No perfil, aparece apenas sua idade." />
              <Select label="Eu sou" value={f.gender} onChange={set('gender')} required><option value="" disabled>Selecione</option><option value="male">Masculino</option><option value="female">Feminino</option></Select>
              <Input label="Cidade" value={f.city} onChange={set('city')} maxLength={100} required autoComplete="address-level2" />
              <div className="field-pair"><Input label="Estado" value={f.state} onChange={set('state')} maxLength={100} required autoComplete="address-level1" /><Input label="País" value={f.country} onChange={set('country')} maxLength={100} required autoComplete="country-name" /></div>
            </section>
            <section className="card profile-section" aria-labelledby="preferences-title">
              <h2 id="preferences-title">Suas preferências</h2><p className="muted">Escolha quem você quer encontrar no Descobrir.</p>
              <Select label="Quero ver" value={f.interested_in} onChange={set('interested_in')} required><option value="" disabled>Selecione</option><option value="men">Homens</option><option value="women">Mulheres</option><option value="both">Ambos</option></Select>
            </section>
            <section className="card profile-section profile-account" aria-labelledby="account-title">
              <h2 id="account-title">Sua conta</h2><p className="muted">Use esta opção se perdeu um aparelho ou acha que alguém acessou a sua conta.</p><button type="button" className="secondary" onClick={signOutEverywhere}>Sair de todos os dispositivos</button>
            </section>
          </div>
        </div>
      </fieldset>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="sticky-actions profile-save">
        <span className={`grow${saved ? ' saved' : ''}`} role="status">{saving ? 'Salvando alterações…' : uploading ? 'Enviando fotos…' : saved ? 'Perfil salvo!' : 'Tudo pronto? Salve seu perfil.'}</span>
        <button className="big" disabled={uploading || saving}>{saving ? 'Salvando…' : saved ? 'Salvo' : 'Salvar perfil'}<Icon name={saved ? 'check' : 'arrow-right'} size={20} /></button>
      </div>
    </form>
  )
}
