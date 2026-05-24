import { notFound } from 'next/navigation'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { LandingPageClient } from '@/components/landing/LandingPageClient'

// Data loader - static content
async function getLandingPageContent() {
  try {
    const filePath = join(process.cwd(), 'public', 'locales', 'pt-BR', 'landing.json')
    const fileContent = await readFile(filePath, 'utf-8')
    return JSON.parse(fileContent)
  } catch (error) {
    console.error('Failed to load content for locale pt-BR:', error)
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

export default async function LandingPage() {
  const content = await getLandingPageContent()

  if (!content) {
    notFound()
  }

  return (
    <main className="bg-white">
      <LandingPageClient content={content} />
    </main>
  )
}
