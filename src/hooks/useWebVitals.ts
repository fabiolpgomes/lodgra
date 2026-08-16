import { useEffect } from 'react'
import { setupWebVitalsMonitoring } from '@/lib/vitals/web-vitals'

/**
 * Hook para monitorar Core Web Vitals em produção
 * Use no root layout
 */
export function useWebVitals() {
  useEffect(() => {
    setupWebVitalsMonitoring()
  }, [])
}
