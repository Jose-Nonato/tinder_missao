import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import Avatar from '../components/Avatar'
import Icon from '../components/Icon'
import { PhotoStack } from '../components/PhotoGallery'
import ProfileSheet from '../components/ProfileSheet'
import Sheet from '../components/Sheet'
import AffinityScore from '../components/AffinityScore'
import EmptyIllustration from '../components/EmptyIllustration'
import { springStep, swipeDirection } from '../components/swipeMotion'
import { topicAgreement } from '../components/topicAgreement'

const FLY_MS = 360
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Cartão de perfil que acompanha o dedo. Curtir/passar também funcionam pelos botões e pelas
// setas do teclado: gesto nunca é o único caminho.
function SwipeCard({ profile, leaving, disabled, onSwipe, onInfo }) {
  const [photo, setPhoto] = useState(0)
  const card = useRef(null)
  const frame = useRef(0)
  const motion = useRef({ x: 0, y: 0, velocity: 0 })
  const start = useRef(null)
  const moved = useRef(false)

  const count = profile.photos?.length ?? 0
  const place = [profile.city, profile.state].filter(Boolean).join(', ')
  const work = profile.profession || profile.university

  const paint = (x, y = 0, progress = Math.min(1, Math.abs(x) / 220)) => {
    const el = card.current
    if (!el) return
    const reduce = reducedMotion()
    el.style.transform = reduce ? 'none' : `translate3d(${x}px, ${y}px, 0) rotate(${x / 24}deg)`
    el.style.setProperty('--like-opacity', Math.min(1, Math.max(0, x / 90)))
    el.style.setProperty('--pass-opacity', Math.min(1, Math.max(0, -x / 90)))
    const behind = el.parentElement.querySelector('.behind')
    if (behind) behind.style.transform = reduce ? 'none' : `translateY(${12 * (1 - progress)}px) scale(${0.96 + progress * 0.04})`
  }
  const settle = () => {
    cancelAnimationFrame(frame.current)
    const el = card.current
    el?.classList.remove('dragging')
    if (reducedMotion()) { motion.current = { x: 0, y: 0, velocity: 0 }; paint(0); return }
    let spring = { x: motion.current.x, v: motion.current.velocity * 1000 }
    const y = motion.current.y
    const initialX = Math.abs(spring.x) || 1
    let last = performance.now()
    const tick = (now) => {
      spring = springStep(spring, Math.min((now - last) / 1000, 1 / 30))
      last = now
      motion.current.x = spring.x
      paint(spring.x, y * Math.min(1, Math.abs(spring.x) / initialX))
      if (Math.abs(spring.x) > 0.1 || Math.abs(spring.v) > 0.1) frame.current = requestAnimationFrame(tick)
      else { paint(0); motion.current = { x: 0, y: 0, velocity: 0 }; el.style.willChange = '' }
    }
    frame.current = requestAnimationFrame(tick)
  }

  useEffect(() => {
    const el = card.current
    cancelAnimationFrame(frame.current)
    if (!leaving) { motion.current = { x: 0, y: 0, velocity: 0 }; paint(0); el.style.opacity = '1'; el.style.willChange = ''; return }
    start.current = null
    el.classList.remove('dragging')
    el.style.willChange = 'transform, opacity'
    const from = { ...motion.current }
    const direction = leaving === 'like' ? 1 : -1
    const target = direction * (window.innerWidth + el.offsetWidth)
    const duration = reducedMotion() ? 160 : Math.max(220, FLY_MS - Math.abs(from.velocity) * 55)
    const began = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - began) / duration)
      const eased = 1 - (1 - t) ** 2
      if (reducedMotion()) { paint(direction * 90); el.style.opacity = String(1 - t) }
      else paint(from.x + (target - from.x) * eased, from.y - 35 * eased, 1)
      if (t < 1) frame.current = requestAnimationFrame(tick)
      else el.style.willChange = ''
    }
    frame.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame.current)
  }, [leaving])
  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  const onPointerDown = (e) => {
    if (disabled || start.current || e.target.closest('[data-no-drag]')) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    cancelAnimationFrame(frame.current)
    start.current = { x: e.clientX - motion.current.x, y: e.clientY, lastX: e.clientX, t: performance.now() }
    moved.current = false
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e) => {
    const s = start.current
    if (!s) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    if (!moved.current && Math.hypot(dx, dy) < 8) return
    moved.current = true
    const now = performance.now()
    motion.current = { x: dx, y: dy * 0.15, velocity: (e.clientX - s.lastX) / Math.max(1, now - s.t) }
    s.lastX = e.clientX; s.t = now
    card.current.classList.add('dragging')
    card.current.style.willChange = 'transform'
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => paint(motion.current.x, motion.current.y))
  }
  const onPointerUp = (e) => {
    const s = start.current
    start.current = null
    if (!s) return
    if (!moved.current) {
      const rect = e.currentTarget.getBoundingClientRect()
      const rel = (e.clientX - rect.left) / rect.width
      if (rel < 0.4) setPhoto((p) => Math.max(0, p - 1))
      else if (rel > 0.6) setPhoto((p) => Math.max(0, Math.min(count - 1, p + 1)))
      settle()
      return
    }
    const velocity = performance.now() - s.t > 100 ? 0 : motion.current.velocity
    const direction = swipeDirection(motion.current.x, velocity)
    if (direction) onSwipe(direction)
    else settle()
  }
  const onPointerCancel = () => { start.current = null; settle() }
  const onKeyDown = (e) => {
    if (disabled) return
    if (e.key === 'ArrowRight') { e.preventDefault(); onSwipe('like') }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); onSwipe('pass') }
    else if (e.key === 'ArrowUp' || e.key === 'i') { e.preventDefault(); onInfo() }
  }

  return (
    <div
      ref={card}
      className={`swipe-card${leaving ? ' leaving' : ''}`}
      aria-busy={disabled}
      tabIndex={0}
      role="group"
      aria-roledescription="cartão de perfil"
      aria-label={`${profile.username}${profile.age != null ? `, ${profile.age} anos` : ''}. ${profile.compatibility}% compatível. Setas: direita curte, esquerda passa, cima abre detalhes.`}
      onDragStart={(e) => e.preventDefault()}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onKeyDown={onKeyDown}
    >
      <PhotoStack photos={profile.photos} index={photo} name={profile.username} fill />
      <span className="stamp like" style={{ opacity: 'var(--like-opacity, 0)' }} aria-hidden="true">Curtir</span>
      <span className="stamp pass" style={{ opacity: 'var(--pass-opacity, 0)' }} aria-hidden="true">Passar</span>

      {profile.common_questions > 0 && (
        <span className="chip card-compat">
          <b>{profile.compatibility}<small>%</small></b><span>de afinidade</span>
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
      <EmptyIllustration />
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
    <Sheet title="Deu match!" onClose={onClose} size="match" hideTitle>
      <div className="match-hero">
        <div className="match-confetti" aria-hidden="true">{Array.from({ length: 14 }, (_, i) => <i key={i} style={{ '--i': i }} />)}</div>
        <h2 className="match-title">Deu match!</h2>
        <div className="match-photos">
          <Avatar src={myPhoto} name={myName} size="lg" />
          <Avatar src={match.photos?.[0]} name={match.username} size="lg" className="second" />
          <span className="match-heart"><Icon name="heart" size={22} filled /></span>
        </div>
        {match.common_questions > 0 && <AffinityScore value={match.compatibility} />}
        {topicAgreement(match.breakdown).filter(t => t.agreements > 0).length > 0 && (
          <div className="match-topics"><span>Vocês concordam em</span><div>{topicAgreement(match.breakdown).filter(t => t.agreements > 0).slice(0, 3).map(t => <span className="tag" key={t.topic}>{t.topic}</span>)}</div></div>
        )}
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
  const likeButton = useRef(null)
  const closeMatch = () => {
    setMatch(null)
    requestAnimationFrame(() => (likeButton.current ?? document.getElementById('main'))?.focus())
  }

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
        wait(reducedMotion() ? 160 : FLY_MS),
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
        <header className="discover-heading"><h1 className="page-title">Descobrir</h1><p>Uma conexão começa com ideias em comum.</p></header>
        <div className="deck"><div className="skeleton swipe-skeleton" aria-busy="true" aria-label="Carregando perfis" /></div>
      </div>
    )
  }

  const current = deck[0]
  return (
    <div className="discover">
      <header className="discover-heading"><h1 className="page-title">Descobrir</h1><p>Uma conexão começa com ideias em comum.</p></header>
      <p className="sr-only" role="status" aria-live="polite">{announce}</p>
      {error && (
        <div className="stack">
          <p className="error" role="alert">{error}</p>
          {!current && <button type="button" className="secondary" onClick={refresh}>Tentar novamente</button>}
        </div>
      )}

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
            <button type="button" className={`act pass${leaving === 'pass' ? ' chosen' : ''}`}  onClick={() => swipe('pass')} disabled={Boolean(leaving)} aria-label={`Passar ${current.username}`}>
              <Icon name="x" size={30} /><span>Passar</span>
            </button>
            <button type="button" className={`act like${leaving === 'like' ? ' chosen' : ''}`}  ref={likeButton} onClick={() => swipe('like')} disabled={Boolean(leaving)} aria-label={`Curtir ${current.username}`}>
              <Icon name="heart" size={32} filled /><span>Curtir</span>
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
      {match && <MatchDialog match={match} myPhoto={myPhoto} myName={user.username} onClose={closeMatch} />}
    </div>
  )
}
