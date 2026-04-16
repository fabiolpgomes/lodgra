import type { Metadata } from 'next'
import { PrivacyPolicyContent } from '@/components/legal/PrivacyPolicyContent'

export const metadata: Metadata = {
  title: 'Política de Privacidade — Home Stay',
  description: 'Política de privacidade da plataforma Home Stay',
  robots: { index: true, follow: true },
}

export default function PoliticaDePrivacidadePage() {
  return <PrivacyPolicyContent />
}
