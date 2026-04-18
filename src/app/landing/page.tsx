import { notFound } from 'next/navigation'
import { LandingPageClient } from '@/components/landing/LandingPageClient'

interface PageProps {
  searchParams: Promise<{ locale?: string }>
}

// Data loader - static content
async function getLandingPageContent(locale: 'pt-BR' | 'en-US' | 'es') {
  try {
    let content
    switch (locale) {
      case 'pt-BR':
        content = await import('../../../public/locales/pt-BR/landing.json').then(m => m.default)
        break
      case 'es':
        content = await import('../../../public/locales/es/landing.json').then(m => m.default)
        break
      case 'en-US':
      default:
        content = await import('../../../public/locales/en-US/landing.json').then(m => m.default)
    }
    return content
  } catch (error) {
    console.error(`Failed to load content for locale ${locale}:`, error)
    return null
  }
}

export async function generateMetadata() {
  return {
    title: 'Lodgra - Turn Your Property Into Revenue',
    description:
      'Transform your properties into high-performance financial assets with intelligent automation.',
    openGraph: {
      title: 'Lodgra - Host Smarter. Earn More.',
      description:
        'Intelligent property management for short-term rental success.',
      url: 'https://lodgra.io',
      type: 'website',
      images: [
        {
          url: 'https://lodgra.io/og-image.png',
          width: 1200,
          height: 630,
        },
      ],
    },
  }
}

export default async function LandingPage({ searchParams }: PageProps) {
  const params = await searchParams
  const locale = (params.locale as any) || 'en-US'

  // Validate locale
  const validLocales = ['pt-BR', 'en-US', 'es']
  if (!validLocales.includes(locale)) {
    notFound()
  }

  const content = await getLandingPageContent(locale as any)

  if (!content) {
    notFound()
  }

  return (
    <main className="bg-white">
      <LandingPageClient locale={locale as any} content={content} />
    </main>
  )
}
