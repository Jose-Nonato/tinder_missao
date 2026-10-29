import { test } from 'node:test'
import assert from 'node:assert/strict'
import { screenFor, canGoBack } from '../src/navigation/screens.js'

test('detail screens have logical parents even on a direct entry', () => {
  for (const [path, parent] of [
    ['/discover/person-1', '/discover'], ['/matches/person-1', '/matches'],
    ['/messages/person-1', '/messages'], ['/profile/about', '/profile'],
    ['/questionnaire/Q01', '/questionnaire'], ['/questionnaire', '/profile'],
    ['/admin/reports/abc', '/admin/reports'], ['/termos', '/register'],
    ['/register/privacidade', '/register'], ['/profile/preview', '/profile'],
    ['/admin/password-resets', '/profile'], ['/admin/questions/new', '/admin/questions'],
  ]) assert.equal(screenFor(path).parent, parent, path)
})
test('only root destinations show bottom navigation', () => {
  for (const path of ['/discover', '/matches', '/messages', '/profile', '/']) assert.equal(screenFor(path).root, true)
  for (const path of ['/profile/photos', '/messages/a', '/questionnaire', '/blocked', '/admin/reports/a']) assert.equal(screenFor(path).root, false)
})
test('back never leaves the app on a fresh deep link', () => {
  for (const state of [null, {}, { idx: 0 }, { idx: -1 }]) assert.equal(canGoBack(state), false)
  assert.equal(canGoBack({ idx: 1 }), true)
})
