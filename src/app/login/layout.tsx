import type { Metadata } from 'next'
import { seoMetadata, ogDefaults, twitterDefaults } from '@/lib/seo/metadata'

export const metadata: Metadata = {
  title: seoMetadata.login.title,
  description: seoMetadata.login.description,
  keywords: seoMetadata.login.keywords,
  robots: { index: false, follow: false },
  openGraph: {
    title: seoMetadata.login.title,
    description: seoMetadata.login.description,
    url: 'https://lodgra.io/login',
    ...ogDefaults,
    type: 'website',
  },
  twitter: {
    ...twitterDefaults,
    title: seoMetadata.login.title,
    description: seoMetadata.login.description,
  },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
