// Substituições feitas exclusivamente no build; nenhum cache de dados em runtime.
const CACHE = 'voto-a-dois-shell-__CACHE_VERSION__'
const SHELL = __SHELL_FILES__
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)))
})
// Sem skipWaiting: abas abertas continuam usando sua versão até serem fechadas.
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys
    .filter(key => (key.startsWith('voto-a-dois-shell-') || key.startsWith('missao-shell-')) && key !== CACHE)
    .map(key => caches.delete(key)))))
})
self.addEventListener('fetch', event => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return
  // Rotas da API e uploads nunca são interceptados, nem quando abertos como página.
  if (/^\/(api|uploads)(\/|$)/.test(url.pathname)) return
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.open(CACHE).then(cache => cache.match('/offline.html'))))
  } else if (!url.search && SHELL.includes(url.pathname)) {
    event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(url.pathname)) || fetch(request)))
  }
})
