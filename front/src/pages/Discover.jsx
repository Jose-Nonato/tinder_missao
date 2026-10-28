import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import Avatar from '../components/Avatar'
import Icon from '../components/Icon'
import { PhotoStack } from '../components/PhotoGallery'
import ProfileSheet from '../components/ProfileSheet'
import Sheet from '../components/Sheet'

const SWIPE_DISTANCE = 110 // px arrastados para valer como curtir/passar
const FLY_MS = 240
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Cartão de perfil que acompanha o dedo. Curtir/passar também funcionam pelos botões e pelas
// setas do teclado: gesto nunca é o único caminho.
function SwipeCard({ profile, leaving, disabled, onSwipe, onInfo }) {
  const [photo, setPhoto] = useState(0)
  const [drag, setDrag] = useState(null) // { x, y } enquanto o dedo está arrastando
  const start = useRef(null)
  const moved = useRef(false)

  const count = profile.photos?.length ?? 0
  const place = [profile.city, profile.state].filter(Boolean).join(', ')
  const work = profile.profession || profile.university

  const flyX = leaving ? (leaving === 'like' ? 1 : -1) * window.innerWidth * 1.2 : 0
  const x = leaving ? flyX : drag?.x ?? 0
  const y = leaving ? -30 : (drag?.y ?? 0) * 0.15
  const likeOpacity = Math.min(1, Math.max(0, x / 90))
  const passOpacity = Math.min(1, Math.max(0, -x / 90))

  const onPointerDown = (e) => {
    if (disabled || e.target.closest('[data-no-drag]')) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    start.current = { x: e.clientX, y: e.clientY, t: performance.now() }
    moved.current = false
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e) => {
    const s = start.current
    if (!s) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    if (!moved.current && Math.hypot(dx, dy) < 8) return // limiar: evita arrastes acidentais
    moved.current = true
    setDrag({ x: dx, y: dy })
  }
  const onPointerUp = (e) => {
    const s = start.current
    start.current = null
    if (!s) return
    const dx = e.clientX - s.x
    if (!moved.current) {
      // toque simples: laterais trocam de foto (como nos stories)
      const rect = e.currentTarget.getBoundingClientRect()
      const rel = (e.clientX - rect.left) / rect.width
      if (rel < 0.4) setPhoto((p) => Math.max(0, p - 1))
      else if (rel > 0.6) setPhoto((p) => Math.min(count - 1, p + 1))
      return
    }
    const velocity = Math.abs(dx) / Math.max(1, performance.now() - s.t)
    setDrag(null)
    if (Math.abs(dx) > SWIPE_DISTANCE || (velocity > 0.6 && Math.abs(dx) > 40)) {
      onSwipe(dx > 0 ? 'like' : 'pass')
    }
  }
  const onPointerCancel = () => {
    start.current = null
    setDrag(null)
  }
  const onKeyDown = (e) => {
    if (disabled) return
    if (e.key === 'ArrowRight') { e.preventDefault(); onSwipe('like') }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); onSwipe('pass') }
    else if (e.key === 'ArrowUp' || e.key === 'i') { e.preventDefault(); onInfo() }
  }

  return (
    <div
      className={`swipe-card${drag ? ' dragging' : ''}`}
      style={{ transform: `translate3d(${x}px, ${y}px, 0) rotate(${x / 18}deg)` }}
      tabIndex={0}
      role="group"
      aria-roledescription="cartão de perfil"
      aria-label={`${profile.username}${profile.age != null ? `, ${profile.age} anos` : ''}. ${profile.compatibility}% compatível. Setas: direita curte, esquerda passa, cima abre detalhes.`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onKeyDown={onKeyDown}
    >
      <PhotoStack photos={profile.photos} index={photo} name={profile.username} fill />
      <span className="stamp like" style={{ opacity: likeOpacity }} aria-hidden="true">Curtir</span>
      <span className="stamp pass" style={{ opacity: passOpacity }} aria-hidden="true">Passar</span>

      {profile.common_questions > 0 && (
        <span className="chip card-compat">
          <Icon name="heart" size={16} filled /> {profile.compatibility}% compatível
        </span>
      )}

      <div className="card-overlay">
        <div className="card-text">
          <h2 className="card-name">
            {profile.username}
            {profile.age != null && <span className="card-age">{profile.age}</span>}
          </h2>
          {place && <p><Icon name="pin" size={16} /> {place}</p>}
          {work && <p><Icon name="briefcase" size={16} /> {work}</p>}
        </div>
        <button
          type="button"
          className="icon-btn card-info"
          data-no-drag
          onClick={onInfo}
          aria-label={`Ver perfil completo de ${profile.username}`}
        >
          <Icon name="info" size={24} />
        </button>
      </div>
    </div>
  )
}

// Para cada motivo de baralho vazio, o que a pessoa pode fazer a respeito.
const EMPTY_ACTIONS = {
  no_answers: { to: '/questionnaire', label: 'Rever o questionário' },
  no_common_questions: { to: '/questionnaire', label: 'Responder mais perguntas' },
  no_preference_match: { to: '/profile', label: 'Ajustar minhas preferências' },
}

function EmptyDeck({ reason, message, onRefresh }) {
  const action = EMPTY_ACTIONS[reason]
  return (
    <div className="empty-state">
      <span className="empty-ico"><Icon name="compass" size={36} /></span>
      <h2>Nenhum perfil por enquanto</h2>
      <p>{message || 'Você viu todos os perfis desta rodada.'}</p>
      <div className="row empty-actions">
        {action && <Link to={action.to} className="cta">{action.label}</Link>}
        <button type="button" className="secondary" onClick={onRefresh}>
          <Icon name="refresh" size={20} /> Buscar novos perfis
        </button>
      </div>
    </div>
  )
}

function MatchDialog({ match, myPhoto, myName, onClose }) {
  return (
    <Sheet title="É um match!" onClose={onClose} size="sm" hideTitle>
      <div className="match-hero">
        <div className="match-photos">
          <Avatar src={myPhoto} name={myName} size="lg" />
          <Avatar src={match.photos?.[0]} name={match.username} size="lg" className="second" />
          <span className="match-heart"><Icon name="heart" size={22} filled /></span>
        </div>
        <h2 className="match-title">É um match!</h2>
        <p>
          Você e <b>{match.username}</b> curtiram um ao outro
          {match.common_questions > 0 && `, com ${match.compatibility}% de compatibilidade`}.
        </p>
        <Link to={`/messages/${match.id}`} className="cta big">
          <Icon name="chat" size={22} /> Enviar mensagem
        </Link>
        <button type="button" className="secondary" onClick={onClose}>Continuar descobrindo</button>
      </div>
    </Sheet>
  )
}

export default function Discover() {
  const { user } = useAuth()
  const [deck, setDeck] = useState([])
  const [empty, setEmpty] = useState({ reason: null, message: '' })
  const [loading, setLoading] = useState(true)
  const [leaving, setLeaving] = useState(null) // 'like' | 'pass' durante a saída do cartão
  const [error, setError] = useState('')
  const [match, setMatch] = useState(null)
  const [info, setInfo] = useState(false)
  const [myPhoto, setMyPhoto] = useState(null)
  const [announce, setAnnounce] = useState('')
  const busy = useRef(false)

  const fetchDeck = useCallback(
    () => api.recommendations()
      .then((r) => {
        setDeck(r.profiles)
        setEmpty({ reason: r.empty_reason, message: r.empty_message })
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false)),
    [],
  )

  useEffect(() => { fetchDeck() }, [fetchDeck])
  useEffect(() => {
    api.myProfile().then((p) => setMyPhoto(p?.photos?.[0] ?? null)).catch(() => {})
  }, [])

  const refresh = () => {
    setLoading(true)
    setError('')
    fetchDeck()
  }

  const swipe = async (dir) => {
    const current = deck[0]
    if (!current || busy.current) return
    busy.current = true
    setLeaving(dir)
    setError('')
    try {
      const [res] = await Promise.all([
        api.swipe(current.id, dir),
        wait(reducedMotion() ? 0 : FLY_MS),
      ])
      setDeck((d) => d.slice(1))
      if (res.matched) {
        setMatch(res.profile)
        setAnnounce(`É um match com ${current.username}!`)
      } else {
        setAnnounce(dir === 'like' ? `Você curtiu ${current.username}.` : `Você passou ${current.username}.`)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLeaving(null)
      busy.current = false
    }
  }

  if (loading) {
    return (
      <div className="discover">
        <h1 className="page-title">Descobrir</h1>
        <div className="deck"><div className="skeleton swipe-skeleton" aria-busy="true" aria-label="Carregando perfis" /></div>
      </div>
    )
  }

  const current = deck[0]
  return (
    <div className="discover">
      <h1 className="page-title">Descobrir</h1>
      <p className="sr-only" role="status" aria-live="polite">{announce}</p>
      {error && <p className="error" role="alert">{error}</p>}

      {current ? (
        <>
          <div className="deck">
            {deck[1] && (
              <div className="swipe-card behind" aria-hidden="true">
                <PhotoStack photos={deck[1].photos} index={0} name={deck[1].username} fill bars={false} />
              </div>
            )}
            <SwipeCard
              key={current.id}
              profile={current}
              leaving={leaving}
              disabled={Boolean(leaving)}
              onSwipe={swipe}
              onInfo={() => setInfo(true)}
            />
          </div>
          <div className="deck-actions">
            <button type="button" className="act pass" onClick={() => swipe('pass')} disabled={Boolean(leaving)} aria-label={`Passar ${current.username}`}>
              <Icon name="x" size={30} />
            </button>
            <button type="button" className="act like" onClick={() => swipe('like')} disabled={Boolean(leaving)} aria-label={`Curtir ${current.username}`}>
              <Icon name="heart" size={32} filled />
            </button>
          </div>
        </>
      ) : (
        !error && <EmptyDeck reason={empty.reason} message={empty.message} onRefresh={refresh} />
      )}

      {info && current && (
        <ProfileSheet
          profile={current}
          onClose={() => setInfo(false)}
          onDone={() => { setInfo(false); setDeck((d) => d.slice(1)) }}
        />
      )}
      {match && <MatchDialog match={match} myPhoto={myPhoto} myName={user.username} onClose={() => setMatch(null)} />}
    </div>
  )
}
