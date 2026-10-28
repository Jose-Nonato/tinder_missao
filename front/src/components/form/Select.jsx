import { Children, useId } from 'react'
import { Select as AriaSelect, Label, Button, SelectValue, Popover, ListBox, ListBoxItem, Text, FieldError } from 'react-aria-components'
import Icon from '../Icon'

// Accepts the existing option/value/onChange contract; the API payload stays unchanged.
export default function Select({ label, helper, error, children, value, onChange, required, disabled, placeholder = 'Selecione', id, ...props }) {
  const generatedId = useId()
  const options = Children.toArray(children).filter(Boolean)
  const empty = options.find(o => String(o.props.value) === '' && o.props.disabled)
  const items = options.filter(o => o !== empty).map(o => ({ id: String(o.props.value), text: Children.toArray(o.props.children).join(''), disabled: o.props.disabled }))
  return <AriaSelect {...props} className="field app-select" selectedKey={value === '' && empty ? null : String(value ?? '')}
    onSelectionChange={key => onChange?.({ target: { value: String(key) } })}
    isRequired={required} isDisabled={disabled} isInvalid={Boolean(error)} validationBehavior="native"
    placeholder={empty?.props.children || placeholder} disabledKeys={items.filter(o => o.disabled).map(o => o.id)}>
    {label && <Label>{label}{required && <span className="field-required">Obrigatório</span>}</Label>}
    <Button id={id || generatedId} className="select-trigger"><SelectValue /><Icon name="chevron-down" size={20} /></Button>
    <Popover className="form-popover select-popover" placement="bottom start">
      <ListBox className="form-listbox" items={items}>{item => <ListBoxItem className="form-option" id={item.id} textValue={item.text}>
        {({ isSelected }) => <><span>{item.text}</span>{isSelected && <Icon name="check" size={18} />}</>}
      </ListBoxItem>}</ListBox>
    </Popover>
    {helper && <Text slot="description" className="muted">{helper}</Text>}
    <FieldError className="error">{error || 'Selecione uma opção.'}</FieldError>
  </AriaSelect>
}
