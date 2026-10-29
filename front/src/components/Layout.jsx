import { useMobile } from '../navigation/useMobile'
import { useEffect, useRef, useState } from 'react'
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { useChat } from '../chat/ChatContext'
import Icon from './Icon'
import Logo, { LogoMark } from './Logo'
import Sheet from './Sheet'
import MessageNotice from './MessageNotice'
import InstallInvite from './InstallInvite'
import { MobileHeader } from '../navigation/MobileNavigation'
import { screenFor } from '../navigation/screens'

// Etapas obrigatórias para usuários comuns (admins ficam de fora):
// 1) responder o questionário, 2) completar o perfil.
const mustAnswer = (user) => user.role === 'user' && !user.questionnaire_completed
const mustFillProfile = (user) => user.role === 'user' && !user.profile_completed

// Exige login; com `role`, exige também esse papel.
export function RequireAuth({ role }) {
  const { user, loading } = useAuth()
  if (loading) return <p className="center loading">Carregando…</p>
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) return <Navigate to="/" replace />
  return <Outlet />
}

export function RequireQuestionnaire() {
  const { user } = useAuth()
  if (mustAnswer(user)) return <Navigate to="/questionnaire" replace />
  return <Outlet />
}

export function RequireProfile() {
  const { user } = useAuth()
  if (mustFillProfile(user)) return <Navigate to="/profile" replace />
  return <Outlet />
}

const TITLES = {
  '/': 'Início',
  '/discover': 'Descobrir',
  '/matches': 'Matches',
  '/messages': 'Mensagens',
  '/profile': 'Meu perfil',
  '/questionnaire': 'Questionário',
  '/blocked': 'Bloqueados',
  '/safety': 'Central de segurança',
  '/admin/questions': 'Perguntas',
  '/admin/users': 'Usuários',
  '/admin/reports': 'Denúncias',
  '/admin/password-resets': 'Redefinição de senha',
}

// Navegação principal (barra de abas / menu lateral) e secundária (folha "Mais" / menu lateral).
function buildNav(user, { unread, pendingResets }) {
  if (user.role === 'admin') {
    return {
      primary: [
        { to: '/admin/questions', label: 'Perguntas', icon: 'list' },
        { to: '/admin/users', label: 'Usuários', icon: 'users' },
        { to: '/admin/reports', label: 'Denúncias', icon: 'flag' },
        { to: '/admin/password-resets', label: 'Senhas', icon: 'key', badge: pendingResets },
      ],
      secondary: [
        { to: '/', label: 'Início', icon: 'home', end: true },
        { to: '/questionnaire', label: 'Questionário', icon: 'clipboard' },
        { to: '/profile', label: 'Meu perfil', icon: 'user' },
        { to: '/apoie', label: 'Apoie o projeto', icon: 'heart' },
      ],
    }
  }
  return {
    primary: [
      { to: '/discover', label: 'Descobrir', icon: 'compass' },
      { to: '/matches', label: 'Matches', icon: 'heart' },
      { to: '/messages', label: 'Mensagens', icon: 'chat', badge: unread },
      { to: '/profile', label: 'Perfil', icon: 'user' },
    ],
    secondary: [
      { to: '/', label: 'Início', icon: 'home', end: true },
      { to: '/questionnaire', label: 'Questionário', icon: 'clipboard' },
      { to: '/safety', label: 'Segurança', icon: 'shield' },
      { to: '/blocked', label: 'Bloqueados', icon: 'ban' },
      { to: '/apoie', label: 'Apoie o projeto', icon: 'heart' },
    ],
  }
}

const badgeText = (n) => (n > 99 ? '99+' : String(n))

function NavBadge({ count }) {
  if (!count) return null
  return (
    <>
      <span className="badge-count" aria-hidden="true">{badgeText(count)}</span>
      <span className="sr-only">{count} {count === 1 ? 'novo' : 'novos'}</span>
    </>
  )
}

function UserChip({ user }) {
  return (
    <div className="user-chip">
      <span className="avatar sm" aria-hidden="true">{user.username[0].toUpperCase()}</span>
      <span className="user-chip-text">
        <b>{user.username}</b>
        <small className="muted">{user.role === 'admin' ? 'Administrador' : 'Usuário'}</small>
      </span>
    </div>
  )
}

function MoreSheet({ user, items, onClose, onLogout }) {
  return (
    <Sheet title="Menu" onClose={onClose} size="sm">
      <UserChip user={user} />
      <ul className="more-list">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink to={item.to} end={item.end} className={({ isActive }) => `more-item${item.to === '/apoie' ? ' link-support' : ''}${isActive ? ' active' : ''}`} onClick={onClose}>
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
      {/* ação destrutiva separada da navegação normal */}
      <div className="more-danger">
        <button type="button" className="secondary danger-outline" onClick={onLogout}>
          <Icon name="logout" /> Sair da conta
        </button>
      </div>
    </Sheet>
  )
}

export function Layout() {
  const { user, logout } = useAuth()
  const mobile = useMobile()
  const { unreadTotal } = useChat()
  const { pathname } = useLocation()
  const [pendingResets, setPendingResets] = useState(0)
  const [moreOpen, setMoreOpen] = useState(false)
  const mainRef = useRef(null)
  const firstRender = useRef(true)

  const isAdmin = user.role === 'admin'
  const locked = mustAnswer(user) || mustFillProfile(user)
  const screen = screenFor(pathname)
  const inThread = /^\/messages\/[^/]+/.test(pathname)
  const nav = buildNav(user, { unread: unreadTotal, pendingResets })

  // admin: avisa no menu quando há pedidos de redefinição de senha esperando
  useEffect(() => {
    if (!isAdmin) return
    api.passwordResetSummary().then((s) => setPendingResets(s.pending)).catch(() => {})
  }, [isAdmin, pathname])

  // ao trocar de página, leva o foco para o conteúdo (leitores de tela); trocar de conversa não conta
  const focusKey = pathname.startsWith('/messages') ? '/messages' : pathname
  useEffect(() => {
    if (mobile) return
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    mainRef.current?.focus({ preventScroll: true })
    const animation = mainRef.current?.animate(
      [{ opacity: 0.45 }, { opacity: 1 }],
      { duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 180 },
    )
    return () => animation?.cancel()
  }, [focusKey, mobile])

  // "Mais" fica ativo quando a página atual é uma das rotas que moram nele
  const inMore = nav.secondary.some((item) => (item.end ? pathname === item.to : pathname.startsWith(item.to)))
  const title = TITLES[pathname] ?? TITLES[`/${pathname.split('/')[1]}`] ?? ''
  const allItems = [...nav.primary, ...nav.secondary]

  const doLogout = async () => {
    setMoreOpen(false)
    await logout()
  }

  return (
    <div className={`app${inThread ? ' is-thread' : ''}${locked ? ' is-locked' : ''}${mobile && !screen.root ? ' is-detail' : ''}`}>
      <a className="skip-link" href="#main" onClick={(e) => { e.preventDefault(); mainRef.current?.focus() }}>
        Pular para o conteúdo
      </a>

      {/* celular e tablet: barra superior */}
      <div className="mobile-only"><MobileHeader title={screen.title} parent={screen.parent} root={screen.root || (locked && pathname === '/questionnaire')} /></div>
      <header className="topbar">
        <LogoMark size={32} />
        <span className="topbar-title">{locked ? 'Complete seu cadastro' : title}</span>
        {locked && (
          <button type="button" className="link" onClick={doLogout}>Sair</button>
        )}
      </header>

      {/* desktop (>= 1024px): menu lateral */}
      <aside className="sidebar">
        <Logo size={36} />
        {!locked && (
          <nav aria-label="Principal" className="side-nav">
            {allItems.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `side-item${item.to === '/apoie' ? ' link-support' : ''}${isActive ? ' active' : ''}`}>
                <Icon name={item.icon} />
                <span>{item.label}</span>
                <NavBadge count={item.badge} />
              </NavLink>
            ))}
          </nav>
        )}
        <div className="side-footer">
          <UserChip user={user} />
          <button type="button" className="secondary danger-outline" onClick={doLogout}>
            <Icon name="logout" /> Sair
          </button>
        </div>
      </aside>

      <main id="main" className="app-main" ref={mainRef} tabIndex={-1}>
        <Outlet />
        <InstallInvite />
      </main>

      {/* celular e tablet: barra de abas (no máximo 5 itens, sempre com ícone + texto) */}
      {!locked && (
        <nav className="tabbar" aria-label="Principal">
          {(mobile && isAdmin ? [...nav.primary.slice(0, 3), { to: '/profile', label: 'Perfil', icon: 'user' }] : nav.primary).map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `tab-item${isActive ? ' active' : ''}`}>
              <span className="tab-ico">
                <Icon name={item.icon} />
                <NavBadge count={item.badge} />
              </span>
              <span className="tab-label">{item.label}</span>
            </NavLink>
          ))}
          {!mobile && <button
            type="button"
            className={`tab-item tab-more${moreOpen || inMore ? ' active' : ''}`}
            onClick={() => setMoreOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
          >
            <span className="tab-ico"><Icon name="menu" /></span>
            <span className="tab-label">Mais</span>
          </button>}
        </nav>
      )}

      <MessageNotice />
      {moreOpen && (
        <MoreSheet user={user} items={nav.secondary} onClose={() => setMoreOpen(false)} onLogout={doLogout} />
      )}
    </div>
  )
}
