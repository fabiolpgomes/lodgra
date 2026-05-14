const CACHE_NAME = 'lodgra-v1'
const CACHE_ASSETS = 'lodgra-assets-v1'

const PRECACHE_URLS = [
  '/offline.html',
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
              return caches.match('/offline.html')
            }
            return new Response('Offline', { status: 503 })
          })
        )
    )
  }
})
