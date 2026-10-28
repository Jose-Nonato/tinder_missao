import Logo from './Logo'

// Moldura das telas de entrada (login, cadastro, recuperação): fundo da marca + cartão.
export default function AuthShell({ children }) {
  return (
    <main className="auth-page" id="main">
      <div className="auth-brand">
        <Logo size={44} />
        <p className="auth-tagline">Conexões que começam pelo que você pensa.</p>
      </div>
      <div className="auth-card-wrap">{children}</div>
    </main>
  )
}
