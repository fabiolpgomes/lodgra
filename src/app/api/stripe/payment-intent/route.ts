import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripePT } from '@/lib/stripe/client-pt'
import { calculateSplit, validateSplit } from '@/lib/stripe/split-calculator'
import { requireRole } from '@/lib/auth/requireRole'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(['admin', 'gestor', 'viewer'])
    if (!auth.authorized) return auth.response!

    const { booking_id, amount_eur } = await request.json()

    if (!booking_id || !amount_eur || amount_eur <= 0) {
      return NextResponse.json(
        { error: 'Invalid booking_id or amount_eur' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    const { data: booking } = await adminClient
      .from('bookings')
      .select('id, organization_id, guest_id')
      .eq('id', booking_id)
      .single()

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    const { data: org } = await adminClient
      .from('organizations')
      .select('stripe_pt_connect_id, stripe_pt_connect_onboarded')
      .eq('id', booking.organization_id)
      .single()

    if (!org?.stripe_pt_connect_id || !org.stripe_pt_connect_onboarded) {
      return NextResponse.json(
        { error: 'Organization not onboarded to Stripe Connect' },
        { status: 400 }
      )
    }

    const amountInCents = Math.round(amount_eur * 100)
    const split = calculateSplit(amountInCents)

    if (!validateSplit(split)) {
      return NextResponse.json({ error: 'Invalid split calculation' }, { status: 500 })
    }

    const paymentIntent = await stripePT.paymentIntents.create({
      amount: split.totalAmount,
      currency: 'eur',
      on_behalf_of: org.stripe_pt_connect_id,
      application_fee_amount: split.lodgraFee,
      transfer_data: {
        destination: org.stripe_pt_connect_id,
      },
      metadata: {
        booking_id: booking_id,
        org_id: booking.organization_id,
        guest_id: booking.guest_id,
      },
      statement_descriptor: `Lodgra booking ${booking_id.slice(0, 8)}`,
    })

    console.log(
      `[payment-intent] Created: ${paymentIntent.id} for booking ${booking_id} (EUR ${amount_eur})`
    )

    return NextResponse.json({
      payment_intent_id: paymentIntent.id,
      client_secret: paymentIntent.client_secret,
      amount_eur: amount_eur,
      split: {
        total: split.totalAmount / 100,
        lodgra_fee: split.lodgraFee / 100,
        owner_amount: split.ownerAmount / 100,
      },
    })
  } catch (error) {
    console.error('[payment-intent] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    )
  }
}
