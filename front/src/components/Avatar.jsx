import { assetUrl } from '../api/client'

// Foto redonda da pessoa (ou a inicial do nome). Decorativo: o nome aparece ao lado.
export default function Avatar({ src, name, size = '', className = '' }) {
  const cls = `avatar ${size} ${className}`.trim()
  if (src) return <img className={cls} src={assetUrl(src)} alt="" loading="lazy" draggable={false} />
  return <span className={cls} aria-hidden="true">{name[0].toUpperCase()}</span>
}
