import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { CheckoutForm } from '@/components/payment/CheckoutForm'

interface PaymentPageProps {
  params: Promise<{ locale: string; bookingId: string }>
}

export default async function PaymentPage({ params }: PaymentPageProps) {
  const { bookingId } = await params

  const supabase = createAdminClient()

  const { data: booking } = await supabase
    .from('bookings')
    .select(
      `
      id,
      total_amount,
      status,
      properties:property_id (name)
    `
    )
    .eq('id', bookingId)
    .single()

  if (!booking) {
    notFound()
  }

  const paymentIntentResponse = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/stripe/payment-intent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        booking_id: bookingId,
        amount_eur: booking.total_amount,
      }),
    }
  )

  if (!paymentIntentResponse.ok) {
    throw new Error('Failed to create payment intent')
  }

  const { client_secret, split } = await paymentIntentResponse.json()

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-2">Payment for Your Booking</h1>
          <p className="text-gray-600 mb-8">{bookingId}</p>

          <CheckoutForm
            clientSecret={client_secret}
            _bookingId={bookingId}
            amountEUR={split.total}
            lodgraFee={split.lodgra_fee}
            ownerAmount={split.owner_amount}
            onSuccess={() => {
              // Redirect to success page
              window.location.href = `/booking/${bookingId}/payment-success`
            }}
            onError={(error) => {
              console.error('Payment error:', error)
              alert(`Payment failed: ${error}`)
            }}
          />
        </div>
      </div>
    </div>
  )
}
