// Marca do app: logo do Missão (public/logo_principal.png). `size` é a altura em px.
export function LogoMark({ size = 36 }) {
  return (
    <img src="/logo_principal.png" alt="" height={size} style={{ height: size, width: 'auto' }} className="logo-mark" />
  )
}

export default function Logo({ size = 36, text = true, className = '' }) {
  return (
    <span className={`logo ${className}`.trim()}>
      <LogoMark size={size} />
      {text && <span className="logo-text">Tinder Missão</span>}
    </span>
  )
}
