import React from 'react'
import { LandingPageClient } from '@/components/landing/LandingPageClient'

interface EuropeLandingProps {
  locale: 'pt' | 'es' | 'en-US'
}

// Helper to load content - similarity to src/app/landing/page.tsx
async function getLandingPageContent(locale: string) {
  try {
    let content
    switch (locale) {
      case 'pt':
        // Portugal version
        content = await import('../../../../public/locales/pt-BR/landing.json').then(m => m.default)
        break
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
      <LandingPageClient locale={locale} content={content} />
    </main>
  )
}
