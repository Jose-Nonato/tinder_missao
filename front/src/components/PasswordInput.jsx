import { TextInput } from './form/Controls'
import { useId, useState } from 'react'
import Icon from './Icon'

// Campo de senha com botão de mostrar/ocultar. Aceita colar e gerenciadores de senha
// (use `autoComplete="current-password"` no login e `"new-password"` ao criar/redefinir).
export default function PasswordInput({ label, hint, error, ...inputProps }) {
  const [visible, setVisible] = useState(false)
  const id = useId()
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="password-wrap">
        <TextInput id={id} type={visible ? 'text' : 'password'} aria-describedby={hint ? `${id}-hint` : undefined} {...inputProps} />
        <button
          type="button"
          className="icon-btn password-toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          aria-pressed={visible}
        >
          <Icon name={visible ? 'eye-off' : 'eye'} />
        </button>
      </div>
      {hint && <small id={`${id}-hint`} className="muted">{hint}</small>}
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  )
}
