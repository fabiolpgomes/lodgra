import { useEffect } from 'react'
import { registerServiceWorker } from '@/lib/pwa/register-sw'

/**
 * Hook para registrar Service Worker na app mount
 * Use no root layout ou na página principal
 */
export function usePWA() {
  useEffect(() => {
    registerServiceWorker()
  }, [])
}
