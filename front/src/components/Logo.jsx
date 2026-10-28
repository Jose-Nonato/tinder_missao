// Marca do app (original, não reproduz o logo de terceiros): um "M" sobre o amarelo da marca.
export function LogoMark({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" focusable="false" className="logo-mark">
      <rect width="40" height="40" rx="12" fill="var(--c-brand)" />
      <path d="M11 29V12l9 10.5L29 12v17" fill="none" stroke="var(--c-on-brand)" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
