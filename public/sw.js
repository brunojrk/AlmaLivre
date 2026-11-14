// Service worker simples: deixa o app abrir mesmo sem internet.
// Páginas: rede primeiro, cache como reserva. Arquivos do app: cache primeiro.
const CACHE = 'almalivre-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return // planilha/Google: nunca em cache

  const guardar = (resp) => {
    if (resp.ok) {
      const copia = resp.clone()
      caches.open(CACHE).then((c) => c.put(req, copia))
    }
    return resp
  }

  if (url.pathname.includes('/assets/')) {
    e.respondWith(caches.match(req).then((r) => r || fetch(req).then(guardar)))
  } else {
    e.respondWith(fetch(req).then(guardar).catch(() => caches.match(req).then((r) => r || caches.match('./'))))
  }
})
