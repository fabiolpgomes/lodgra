import type { Metadata } from 'next'
import { seoMetadata, ogDefaults, twitterDefaults } from '@/lib/seo/metadata'

export const metadata: Metadata = {
  title: seoMetadata.register.title,
  description: seoMetadata.register.description,
  keywords: seoMetadata.register.keywords,
  robots: { index: false, follow: false },
  openGraph: {
    title: seoMetadata.register.title,
    description: seoMetadata.register.description,
    url: 'https://lodgra.io/register',
    ...ogDefaults,
    type: 'website',
  },
  twitter: {
    ...twitterDefaults,
    title: seoMetadata.register.title,
    description: seoMetadata.register.description,
  },
}

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children
}
