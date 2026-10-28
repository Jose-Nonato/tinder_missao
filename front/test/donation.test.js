import { test } from 'node:test'
import assert from 'node:assert/strict'
import { donationConfig } from '../src/legal/donation.js'

test('donation stays pending without configured payment details', () => {
  assert.deepEqual(donationConfig({}), { pixKey: '', qrUrl: '' })
  assert.deepEqual(donationConfig({ VITE_DONATION_PIX_KEY: '  ' }), { pixKey: '', qrUrl: '' })
})
test('donation accepts independent Pix and safe QR configuration', () => {
  assert.deepEqual(donationConfig({ VITE_DONATION_PIX_KEY: ' key ', VITE_DONATION_QR_URL: '/qr.png' }), { pixKey: 'key', qrUrl: '/qr.png' })
  assert.equal(donationConfig({ VITE_DONATION_QR_URL: 'https://example.test/qr.png' }).qrUrl, 'https://example.test/qr.png')
  for (const qr of ['javascript:alert(1)', 'data:image/svg+xml,test', '//example.test/qr', 'bad-url']) {
    assert.equal(donationConfig({ VITE_DONATION_QR_URL: qr }).qrUrl, '')
  }
})
