import { CalendarDate, parseDate } from '@internationalized/date'

export function parseDateInput(value) {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return ''
  const [day, month, year] = value.split('/')
  try { return parseDate(`${year}-${month}-${day}`).toString() } catch { return '' }
}
export function formatDateInput(value) {
  if (!value) return ''
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}
export function maskDateInput(value) {
  return value.replace(/\D/g, '').slice(0, 8).replace(/^(\d{2})(\d)/, '$1/$2').replace(/^(\d{2}\/\d{2})(\d)/, '$1/$2')
}
export function birthDateBounds(now = new Date()) {
  const today = new CalendarDate(now.getFullYear(), now.getMonth() + 1, now.getDate())
  return { min: today.subtract({ years: 120 }).toString(), max: today.subtract({ years: 18 }).toString() }
}
export function dateError(text, { min, max }) {
  const iso = parseDateInput(text)
  if (!iso) return 'Informe uma data válida no formato dd/mm/aaaa.'
  if (iso < min || iso > max) return `Escolha uma data entre ${formatDateInput(min)} e ${formatDateInput(max)}.`
  return ''
}
