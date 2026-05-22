'use client'

import { useEffect } from 'react'
import { useBranding } from '@/lib/branding/BrandingProvider'

/**
 * Apply branding colors and styles to the page
 * Sets CSS custom properties for dynamic theming
 */
export function BrandingApplier() {
  const branding = useBranding()

  useEffect(() => {
    // Set CSS variables on root element
    const root = document.documentElement
    root.style.setProperty('--color-primary', branding.primary_color)
    root.style.setProperty('--color-secondary', branding.secondary_color)
    root.style.setProperty('--color-accent', branding.accent_color)

    // Update favicon dynamically if custom favicon exists
    if (branding.favicon_url) {
      const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement
      if (favicon) {
        favicon.href = branding.favicon_url
      } else {
        const newFavicon = document.createElement('link')
        newFavicon.rel = 'icon'
        newFavicon.href = branding.favicon_url
        document.head.appendChild(newFavicon)
      }
    }
  }, [branding])

  return null
}
