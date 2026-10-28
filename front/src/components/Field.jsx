import { useId, useState } from 'react'

// Native constraints remain authoritative; errors are also visible beside the field.
export default function Field({ as: Control = 'input', label, helper, error, children, onChange, ...props }) {
  const id = useId()
  const [invalid, setInvalid] = useState('')
  const message = error || invalid
  return <div className="field">
    <label htmlFor={id}>{label}{props.required && <span className="field-required">Obrigatório</span>}</label>
    <Control {...props} id={id} aria-invalid={Boolean(message)} aria-describedby={helper || message ? `${id}-help` : undefined}
      onInvalid={(e) => setInvalid(e.currentTarget.validationMessage)}
      onBlur={(e) => setInvalid(e.currentTarget.validity.valid ? '' : e.currentTarget.validationMessage)}
      onChange={(e) => { setInvalid(''); onChange?.(e) }}>{children}</Control>
    {(helper || message) && <small id={`${id}-help`} className={message ? 'error' : 'muted'}>{message || helper}</small>}
  </div>
}
export function Input(props) { return <Field {...props} /> }
export function Select(props) { return <Field as="select" {...props} /> }
export function Textarea(props) { return <Field as="textarea" {...props} /> }
