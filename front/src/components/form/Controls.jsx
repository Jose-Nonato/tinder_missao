import Icon from '../Icon'

export function TextInput({ className = '', ...props }) {
  return <input className={`app-input ${className}`} {...props} />
}
export function TextArea({ className = '', ...props }) {
  return <textarea className={`app-input ${className}`} {...props} />
}
export function Checkbox(props) {
  return <input {...props} type="checkbox" className="choice-input" />
}
export function Radio(props) {
  return <input {...props} type="radio" className="choice-input" />
}
export function Switch(props) {
  return <input {...props} type="checkbox" role="switch" className="choice-input switch-input" />
}
export function FileUpload({ children, className = 'upload', ...props }) {
  return <label className={`file-upload ${className}`}>
    {children || <><Icon name="image" size={20} /><span>Adicionar imagem</span></>}
    <input {...props} type="file" />
  </label>
}
