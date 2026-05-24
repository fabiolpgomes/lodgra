export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { BrazilLanding } from '@/components/marketing/regions/BrazilLanding'
import { EuropeLanding } from '@/components/marketing/regions/EuropeLanding'
import { seoMetadata, ogDefaults, twitterDefaults } from '@/lib/seo/metadata'
import { generateOrganizationJsonLd, generateWebsiteJsonLd } from '@/lib/seo/jsonld'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lodgra.io'

export const metadata: Metadata = {
  title: seoMetadata.home.title,
  description: seoMetadata.home.description,
  keywords: seoMetadata.home.keywords,
  robots: { index: true, follow: true },
  openGraph: {
    title: seoMetadata.home.title,
    description: seoMetadata.home.description,
    url: 'https://lodgra.io',
    ...ogDefaults,
  },
  twitter: {
    ...twitterDefaults,
    title: seoMetadata.home.title,
    description: seoMetadata.home.description,
  },
  // JSON-LD schemas (WebSite + Organization) are validated and ready
  // Can be injected via script tag in layout when Next.js metadata.jsonLd support is available
}

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  const locale = await getLocale()

  // Lógica de Segmentação de Marketing por Região
  // 1. Brasil: Modelo agressivo focado em ROI e comparação direta.
  if (locale === 'pt-BR') {
    return <BrazilLanding />
  }

  // 2. Europa (Espanha, etc): Modelo clean/premium universal.
  if (locale === 'es') {
    return <EuropeLanding locale={locale} />
  }

  // 3. USA / International: Placeholder ou modelo Europa por enquanto.
  if (locale === 'en-US') {
    // Por enquanto usamos o EuropeLanding para tráfego internacional/USA
    // Futuramente aqui entrará o USALanding.tsx
    return <EuropeLanding locale="en-US" />
  }

  // Default: Modelo Brasil ou Europa? 
  // O usuário disse que atua no Brasil agora, então mantemos Brasil como fallback se quiser,
  // ou Europa como fallback internacional. Vamos de internacional por segurança.
  return <EuropeLanding locale="en-US" />
}

