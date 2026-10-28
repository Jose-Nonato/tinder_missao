import { useState } from 'react'
import { assetUrl } from '../api/client'

// Mostra a foto `index` de uma lista, com barras de progresso (como nos stories). É só
// apresentação: quem usa decide como trocar de foto. `children` fica sobre a foto.
export function PhotoStack({ photos, index = 0, name, fill = false, bars = true, children }) {
  const count = photos?.length ?? 0
  return (
    <div className={`photo-stack${fill ? ' fill' : ''}`}>
      {count === 0 ? (
        <div className="photo-empty">
          <span className="avatar lg" aria-hidden="true">{name[0].toUpperCase()}</span>
        </div>
      ) : (
        <img
          src={assetUrl(photos[index])}
          alt={`Foto ${index + 1} de ${count} de ${name}`}
          draggable={false}
          decoding="async"
        />
      )}
      {bars && count > 1 && (
        <div className="photo-bars" aria-hidden="true">
          {photos.map((url, i) => (
            <span key={url} className={i === index ? 'on' : ''} />
          ))}
        </div>
      )}
      {children}
    </div>
  )
}

// Galeria com zonas de toque nas laterais para trocar de foto (e botões para teclado).
export default function PhotoGallery({ photos, name }) {
  const [index, setIndex] = useState(0)
  const count = photos?.length ?? 0
  const go = (delta) => setIndex((i) => Math.min(count - 1, Math.max(0, i + delta)))
  return (
    <PhotoStack photos={photos} index={index} name={name}>
      {count > 1 && (
        <>
          <button type="button" className="photo-zone prev" aria-label="Foto anterior" disabled={index === 0} onClick={() => go(-1)} />
          <button type="button" className="photo-zone next" aria-label="Próxima foto" disabled={index === count - 1} onClick={() => go(1)} />
        </>
      )}
    </PhotoStack>
  )
}
