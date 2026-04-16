import type { Metadata } from 'next'
import { PrivacyPolicyContent } from '@/components/legal/PrivacyPolicyContent'

export const metadata: Metadata = {
  title: 'Privacy Policy — Home Stay',
  description: 'Privacy policy for the Home Stay platform — GDPR/LGPD compliant',
  robots: { index: true, follow: true },
}

export default function PrivacyPage() {
  return <PrivacyPolicyContent />
}
