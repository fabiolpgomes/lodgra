'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker?.getRegistrations()
        .then((registrations) => Promise.all(registrations.map((reg) => reg.unregister())))
        .then(() => caches?.keys?.())
        .then((keys) => keys && Promise.all(keys.map((key) => caches.delete(key))))
        .catch(() => {})
      return
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        console.log('[PWA] Service worker registered:', reg.scope)
      }).catch((err) => {
        console.warn('[PWA] Service worker registration failed:', err)
      })
    }
  }, [])

  return null
}
