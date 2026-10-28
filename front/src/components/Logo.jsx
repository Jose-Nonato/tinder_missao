// Marca provisória: trocar este componente e os arquivos em public/icons ao definir o logo.
export function LogoMark({ size = 36 }) {
  return <img src="/icons/brand.svg" alt="" width={size} height={size} className="logo-mark" />
}

export default function Logo({ size = 36, text = true, className = '' }) {
  return <span className={`logo ${className}`.trim()}>
    <LogoMark size={size} />
    {text && <span className="logo-text">Voto a dois</span>}
  </span>
}
