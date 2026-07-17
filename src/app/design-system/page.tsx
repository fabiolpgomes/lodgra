import { AirbnbShowcase } from '@/components/design-system/BehanceShowcase'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Lodgra Premium Design System | Lodgra',
  description: 'Lodgra Premium design system inspired by Airbnb',
}

export default function DesignSystemPage() {
  return <AirbnbShowcase />
}
