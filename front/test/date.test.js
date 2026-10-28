import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseDateInput, formatDateInput, maskDateInput, birthDateBounds, dateError } from '../src/components/form/date.js'

test('Brazilian dates round trip without timezone conversion', () => {
  assert.equal(parseDateInput('29/02/2000'), '2000-02-29')
  assert.equal(formatDateInput('2000-02-29'), '29/02/2000')
  for (const value of ['29/02/2001', '31/04/2000', '00/01/2000', '01/13/2000', '1/1/2000', '']) assert.equal(parseDateInput(value), '')
  assert.equal(maskDateInput('29022000'), '29/02/2000')
  assert.equal(maskDateInput('29/02/2000'), '29/02/2000')
})
test('birth limits include the eighteenth birthday and 120 years', () => {
  const bounds = birthDateBounds(new Date(2026, 9, 28))
  assert.deepEqual(bounds, { min: '1906-10-28', max: '2008-10-28' })
  assert.equal(dateError('28/10/2008', bounds), '')
  assert.notEqual(dateError('29/10/2008', bounds), '')
  assert.equal(dateError('28/10/1906', bounds), '')
  assert.notEqual(dateError('27/10/1906', bounds), '')
  assert.notEqual(dateError('31/02/2000', bounds), '')
  assert.deepEqual(birthDateBounds(new Date(2024, 1, 29)), { min: '1904-02-29', max: '2006-02-28' })
})
