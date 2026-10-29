import { useEffect, useLayoutEffect, useRef } from 'react'
import { Link, useLocation, useNavigate, useNavigationType } from 'react-router-dom'
import Icon from '../components/Icon'
import { canGoBack, screenFor } from './screens'

import { useMobile } from './useMobile'

export function BackButton({ parent, className = 'mobile-back', children }) {
  const navigate = useNavigate()
  return <button type="button" className={className} aria-label="Voltar" onClick={() => {
    if (canGoBack(window.history.state)) navigate(-1)
    else navigate(parent || '/profile', { replace: true })
  }}><Icon name="arrow-left" />{children || <span>Voltar</span>}</button>
}

export function MobileHeader({ title, parent, root = false, action }) {
  const heading = useRef(null)
  const mobile = useMobile()
  useEffect(() => {
    if (!mobile || !heading.current?.getClientRects().length) return
    heading.current.focus({ preventScroll: true })
    document.title = `${title} · Voto a dois`
  }, [title, mobile])
  return <header className="mobile-header">
    {!root && <BackButton parent={parent} />}
    <h1 tabIndex={-1} ref={heading} data-screen-title>{title}</h1>
    {action}
  </header>
}

// Public pages also need a way back in an installed PWA.
export function PublicMobileHeader() {
  const { pathname, state } = useLocation()
  const { title, parent } = screenFor(pathname)
  return <div className="mobile-only"><MobileHeader title={title} parent={state?.returnTo || parent} /></div>
}

export function AppDocumentLink({ to, children, className = 'btn-text' }) {
  const mobile = useMobile()
  const location = useLocation()
  const destination = mobile && location.pathname.startsWith('/register') ? `/register${to}` : to
  return <Link to={destination} className={className} target={mobile ? undefined : '_blank'} rel={mobile ? undefined : 'noopener noreferrer'}
    state={mobile ? { returnTo: location.pathname } : undefined}>
    {children}{!mobile && <span className="sr-only"> (abre em nova aba)</span>}
  </Link>
}

export function RouteEffects() {
  const location = useLocation()
  const action = useNavigationType()
  const mobile = useMobile()
  const positions = useRef(new Map())
  useLayoutEffect(() => {
    if (!mobile || location.hash) return
    const savedPositions = positions.current
    const manual = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    const target = action === 'POP' ? savedPositions.get(location.key) || 0 : 0
    let restoring = true
    const restore = () => { if (restoring) window.scrollTo(0, target) }
    restore()
    // Lists load asynchronously; retry on content resize until the saved position fits.
    const observer = new ResizeObserver(restore)
    observer.observe(document.body)
    const timer = setTimeout(() => { restoring = false; observer.disconnect() }, 1800)
    const save = () => { if (!restoring) savedPositions.set(location.key, window.scrollY) }
    const stop = () => { restoring = false; savedPositions.set(location.key, window.scrollY); observer.disconnect() }
    window.addEventListener('scroll', save, { passive: true })
    window.addEventListener('pointerdown', stop, { once: true })
    window.addEventListener('wheel', stop, { once: true })
    return () => {
      savedPositions.set(location.key, window.scrollY)
      window.history.scrollRestoration = manual
      clearTimeout(timer); observer.disconnect()
      window.removeEventListener('scroll', save)
      window.removeEventListener('pointerdown', stop)
      window.removeEventListener('wheel', stop)
    }
  }, [location.key, location.hash, action, mobile])
  useEffect(() => {
    if (!mobile) return
    const title = [...document.querySelectorAll('[data-screen-title]')].find(el => el.getClientRects().length)
    title?.focus({ preventScroll: true })
    document.title = `${title?.textContent || screenFor(location.pathname).title} · Voto a dois`
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const content = [...document.querySelectorAll('.app-main, .legal-document, .auth-card-wrap')].find(el => el.getClientRects().length)
    const animation = content?.animate(
      [{ opacity: 0.6, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }],
      { duration: 180, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
    )
    return () => animation?.cancel()
  }, [location.pathname, mobile])
  return null
}

export function MobileMenu({ items, label = 'Opções do perfil' }) {
  return <nav className="screen-menu" aria-label={label}>{items.map(({ to, label, icon = 'chevron-right', description }) =>
    <Link key={to} to={to}><Icon name={icon} /><span><b>{label}</b>{description && <small>{description}</small>}</span><Icon name="chevron-right" size={20} /></Link>,
  )}</nav>
}
