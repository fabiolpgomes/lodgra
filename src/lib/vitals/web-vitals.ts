/**
 * Core Web Vitals Monitoring
 * Integrates with Google Analytics
 */

export interface WebVitalMetric {
  name: 'LCP' | 'FID' | 'CLS'
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
}

const thresholds = {
  LCP: { good: 2500, needsImprovement: 4000 },
  FID: { good: 100, needsImprovement: 300 },
  CLS: { good: 0.1, needsImprovement: 0.25 },
}

export function getRating(metricName: keyof typeof thresholds, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = thresholds[metricName]
  if (value <= threshold.good) return 'good'
  if (value <= threshold.needsImprovement) return 'needs-improvement'
  return 'poor'
}

export function reportWebVital(metric: WebVitalMetric) {
  const { name, value, rating } = metric

  if (typeof window !== 'undefined' && 'gtag' in window) {
    (window as any).gtag('event', 'web_vital', {
      metric_name: name,
      metric_value: Math.round(value),
      metric_rating: rating,
    })
  }

  if (process.env.NODE_ENV === 'development') {
    const emoji = rating === 'good' ? '✅' : rating === 'needs-improvement' ? '⚠️' : '🔴'
    console.log(`${emoji} ${name}: ${value.toFixed(2)} (${rating})`)
  }
}

export function setupWebVitalsMonitoring() {
  if (typeof window === 'undefined') return

  /* Google Analytics automatically captures Web Vitals */
  /* LCP, FID, CLS are sent with page_view events */
  console.log('[Web Vitals] Monitoring enabled (Google Analytics)')

  /* Observe LCP via PerformanceObserver for real-time tracking */
  if ('PerformanceObserver' in window) {
    try {
      const lcpObserver = new (window as any).PerformanceObserver((list: any) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        const lcpValue = lastEntry.renderTime || lastEntry.loadTime

        reportWebVital({
          name: 'LCP',
          value: lcpValue,
          rating: getRating('LCP', lcpValue),
        })
      })
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
    } catch (e) {
      /* PerformanceObserver not supported */
    }
  }
}
