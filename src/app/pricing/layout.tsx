import type { Metadata } from 'next'
import { ogDefaults, twitterDefaults } from '@/lib/seo/metadata'

export const metadata: Metadata = {
  title: 'Planos e Preços - Lodgra | Gestão de Imóveis',
  description: 'Planos transparentes para gestão de imóveis. Começe grátis, escale conforme crescer. Sem taxas escondidas, sem contrato de longa duração.',
  keywords: 'preços lodgra, planos gestão imóvel, pricing dinâmico, custo gestão',
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Planos e Preços - Lodgra',
    description: 'Planos transparentes e flexíveis para gestão de imóveis. Comece grátis.',
    url: 'https://lodgra.io/pricing',
    ...ogDefaults,
    type: 'website',
  },
  twitter: {
    ...twitterDefaults,
    title: 'Planos e Preços - Lodgra',
    description: 'Planos transparentes para gestão de imóveis.',
  },
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children
}
