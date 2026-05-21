import type { Metadata } from 'next'
import { TermsContent } from '@/components/features/legal/TermsContent'
import { seoMetadata, ogDefaults, twitterDefaults } from '@/lib/seo/metadata'

export const metadata: Metadata = {
  title: seoMetadata.terms.title,
  description: seoMetadata.terms.description,
  keywords: seoMetadata.terms.keywords,
  robots: { index: true, follow: true },
  openGraph: {
    title: seoMetadata.terms.title,
    description: seoMetadata.terms.description,
    url: 'https://lodgra.io/terms',
    ...ogDefaults,
    type: 'website',
  },
  twitter: {
    ...twitterDefaults,
    title: seoMetadata.terms.title,
    description: seoMetadata.terms.description,
  },
}

export default function TermsPage() {
  return <TermsContent />
}
