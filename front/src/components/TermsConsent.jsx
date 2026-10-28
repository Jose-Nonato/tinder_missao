import { Checkbox } from './form/Controls'
import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { CONSENT_ERROR } from '../legal/consent'

export default function TermsConsent({ checked, onChange }) {
  const id = useId()
  const [invalid, setInvalid] = useState(false)
  return <div className="terms-consent">
    <label className="check terms-consent-label" htmlFor={id}>
      <Checkbox id={id} name="accept_terms" required checked={checked}
        aria-invalid={invalid} aria-describedby={`${id}-description${invalid ? ` ${id}-error` : ''}`}
        onInvalid={() => setInvalid(true)}
        onChange={(event) => { setInvalid(false); onChange(event.target.checked) }} />
      <span>Li e aceito os <Link to="/termos" target="_blank" rel="noopener noreferrer">Termos de Uso<span className="sr-only"> (abre em nova aba)</span></Link> e a <Link to="/privacidade" target="_blank" rel="noopener noreferrer">Política de Privacidade<span className="sr-only"> (abre em nova aba)</span></Link>.</span>
    </label>
    <p id={`${id}-description`} className="terms-description">
      <strong>Consentimento para dados sensíveis.</strong> Ao marcar, consinto explicitamente com o tratamento das minhas opiniões políticas e respostas ao questionário para calcular afinidade e recomendar pessoas. Este uso é necessário para o serviço de afinidade política. Posso revogar o consentimento pelo canal indicado na Política de Privacidade.
    </p>
    <small className="muted">Obrigatório. Os documentos abrem em nova aba e estão em rascunho para revisão jurídica.</small>
    {invalid && <p id={`${id}-error`} className="error" role="alert">{CONSENT_ERROR}</p>}
  </div>
}
