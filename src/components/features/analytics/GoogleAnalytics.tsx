'use client'

import Script from 'next/script'
import { useEffect } from 'react'
import { getAnalyticsConsent } from '@/components/common/ui/CookieBanner'

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

export function GoogleAnalytics({ nonce }: { nonce?: string }) {
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
        strategy="afterInteractive"
        nonce={nonce}
      />
      <Script id="ga-init" strategy="afterInteractive" nonce={nonce}>
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('consent', 'default', {analytics_storage: 'denied'});
          ${getAnalyticsConsent() ? "gtag('consent', 'update', {analytics_storage: 'granted'});" : ''}
          gtag('config', '${GA_ID}');
        `}
      </Script>
    </>
  )
}
