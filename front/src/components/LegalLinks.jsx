import { Link } from 'react-router-dom'
import Icon from './Icon'
import { AppDocumentLink } from '../navigation/MobileNavigation'

export default function LegalLinks() {
  return <nav className="legal-links" aria-label="Informações e apoio">
    <AppDocumentLink to="/termos">Termos de Uso</AppDocumentLink>
    <AppDocumentLink to="/privacidade">Política de Privacidade</AppDocumentLink>
    <Link className="btn-text link-chip link-support" to="/apoie"><Icon name="heart" size={14} />Apoie o projeto</Link>
  </nav>
}
