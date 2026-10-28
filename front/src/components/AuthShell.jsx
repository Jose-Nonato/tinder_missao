import Logo from './Logo'
import LegalLinks from './LegalLinks'

// Moldura das telas de entrada (login, cadastro, recuperação): fundo da marca + cartão.
export default function AuthShell({ children, compactMobile = false }) {
  return (
    <main className={`auth-page${compactMobile ? ' auth-login' : ''}`} id="main">
      <div className="auth-brand">
        <Logo size={44} />
        <p className="auth-tagline">Conexões que começam pelo que você <em>pensa.</em></p>
        {compactMobile && <p className="auth-tagline-mobile">Conexões pelo que você pensa.</p>}
      </div>
      <div className="auth-card-wrap">{children}<LegalLinks /></div>
    </main>
  )
}
