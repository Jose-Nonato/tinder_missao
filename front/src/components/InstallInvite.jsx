import { useEffect, useState, useSyncExternalStore } from 'react'
import { useLocation } from 'react-router-dom'
import { LogoMark } from './Logo'
import { subscribeInstall, getInstallOffer, clearInstallOffer } from './installPrompt'

const DISMISSED = 'voto-a-dois-install-dismissed'
function dismissed() {
  try { return localStorage.getItem(DISMISSED) === '1' } catch { return false }
}

export default function InstallInvite() {
  const { pathname } = useLocation()
  const offer = useSyncExternalStore(subscribeInstall, getInstallOffer)
  const [ready, setReady] = useState(false)
  const [hidden, setHidden] = useState(dismissed)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!import.meta.env.PROD) return
    const timer = setTimeout(() => setReady(true), 60000)
    return () => {
      clearTimeout(timer)
    }
  }, [])
  const dismiss = () => {
    setHidden(true)
    try { localStorage.setItem(DISMISSED, '1') } catch { /* Ainda dispensa nesta sessão. */ }
  }
  const install = async () => {
    setBusy(true)
    try {
      await offer.prompt()
      const { outcome } = await offer.userChoice
      if (outcome === 'dismissed') dismiss()
    } catch { /* O convite do navegador pode expirar; aguarda um novo evento. */ }
    finally { clearInstallOffer(); setBusy(false) }
  }
  // Aparece no início após um minuto de uso; não disputa espaço com o chat ou formulários.
  if (!ready || hidden || !offer || pathname !== '/' || window.matchMedia('(display-mode: standalone)').matches || navigator.standalone) return null
  return <aside className="install-invite" aria-label="Instalar Missão a Dois">
    <LogoMark size={36} />
    <div className="install-copy"><strong>Mais perto, na sua tela inicial</strong><p>Instale o Missão a Dois para abrir com um toque.</p></div>
    <div className="install-actions">
      <button type="button" onClick={install} disabled={busy}>{busy ? 'Abrindo…' : 'Instalar'}</button>
      <button type="button" className="secondary" onClick={dismiss} disabled={busy}>Agora não</button>
    </div>
  </aside>
}
