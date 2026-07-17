import { BehanceShowcase } from '@/components/design-system/BehanceShowcase'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Behance Design System | Lodgra',
  description: 'Lodgra Design System based on Adobe Behance',
}

export default function DesignSystemPage() {
  return <BehanceShowcase />
}
