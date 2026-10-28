import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const source = () => readFileSync(new URL('../pwa/sw.js', import.meta.url), 'utf8').replace('__CACHE_VERSION__', 'test').replace('__SHELL_FILES__', JSON.stringify(['/offline.html', '/assets/app.js']))
function worker() {
  const handlers = {}, calls = []
  const cache = { addAll: async files => calls.push(files), match: async key => key === '/offline.html' ? 'offline' : null }
  vm.runInNewContext(source(), { self: { location: { origin: 'https://example.test' }, addEventListener: (name, fn) => handlers[name] = fn }, caches: { open: async () => cache, keys: async () => ['other-app', 'missao-shell-old'], delete: async key => calls.push(key) }, fetch: async () => { throw Error('offline') }, URL })
  return { handlers, calls }
}
test('SW never intercepts API, uploads, other origins, writes or arbitrary assets', () => {
  const { handlers } = worker()
  for (const [url, method, mode] of [['/api/users/me/answers','GET','navigate'], ['/api/conversations','GET','cors'], ['/uploads/photo.png','GET','cors'], ['https://other.test/assets/app.js','GET','cors'], ['/assets/app.js','POST','cors'], ['/assets/unknown.js','GET','cors']]) {
    handlers.fetch({ request: { url: new URL(url, 'https://example.test').href, method, mode }, respondWith: () => assert.fail(url) })
  }
})
test('SW precaches only explicit shell and offline navigations get safe fallback', async () => {
  const { handlers, calls } = worker()
  let job
  handlers.install({ waitUntil: p => job = p }); await job
  assert.deepEqual(Array.from(calls[0]), ['/offline.html', '/assets/app.js'])
  handlers.fetch({ request: { url: 'https://example.test/messages/private', method: 'GET', mode: 'navigate' }, respondWith: p => job = p })
  assert.equal(await job, 'offline')
  handlers.activate({ waitUntil: p => job = p }); await job
  assert.equal(calls[1], 'missao-shell-old')
  assert.equal(calls.length, 2)
})
