import { redirect } from 'next/navigation'

interface PaymentPageProps {
  params: Promise<{ locale: string; bookingId: string }>
}

// This route is superseded by the /p/[slug]/checkout flow (Stripe Checkout Session).
export default async function PaymentPage({ params }: PaymentPageProps) {
  const { locale } = await params
  redirect(`/${locale}/dashboard`)
}
