'use client'

import Script from 'next/script'
import { useEffect } from 'react'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

export interface GoogleAnalyticsProps {
  gaId?: string | null
  nonce?: string
}

export function GoogleAnalytics({ gaId, nonce }: GoogleAnalyticsProps) {
  // Use provided GA ID, fallback to env variable
  const GA_ID = gaId || process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

  useEffect(() => {
    function onAccept() {
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('consent', 'update', { analytics_storage: 'granted' })
      }
    }
    window.addEventListener('cookie_consent_accepted', onAccept)
    return () => window.removeEventListener('cookie_consent_accepted', onAccept)
  }, [])

  if (!GA_ID) return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="beforeInteractive"
        nonce={nonce}
      />
      <Script id="ga-init" strategy="beforeInteractive" nonce={nonce}>
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('consent', 'default', {analytics_storage: 'denied'});
          gtag('config', '${GA_ID}');
        `}
      </Script>
    </>
  )
}
