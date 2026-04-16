import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Entrar — Home Stay',
  description: 'Aceda à sua conta Home Stay e gira os seus alojamentos no Airbnb e Booking num só lugar.',
  robots: { index: true, follow: true },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
