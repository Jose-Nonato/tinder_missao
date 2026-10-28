export function donationConfig(env) {
  const pixKey = (env.VITE_DONATION_PIX_KEY ?? '').trim()
  const candidate = (env.VITE_DONATION_QR_URL ?? '').trim()
  let qrUrl = ''
  if (/^\/(?!\/)/.test(candidate)) qrUrl = candidate
  else {
    try {
      const url = new URL(candidate)
      if (url.protocol === 'https:' || url.protocol === 'http:') qrUrl = url.href
    } catch { /* Configuração ausente ou inválida: não publica uma imagem quebrada. */ }
  }
  const paymentCandidate = (env.VITE_DONATION_URL ?? '').trim()
  let donationUrl = ''
  try {
    const url = new URL(paymentCandidate)
    if (url.protocol === 'https:') donationUrl = url.href
  } catch { /* Link ausente ou inválido: não oferece pagamento externo. */ }
  if (paymentCandidate && !donationUrl && env.DEV) {
    console.warn('VITE_DONATION_URL inválida: use um link de pagamento HTTPS.')
  }
  return { donationUrl, pixKey, qrUrl }
}
