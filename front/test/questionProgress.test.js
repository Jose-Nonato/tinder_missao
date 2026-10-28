import { test } from 'node:test'
import assert from 'node:assert/strict'
import { firstPending } from '../src/pages/questionProgress.js'

test('resume first active unanswered question, including no-opinion as answered', () => {
  const qs = [{ code: 'a' }, { code: 'b' }, { code: 'c' }]
  assert.equal(firstPending(qs, {}), 0)
  assert.equal(firstPending(qs, { a: 'NO_OPINION', c: 'x', retired: 'x' }), 1)
  assert.equal(firstPending(qs, { a: 'x', b: 'x', c: 'x' }), 0)
  assert.equal(firstPending([], {}), 0)
})
