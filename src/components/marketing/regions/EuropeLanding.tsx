import React from 'react'
import { LandingPageClient } from '@/components/landing/LandingPageClient'

interface EuropeLandingProps {
  locale: 'es' | 'en-US'
}

// Textos por idioma; os preços vêm de PLAN_PRICES (src/lib/billing/plans.ts)
async function getLandingPageContent(locale: string) {
  try {
    let content
    switch (locale) {
      case 'es':
        content = await import('../../../../public/locales/es/landing.json').then(m => m.default)
        break
      case 'en-US':
      default:
        content = await import('../../../../public/locales/en-US/landing.json').then(m => m.default)
    }
    return content
  } catch (error) {
    console.error(`Failed to load content for locale ${locale}:`, error)
    return null
  }
}

export const EuropeLanding = async ({ locale }: EuropeLandingProps) => {
  const content = await getLandingPageContent(locale)

  if (!content) {
    return <div>Error loading content</div>
  }

  return (
    <main className="bg-white">
      {/* We use the generic LandingPageClient which represent the standard/clean model */}
      <LandingPageClient content={content} currency="eur" locale={locale} />
    </main>
  )
}
