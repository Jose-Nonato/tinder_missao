import { Link } from 'react-router-dom'
import Icon from './Icon'

export default function LegalLinks() {
  return <nav className="legal-links" aria-label="Informações e apoio">
    <Link className="btn-text" to="/termos" target="_blank" rel="noopener noreferrer">Termos de Uso<span className="sr-only"> (abre em nova aba)</span></Link>
    <Link className="btn-text" to="/privacidade" target="_blank" rel="noopener noreferrer">Política de Privacidade<span className="sr-only"> (abre em nova aba)</span></Link>
    <Link className="btn-text link-chip link-support" to="/apoie"><Icon name="heart" size={14} />Apoie o projeto</Link>
  </nav>
}
