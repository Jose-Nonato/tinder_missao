// A onça (public/logo_onca.png) em versão leve; os ícones de instalação e o favicon saem do mesmo arquivo.
export function LogoMark({ size = 36 }) {
  // padding em % no CSS seria relativo ao pai; aqui acompanha o tamanho do selo.
  return <img src="/icons/logo.webp" width={size} height={size} className="logo-mark" style={{ padding: Math.round(size * 0.08) }} alt="" draggable="false" />
}

export default function Logo({ size = 36, text = true, className = '' }) {
  return <span className={`logo ${className}`.trim()} role={text ? undefined : 'img'} aria-label={text ? undefined : 'Missão a Dois'}>
    <LogoMark size={size} />
    {text && <span className="logo-text">Missão a Dois</span>}
  </span>
}
