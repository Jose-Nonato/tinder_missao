import { useId, useRef, useState } from 'react'
import { I18nProvider, Button, DialogTrigger, Popover, Dialog, Calendar, CalendarGrid, CalendarCell, Heading } from 'react-aria-components'
import { parseDate } from '@internationalized/date'
import Select from './Select'
import { TextInput } from './Controls'
import { birthDateBounds, dateError, formatDateInput, maskDateInput, parseDateInput } from './date'
import Icon from '../Icon'

export default function DatePicker({ label, helper, error, value = '', onChange, min = birthDateBounds().min, max = birthDateBounds().max, required, disabled, ...props }) {
  const id = useId()
  const input = useRef(null)
  const [draft, setDraft] = useState(null)
  const [invalid, setInvalid] = useState('')
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(() => parseDate(value || max))
  const text = draft ?? formatDateInput(value)
  const message = error || invalid
  const update = next => {
    setDraft(next)
    const validation = next || required ? dateError(next, { min, max }) : ''
    input.current?.setCustomValidity(validation)
    setInvalid('')
    onChange?.({ target: { value: parseDateInput(next) } })
  }
  const months = Array.from({ length: 12 }, (_, month) => new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date(2000, month, 1)))
  return <I18nProvider locale="pt-BR"><div className="field date-field">
    <label htmlFor={id}>{label}{required && <span className="field-required">Obrigatório</span>}</label>
    <div className="date-input-row">
      <TextInput {...props} ref={input} id={id} value={text} type="text" inputMode="numeric" placeholder="dd/mm/aaaa" maxLength={10}
        required={required} disabled={disabled} aria-invalid={Boolean(message)} aria-describedby={`${id}-help`}
        onChange={e => update(maskDateInput(e.target.value))}
        onInvalid={e => { e.preventDefault(); setInvalid(e.currentTarget.validationMessage); e.currentTarget.focus() }}
        onBlur={() => setInvalid(text || required ? dateError(text, { min, max }) : '')} />
      <DialogTrigger isOpen={open} onOpenChange={next => { if (next) setFocused(parseDate(parseDateInput(text) || max)); setOpen(next) }}>
        <Button className="date-trigger icon-btn" isDisabled={disabled} aria-label={`Abrir calendário: ${label}`}><Icon name="calendar" size={22} /></Button>
        <Popover className="form-popover date-popover" placement="bottom end">
          <Dialog aria-label={`Escolher ${label.toLowerCase()}`} className="calendar-dialog">
            <div className="calendar-title"><strong>{label}</strong><Button className="icon-btn" onPress={() => setOpen(false)} aria-label="Fechar calendário"><Icon name="x" size={20} /></Button></div>
            <Calendar aria-label={label} value={parseDateInput(text) ? parseDate(parseDateInput(text)) : null}
              minValue={parseDate(min)} maxValue={parseDate(max)} focusedValue={focused} onFocusChange={setFocused}
              onChange={date => { update(formatDateInput(date.toString())); setDraft(null); setOpen(false) }}>
              <div className="calendar-navigation">
                <Button slot="previous" className="icon-btn" aria-label="Mês anterior"><Icon name="chevron-left" size={20} /></Button>
                <Heading />
                <Button slot="next" className="icon-btn" aria-label="Próximo mês"><Icon name="chevron-right" size={20} /></Button>
              </div>
              <div className="calendar-jump">
                <Select aria-label="Mês" value={focused.month} onChange={e => setFocused(focused.set({ month: Number(e.target.value) }))}>
                  {months.map((month, i) => <option key={month} value={i + 1}>{month}</option>)}
                </Select>
                <Select aria-label="Ano" value={focused.year} onChange={e => setFocused(focused.set({ year: Number(e.target.value) }))}>
                  {Array.from({ length: Number(max.slice(0, 4)) - Number(min.slice(0, 4)) + 1 }, (_, i) => Number(max.slice(0, 4)) - i).map(year => <option key={year} value={year}>{year}</option>)}
                </Select>
              </div>
              <CalendarGrid weekdayStyle="short">{date => <CalendarCell date={date} />}</CalendarGrid>
            </Calendar>
            <p className="calendar-help muted">De {formatDateInput(min)} a {formatDateInput(max)}</p>
          </Dialog>
        </Popover>
      </DialogTrigger>
    </div>
    <small id={`${id}-help`} className={message ? 'error' : 'muted'}>{message || helper || 'Digite dia, mês e ano ou abra o calendário.'}</small>
  </div></I18nProvider>
}
