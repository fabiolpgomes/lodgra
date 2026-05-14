const CACHE_NAME = 'lodgra-v1'
const CACHE_ASSETS = 'lodgra-assets-v1'

const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#1E3A8A">
  <title>Sem Ligação — Lodgra</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui; background: #f9fafb; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .container { text-align: center; max-width: 400px; }
    .icon { font-size: 4rem; margin-bottom: 1.5rem; }
    h1 { font-size: 1.5rem; font-weight: 700; color: #111; margin-bottom: 1rem; }
    p { color: #666; margin-bottom: 1.5rem; }
    button { padding: 12px 24px; background: #1f2937; color: white; border: none; border-radius: 6px; font-weight: 500; cursor: pointer; }
    button:hover { background: #111; }
  </style>
</head>
<body>
  <div class="container">
    <div style="font-size: 2rem; font-weight: 700; color: #1e3a8a; margin-bottom: 1rem;">Lodgra</div>
    <div class="icon">📡</div>
    <h1>Sem Ligação</h1>
    <p>Não foi possível ligar ao servidor. Verifique a sua ligação à internet e tente novamente.</p>
    <button onclick="window.location.reload()">Tentar novamente</button>
  </div>
</body>
</html>`

const PRECACHE_URLS = [
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png',
  '/icons/apple-touch-icon.png',
  '/favicon.svg',
]

// Install: precache offline page and key assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
    ])
  )
  self.skipWaiting()
})

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME && key !== CACHE_ASSETS).map((key) => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

// Fetch: network-first for pages, cache-first for assets
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return

  // Skip API routes and auth
  const url = new URL(event.request.url)
  if (url.pathname.startsWith('/api/')) return

  const isAsset = /\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)(\?.*)?$/i.test(url.pathname)

  if (isAsset) {
    // Cache-first strategy for static assets
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_ASSETS).then((cache) => cache.put(event.request, clone))
          }
          return response
        }).catch(() => new Response('Asset offline', { status: 503 }))
      })
    )
  } else {
    // Network-first strategy for pages and API responses
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful page responses
          if (response.ok && response.type === 'basic') {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          }
          return response
        })
        .catch(() =>
          caches.match(event.request).then((cached) => {
            if (cached) return cached
            // For navigation requests, show offline page
            if (event.request.mode === 'navigate') {
              return new Response(OFFLINE_HTML, {
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
              })
            }
            return new Response('Offline', { status: 503 })
          })
        )
    )
  }
})
