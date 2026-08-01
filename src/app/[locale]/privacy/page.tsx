import type { Metadata } from 'next'
import { PrivacyPolicyContent } from '@/components/features/legal/PrivacyPolicyContent'

export const metadata: Metadata = {
  title: 'Privacy Policy — Lodgra',
  description: 'Privacy policy for the Lodgra platform — GDPR/LGPD compliant',
  robots: { index: true, follow: true },
}

export default function PrivacyPage() {
  return <PrivacyPolicyContent />
}
