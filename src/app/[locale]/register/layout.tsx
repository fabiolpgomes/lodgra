import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Criar Conta — Home Stay',
  description: 'Crie a sua conta gratuita e comece a gerir os seus alojamentos no Airbnb e Booking. A partir de €9,90/imóvel/mês.',
  robots: { index: true, follow: true },
}

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children
}
