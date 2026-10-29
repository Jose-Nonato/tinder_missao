import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

export function staticPwa() {
  return {
    name: 'voto-a-dois-static-pwa',
    apply: 'build',
    transformIndexHtml() {
      return [{ tag: 'link', attrs: { rel: 'manifest', href: '/manifest.webmanifest' }, injectTo: 'head' }]
    },
    generateBundle(_, bundle) {
      const read = path => readFileSync(new URL(path, import.meta.url), 'utf8')
      const tokens = read('../src/styles/tokens.css')
      const color = name => tokens.match(new RegExp(`--${name}:\\s*([^;]+)`))[1]
      const manifest = JSON.stringify({
        id: '/', name: 'Missão a Dois', short_name: 'Missão a Dois', lang: 'pt-BR',
        description: 'Missão a Dois: conexões por afinidade, em um projeto independente e gratuito.',
        start_url: '/', scope: '/', display: 'standalone',
        theme_color: color('c-brand'), background_color: color('c-bg'),
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      }, null, 2)
      const offline = read('./offline.html').replace('/* DESIGN_TOKENS */', tokens)
      this.emitFile({ type: 'asset', fileName: 'manifest.webmanifest', source: manifest })
      this.emitFile({ type: 'asset', fileName: 'offline.html', source: offline })
      const files = ['/index.html', '/offline.html', '/manifest.webmanifest', '/favicon.png', '/icons/logo.webp', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/maskable-512.png', '/icons/apple-touch-icon.png',
        ...Object.keys(bundle).filter(name => name.startsWith('assets/')).map(name => `/${name}`)]
      const hash = createHash('sha256').update(JSON.stringify(files) + offline + manifest + read('./sw.js') + read('../index.html'))
      for (const file of files.filter(file => file.startsWith('/icons/') || file === '/favicon.png')) {
        hash.update(readFileSync(new URL(`../public${file}`, import.meta.url)))
      }
      const version = hash.digest('hex').slice(0, 16)
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: read('./sw.js').replace('__CACHE_VERSION__', version).replace('__SHELL_FILES__', JSON.stringify(files)) })
    },
  }
}
