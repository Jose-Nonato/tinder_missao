import { Link } from 'react-router-dom'

export default function LegalLinks() {
  return <nav className="legal-links" aria-label="Documentos legais">
    <Link to="/termos" target="_blank" rel="noopener noreferrer">Termos de Uso<span className="sr-only"> (abre em nova aba)</span></Link>
    <Link to="/privacidade" target="_blank" rel="noopener noreferrer">Política de Privacidade<span className="sr-only"> (abre em nova aba)</span></Link>
  </nav>
}
