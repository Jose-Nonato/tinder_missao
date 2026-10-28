// Marca do app (original, não reproduz o logo de terceiros): um "M" sobre o degradê amarelo.
export function LogoMark({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" focusable="false" className="logo-mark">
      <defs>
        <linearGradient id="logo-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe45c" />
          <stop offset="0.5" stopColor="#ffcc00" />
          <stop offset="1" stopColor="#ffa800" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill="url(#logo-grad)" />
      <path d="M11 29V12l9 10.5L29 12v17" fill="none" stroke="#121212" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
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
