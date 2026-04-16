import type { Metadata } from 'next'
import { TermsContent } from '@/components/legal/TermsContent'

export const metadata: Metadata = {
  title: 'Terms of Service — Home Stay',
  description: 'Terms of service for the Home Stay platform',
  robots: { index: true, follow: true },
}

export default function TermsPage() {
  return <TermsContent />
}
