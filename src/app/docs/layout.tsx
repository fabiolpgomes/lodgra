import type { Metadata } from 'next'
import { ogDefaults, twitterDefaults } from '@/lib/seo/metadata'

export const metadata: Metadata = {
  title: 'Documentação - Lodgra | Guias e Tutoriais',
  description: 'Guias completos, tutoriais e documentação técnica para usar Lodgra. Saiba como configurar, integrar e maximizar seu potencial.',
  keywords: 'documentação lodgra, guia de uso, tutoriais, como usar',
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Documentação - Lodgra',
    description: 'Guias e documentação completa para gestão de imóveis com Lodgra.',
    url: 'https://lodgra.io/docs',
    ...ogDefaults,
    type: 'website',
  },
  twitter: {
    ...twitterDefaults,
    title: 'Documentação - Lodgra',
    description: 'Guias e tutoriais para Lodgra.',
  },
}

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return children
}
