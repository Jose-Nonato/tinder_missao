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
  return { pixKey, qrUrl }
}
