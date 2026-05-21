import type { Metadata } from 'next'
import { ogDefaults, twitterDefaults } from '@/lib/seo/metadata'

export const metadata: Metadata = {
  title: 'Blog - Lodgra | Dicas de Gestão de Imóveis',
  description: 'Blog com artigos, dicas e tendências sobre gestão de imóveis, pricing dinâmico e maximização de lucros para proprietários.',
  keywords: 'blog gestão imóvel, dicas airbnb, pricing dinâmico, lucros aluguel',
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Blog - Lodgra',
    description: 'Artigos e dicas para gestão de imóveis e maximização de lucros.',
    url: 'https://lodgra.io/blog',
    ...ogDefaults,
    type: 'website',
  },
  twitter: {
    ...twitterDefaults,
    title: 'Blog - Lodgra',
    description: 'Dicas e artigos sobre gestão de imóveis.',
  },
}

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children
}
