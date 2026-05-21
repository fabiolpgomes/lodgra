import type { Metadata } from 'next'
import { PrivacyPolicyContent } from '@/components/features/legal/PrivacyPolicyContent'
import { seoMetadata, ogDefaults, twitterDefaults } from '@/lib/seo/metadata'

export const metadata: Metadata = {
  title: seoMetadata.privacy.title,
  description: seoMetadata.privacy.description,
  keywords: seoMetadata.privacy.keywords,
  robots: { index: true, follow: true },
  openGraph: {
    title: seoMetadata.privacy.title,
    description: seoMetadata.privacy.description,
    url: 'https://lodgra.io/privacy',
    ...ogDefaults,
    type: 'website',
  },
  twitter: {
    ...twitterDefaults,
    title: seoMetadata.privacy.title,
    description: seoMetadata.privacy.description,
  },
}

export default function PrivacyPage() {
  return <PrivacyPolicyContent />
}
