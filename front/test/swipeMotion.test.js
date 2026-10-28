import test from 'node:test'
import assert from 'node:assert/strict'
import { swipeDirection, springStep } from '../src/components/swipeMotion.js'
test('distance and recent velocity determine direction; small flicks stay put', () => {
  assert.equal(swipeDirection(120, 0), 'like')
  assert.equal(swipeDirection(-55, -0.8), 'pass')
  assert.equal(swipeDirection(20, 2), null)
  assert.equal(swipeDirection(70, 0.1), null)
  assert.equal(swipeDirection(70, -0.9), null)
})
test('spring converges at both 60 and 120 Hz', () => {
  for (const dt of [1 / 60, 1 / 120]) {
    let state = { x: 100, v: 0 }
    for (let t = 0; t < 1.5; t += dt) state = springStep(state, dt)
    assert.ok(Math.abs(state.x) < 0.1)
    assert.ok(Math.abs(state.v) < 0.1)
  }
})
