import { test } from 'node:test'
import assert from 'node:assert/strict'
import { icebreakers } from '../src/components/icebreakers.js'

test('suggestions rank shared topics and never repeat private question text', () => {
  const rows = [{ topic: 'Economia', agree: true, text: 'SEGREDO' }, { topic: 'Educação', agree: true }, { topic: 'Economia', agree: false }, { topic: 'Saúde', agree: false }]
  const result = icebreakers(rows)
  assert.equal(result.length, 2)
  assert.match(result[0], /Educação/)
  assert.match(result[1], /Economia/)
  assert.ok(result.every(s => !/SEGREDO|Saúde/.test(s)))
})
test('one shared topic yields two editable openers; no agreement invents none', () => {
  assert.equal(icebreakers([{ topic: 'Economia', agree: true }]).length, 2)
  assert.deepEqual(icebreakers([]), [])
  assert.deepEqual(icebreakers([{ topic: 'Saúde', agree: false }]), [])
  assert.equal(icebreakers(['A', 'B', 'C', 'D'].map(topic => ({ topic, agree: true }))).length, 3)
})
