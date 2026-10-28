import { test } from 'node:test'
import assert from 'node:assert/strict'
import { topicAgreement } from '../src/components/topicAgreement.js'

test('topic counts stay unweighted; API total is not recomputed', () => {
  const input = [{ topic: 'Estado', agree: true, weight: 5 }, { topic: 'Estado', agree: false, weight: 1 }, { topic: 'Economia', agree: true, weight: 2 }, { topic: 'Educação', agree: false, weight: 3 }]
  const before = structuredClone(input)
  assert.deepEqual(topicAgreement(input), [
    { topic: 'Economia', agreements: 1, total: 1, percent: 100 },
    { topic: 'Estado', agreements: 1, total: 2, percent: 50 },
    { topic: 'Educação', agreements: 0, total: 1, percent: 0 },
  ])
  assert.deepEqual(input, before)
  assert.deepEqual(topicAgreement(), [])
})
