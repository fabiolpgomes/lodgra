import type { Metadata } from 'next'
import { BrazilLanding } from '@/components/marketing/regions/BrazilLanding'
import { seoMetadata, twitterDefaults } from '@/lib/seo/metadata'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lodgra.io'
const title = 'Lodgra — Gestão Profissional de Aluguel por Temporada'
const description = 'Sistema brasileiro para gestão profissional de aluguel por temporada. Controle reservas, limpeza, pagamentos e lucro dos seus imóveis em uma plataforma simples.'

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title,
  description,
  keywords: [
    'gestão de aluguel por temporada',
    'software para Airbnb',
    'gestão de imóveis',
    'reservas diretas',
    'controle de limpeza',
    'Lodgra Brasil',
    ...seoMetadata.home.keywords.split(',').map(keyword => keyword.trim()),
  ],
  robots: { index: true, follow: true },
  alternates: {
    canonical: baseUrl,
    languages: {
      'pt-BR': baseUrl,
      'x-default': baseUrl,
    },
  },
  openGraph: {
    title,
    description,
    url: baseUrl,
    siteName: 'Lodgra',
    type: 'website',
    locale: 'pt_BR',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Lodgra — Gestão Profissional de Aluguel por Temporada',
      },
    ],
  },
  twitter: {
    ...twitterDefaults,
    title,
    description,
    images: ['/opengraph-image'],
  },
}

export default function RootPage() {
  return <BrazilLanding />
}
