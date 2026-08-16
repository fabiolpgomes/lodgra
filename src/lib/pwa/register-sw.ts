/**
 * PWA Service Worker Registration
 * Call this in useEffect on app mount
 */

export async function registerServiceWorker() {
  if (typeof window === 'undefined') return

  if (!('serviceWorker' in navigator)) {
    console.log('[PWA] Service Worker not supported')
    return
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    })

    console.log('[PWA] Service Worker registered:', registration)

    /* Check for updates periodically */
    setInterval(() => {
      registration.update()
    }, 60000) /* Every minute */

    return registration
  } catch (error) {
    console.warn('[PWA] Service Worker registration failed:', error)
  }
}

/* Unregister (for development/cleanup) */
export async function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations()
    for (const registration of registrations) {
      await registration.unregister()
    }
    console.log('[PWA] Service Worker unregistered')
  }
}
