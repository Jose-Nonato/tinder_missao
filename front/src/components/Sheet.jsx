import { useEffect, useRef } from 'react'
import Icon from './Icon'

// Folha modal: sobe do rodapé no celular e vira uma janela central em telas maiores.
// Usa o <dialog> nativo: foco preso dentro dela, Esc fecha e o foco volta para quem a abriu.
// Monte o componente para abrir e desmonte para fechar (o pai controla com um estado).
export default function Sheet({ title, onClose, children, size = 'md', hideTitle = false }) {
  const ref = useRef(null)
  const panelRef = useRef(null)
  const backdropPress = useRef(false)

  useEffect(() => {
    const dialog = ref.current
    const opener = document.activeElement // quem abriu a folha: o foco volta para ele ao fechar
    if (dialog && !dialog.open) dialog.showModal()
    // o foco inicial vai para o painel (não para o botão "Fechar", que ganharia um anel à toa)
    panelRef.current?.focus({ preventScroll: true })
    return () => {
      dialog?.close()
      // o React já pode ter removido o <dialog>, então o navegador não devolveria o foco sozinho
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus()
    }
  }, [])

  // Abrir um popover pode mover o alvo do pointerup; só um clique iniciado no fundo fecha.
  const onBackdrop = (e) => {
    if (backdropPress.current && e.target === ref.current) onClose()
  }

  // O navegador dispara "close" de forma assíncrona. No modo de desenvolvimento do React o efeito
  // roda duas vezes (abre, fecha, abre) e o "close" do meio chegaria com a folha já reaberta,
  // derrubando-a. Se o diálogo está aberto, esse evento é velho: ignora.
  const onNativeClose = () => {
    if (!ref.current?.open) onClose()
  }

  return (
    <dialog
      ref={ref}
      className={`sheet sheet-${size}`}
      aria-label={title}
      onClose={onNativeClose}
      onCancel={(e) => { e.preventDefault(); onClose() }}
      onPointerDown={(e) => { backdropPress.current = e.target === ref.current }}
      onClick={onBackdrop}
    >
      <div className="sheet-panel" ref={panelRef} tabIndex={-1}>
        <div className="sheet-grab" aria-hidden="true" />
        <header className="sheet-head">
          {hideTitle ? <span /> : <h2 className="sheet-title">{title}</h2>}
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar">
            <Icon name="x" />
          </button>
        </header>
        <div className="sheet-body">{children}</div>
      </div>
    </dialog>
  )
}
