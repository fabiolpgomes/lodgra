import type { Metadata } from 'next'
import { seoMetadata, ogDefaults, twitterDefaults } from '@/lib/seo/metadata'

export const metadata: Metadata = {
  title: 'Funcionalidades - Lodgra | Gestão Completa de Imóveis',
  description: 'Descubra todas as funcionalidades de Lodgra: pricing inteligente, automação de reservas, análise de lucros, integração com Airbnb e Booking. Maximize seus lucros.',
  keywords: 'funcionalidades gestão imóvel, automação Airbnb, pricing dinâmico, análise lucros',
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Funcionalidades - Lodgra',
    description: 'Plataforma completa para gestão de imóveis com pricing inteligente e automação.',
    url: 'https://lodgra.io/features',
    ...ogDefaults,
    type: 'website',
  },
  twitter: {
    ...twitterDefaults,
    title: 'Funcionalidades - Lodgra',
    description: 'Gestão de imóveis com pricing dinâmico e automação.',
  },
}

export default function FeaturesLayout({ children }: { children: React.ReactNode }) {
  return children
}
