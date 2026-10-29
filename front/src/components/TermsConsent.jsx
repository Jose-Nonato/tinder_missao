import { useMobile } from '../navigation/useMobile'
import { Checkbox } from './form/Controls'
import { useId, useState } from 'react'
import { AppDocumentLink } from '../navigation/MobileNavigation'
import { CONSENT_ERROR } from '../legal/consent'

export default function TermsConsent({ checked, onChange }) {
  const id = useId()
  const mobile = useMobile()
  const [invalid, setInvalid] = useState(false)
  return <div className="terms-consent">
    <label className="check terms-consent-label" htmlFor={id}>
      <Checkbox id={id} name="accept_terms" required checked={checked}
        aria-invalid={invalid} aria-describedby={`${id}-description${invalid ? ` ${id}-error` : ''}`}
        onInvalid={() => setInvalid(true)}
        onChange={(event) => { setInvalid(false); onChange(event.target.checked) }} />
      <span>Li e aceito os <AppDocumentLink to="/termos">Termos de Uso</AppDocumentLink> e a <AppDocumentLink to="/privacidade">Política de Privacidade</AppDocumentLink>.</span>
    </label>
    <p id={`${id}-description`} className="terms-description">
      Ao marcar, consinto explicitamente com o tratamento das minhas opiniões políticas e respostas ao questionário para calcular afinidade e recomendar pessoas. Este uso é necessário para o serviço de afinidade política. Meus dados não serão usados para comunicação política, propaganda ou marketing. O projeto é independente de partidos. Posso solicitar revogação ou exclusão da conta por e-mail a duckstech@hotmail.com, pois não há essa função no app.
    </p>
    <small className="muted">Obrigatório. {mobile ? 'Leia os documentos aqui e volte para continuar.' : 'Os documentos abrem em nova aba.'}</small>
    {invalid && <p id={`${id}-error`} className="error" role="alert">{CONSENT_ERROR}</p>}
  </div>
}
