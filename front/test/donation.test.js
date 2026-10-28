import { test } from 'node:test'
import assert from 'node:assert/strict'
import { donationConfig } from '../src/legal/donation.js'

test('donation stays pending without configured payment details', () => {
  assert.deepEqual(donationConfig({}), { donationUrl: '', pixKey: '', qrUrl: '' })
  assert.deepEqual(donationConfig({ VITE_DONATION_PIX_KEY: '  ' }), { donationUrl: '', pixKey: '', qrUrl: '' })
})
test('donation accepts independent Pix and safe QR configuration', () => {
  assert.deepEqual(donationConfig({ VITE_DONATION_PIX_KEY: ' key ', VITE_DONATION_QR_URL: '/qr.png' }), { donationUrl: '', pixKey: 'key', qrUrl: '/qr.png' })
  assert.equal(donationConfig({ VITE_DONATION_QR_URL: 'https://example.test/qr.png' }).qrUrl, 'https://example.test/qr.png')
  for (const qr of ['javascript:alert(1)', 'data:image/svg+xml,test', '//example.test/qr', 'bad-url']) {
    assert.equal(donationConfig({ VITE_DONATION_QR_URL: qr }).qrUrl, '')
  }
})

test('payment URL accepts HTTPS and coexists with QR and Pix', () => {
  assert.deepEqual(donationConfig({
    VITE_DONATION_URL: ' https://example.com/doar ',
    VITE_DONATION_QR_URL: '/qr.png',
    VITE_DONATION_PIX_KEY: ' key ',
  }), { donationUrl: 'https://example.com/doar', pixKey: 'key', qrUrl: '/qr.png' })
  assert.equal(donationConfig({ VITE_DONATION_URL: 'https://example.com/doar' }).donationUrl, 'https://example.com/doar')
})
test('invalid payment URLs are omitted and warn only in development', t => {
  const warn = t.mock.method(console, 'warn', () => {})
  for (const value of ['http://example.com', 'javascript:alert(1)', 'data:text/html,test', '//example.com', '/doar', 'bad-url', 'https://']) {
    assert.equal(donationConfig({ VITE_DONATION_URL: value, DEV: true }).donationUrl, '')
  }
  assert.equal(warn.mock.callCount(), 7)
  donationConfig({ VITE_DONATION_URL: 'http://example.com', DEV: false })
  donationConfig({ VITE_DONATION_URL: '  ', DEV: true })
  assert.equal(warn.mock.callCount(), 7)
  assert.deepEqual(donationConfig({ VITE_DONATION_URL: 'invalid', VITE_DONATION_PIX_KEY: 'key', VITE_DONATION_QR_URL: '/qr.png' }), {
    donationUrl: '', pixKey: 'key', qrUrl: '/qr.png',
  })
})
