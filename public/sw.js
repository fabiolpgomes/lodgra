/* Lodgra PWA Service Worker - Offline Support */
const CACHE_NAME = 'lodgra-v2'
const URLS_TO_CACHE = [
  '/',
  '/offline',
  '/manifest.json',
]

/* Install event - cache essential resources */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(URLS_TO_CACHE).catch(() => {
        /* Gracefully handle missing URLs */
      })
    }).then(() => self.skipWaiting())
  )
})

/* Activate event - clean up old caches */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

/* Fetch event - network first, fallback to cache */
self.addEventListener('fetch', (event) => {
  const { request } = event

  /* Skip non-GET requests */
  if (request.method !== 'GET') return

  /* Only handle same-origin requests */
  if (new URL(request.url).origin !== self.location.origin) return

  /* Skip API calls (let them fail gracefully) */
  if (request.url.includes('/api/')) {
    return event.respondWith(fetch(request).catch(() => new Response(null, { status: 503 })))
  }

  /* Network-first strategy for HTML pages */
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (!response || response.status === 404) return response

        if (response.ok) {
          const responseToCache = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache)
          })
        }

        return response
      })
      .catch(() => {
        /* Fallback to cache */
        return caches.match(request).then((response) => {
          return response || new Response('Offline - página não disponível', { status: 503 })
        })
      })
  )
})
