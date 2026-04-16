'use client'

import Script from 'next/script'
import { useEffect, useState } from 'react'
import { getAnalyticsConsent } from '@/components/ui/CookieBanner'

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

export function GoogleAnalytics({ nonce }: { nonce?: string }) {
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return getAnalyticsConsent()
  })

  useEffect(() => {
    function onAccept() {
      setEnabled(true)
    }
    window.addEventListener('cookie_consent_accepted', onAccept)
    return () => window.removeEventListener('cookie_consent_accepted', onAccept)
  }, [])

  if (!enabled || !GA_ID) return null

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
          gtag('config', '${GA_ID}');
        `}
      </Script>
    </>
  )
}
