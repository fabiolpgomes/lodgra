'use client'

import { useEffect, useRef } from 'react'
import { getAnalyticsConsent } from '@/components/common/ui/CookieBanner'

const ROOT_HOSTS = new Set(['lodgra.io', 'www.lodgra.io', 'homestay.pt', 'www.homestay.pt'])

function resolveOrgSlug(explicitSlug?: string | null) {
  if (explicitSlug) return explicitSlug
  if (typeof window === 'undefined') return null

  const hostname = window.location.hostname.toLowerCase()
  if (!hostname || ROOT_HOSTS.has(hostname) || hostname.endsWith('.vercel.app')) {
    return null
  }

  if (hostname.endsWith('.lodgra.io') || hostname.endsWith('.homestay.pt')) {
    const [subdomain] = hostname.split('.')
    return subdomain && subdomain !== 'www' ? subdomain : null
  }

  return null
}

type Props = {
  organizationSlug?: string | null
  pagePath?: string
}

export function OrganizationTrafficTracker({ organizationSlug, pagePath }: Props) {
  const hasSent = useRef(false)

  useEffect(() => {
    const send = () => {
      if (hasSent.current || !getAnalyticsConsent()) return

      const slug = resolveOrgSlug(organizationSlug)
      if (!slug) return

      hasSent.current = true

      const payload = {
        organization_slug: slug,
        path: pagePath || window.location.pathname,
        event_name: 'page_view',
        hostname: window.location.hostname,
        referrer: document.referrer || null,
      }

      const body = JSON.stringify(payload)

      if (navigator.sendBeacon) {
        const success = navigator.sendBeacon(
          '/api/analytics/traffic',
          new Blob([body], { type: 'application/json' }),
        )
        if (success) return
      }

      void fetch('/api/analytics/traffic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      })
    }

    send()
    window.addEventListener('cookie_consent_accepted', send)
    return () => window.removeEventListener('cookie_consent_accepted', send)
  }, [organizationSlug, pagePath])

  return null
}
