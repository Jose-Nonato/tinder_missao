import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { registrationPayload, TERMS_VERSION } from '../src/legal/consent.js'

test('registration requires explicit consent and sends the published version', () => {
  const form = { username: 'test', email: 'test@example.test', password: 'test-only' }
  for (const value of [false, undefined, null, 'true', 1]) {
    assert.throws(() => registrationPayload(form, value), { message: 'Para criar sua conta, você precisa aceitar os termos e consentir com o uso dos dados conforme a declaração de consentimento.' })
  }
  assert.deepEqual(registrationPayload(form, true), { ...form, accept_terms: true, terms_version: TERMS_VERSION })
  assert.equal(form.accept_terms, undefined)
})

test('front and API publish the same legal document version', () => {
  const backend = readFileSync(new URL('../../back/app/core/terms.py', import.meta.url), 'utf8')
  assert.ok(backend.includes(`TERMS_VERSION = "${TERMS_VERSION}"`))
})


test('draft 3 keeps only the donation pending and dates both documents', () => {
  const legal = readFileSync(new URL('../src/pages/Legal.jsx', import.meta.url), 'utf8')
  assert.equal(TERMS_VERSION, '2026-10-28-draft-3')
  const pending = legal.split('\n').filter(line => line.includes('[PREENCHER'))
  assert.equal(pending.length, 1)
  assert.match(pending[0], /Doações voluntárias/)
  assert.match(legal, /Data de vigência: 28\/10\/2026/)
  assert.match(legal, /Atualizado em 28\/10\/2026/)
  for (const text of ['Render', 'MongoDB', 'Supabase', 'fora do Brasil', 'em até 3 dias', 'aviso dentro do aplicativo', 'equipe de desenvolvimento da Ducks tech']) {
    assert.ok(legal.includes(text), `Missing decision: ${text}`)
  }
  const consent = readFileSync(new URL('../src/components/TermsConsent.jsx', import.meta.url), 'utf8')
  assert.match(consent, /seção de doações/)
  assert.match(consent, /revisão jurídica/)
})
