import type { Metadata } from 'next'
import { PrivacyPolicyContent } from '@/components/features/legal/PrivacyPolicyContent'

export const metadata: Metadata = {
  title: 'Política de Privacidade — Lodgra',
  description: 'Política de privacidade da plataforma Lodgra',
  robots: { index: true, follow: true },
}

export default function PoliticaDePrivacidadePage() {
  return <PrivacyPolicyContent />
}
