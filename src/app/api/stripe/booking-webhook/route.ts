import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendBookingConfirmationToGuest, sendBookingNotificationToManager } from '@/lib/email/bookingConfirmationGuest'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-02-25.clover',
  })

  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Sem assinatura Stripe' }, { status: 400 })
  }

  const secret = process.env.STRIPE_BOOKING_WEBHOOK_SECRET
  if (!secret) {
    console.error('[booking-webhook] STRIPE_BOOKING_WEBHOOK_SECRET não configurado')
    return NextResponse.json({ error: 'Webhook não configurado' }, { status: 500 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, secret)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[booking-webhook] Falha na verificação da assinatura:', msg)
    return NextResponse.json({ error: `Webhook error: ${msg}` }, { status: 400 })
  }

  const supabase = createAdminClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleBookingCompleted(supabase, session)
        break
      }
      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleBookingExpired(supabase, session)
        break
      }
      default:
        // Ignore subscription/other events that may arrive on this webhook
        console.log(`[booking-webhook] Evento ignorado: ${event.type}`)
    }
  } catch (err: unknown) {
    console.error(`[booking-webhook] Erro ao processar ${event.type}:`, err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

type AdminClient = ReturnType<typeof createAdminClient>

async function handleBookingCompleted(supabase: AdminClient, session: Stripe.Checkout.Session) {
  const reservationId = session.metadata?.reservation_id
  if (!reservationId) {
    console.warn('[booking-webhook] checkout.session.completed sem reservation_id no metadata')
    return
  }

  // ── Idempotency check ────────────────────────────────────────────────────────
  const { data: existing } = await supabase
    .from('reservations')
    .select('status, check_in, check_out, guest_name, guest_email, total_amount, num_guests, property_listing_id')
    .eq('id', reservationId)
    .single()

  if (!existing) {
    console.error(`[booking-webhook] Reserva ${reservationId} não encontrada`)
    return
  }

  if (existing.status === 'confirmed') {
    console.log(`[booking-webhook] Reserva ${reservationId} já confirmada — idempotent skip`)
    return
  }

  // ── Confirm reservation ─────────────────────────────────────────────────────
  const { error: updateError } = await supabase
    .from('reservations')
    .update({
      status: 'confirmed',
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: session.payment_intent as string ?? null,
    })
    .eq('id', reservationId)

  if (updateError) {
    console.error(`[booking-webhook] Erro ao confirmar reserva ${reservationId}:`, updateError)
    throw updateError
  }

  console.log(`[booking-webhook] Reserva ${reservationId} confirmada`)

  // ── Fetch property info for emails ──────────────────────────────────────────
  console.log(`[booking-webhook] Fetching property listing: ${existing.property_listing_id}`)
  const { data: listing, error: listingError } = await supabase
    .from('property_listings')
    .select('property_id, properties(name, city, slug, organization_id)')
    .eq('id', existing.property_listing_id)
    .single()

  if (listingError) {
    console.error(`[booking-webhook] Erro ao buscar listing: ${listingError.message}`)
    return
  }

  const property = listing?.properties as unknown as { name: string; city: string | null; slug: string | null; organization_id: string } | null
  console.log(`[booking-webhook] Property found: ${property?.name ?? 'Unknown'}`)

  // ── Send emails (non-blocking) ──────────────────────────────────────────────
  const emailData = {
    reservationId,
    propertyName: property?.name ?? 'Propriedade',
    propertySlug: property?.slug ?? null,
    propertyCity: property?.city ?? null,
    checkIn: existing.check_in,
    checkOut: existing.check_out,
    guestName: existing.guest_name ?? 'Hóspede',
    guestEmail: existing.guest_email ?? null,
    numGuests: existing.num_guests ?? 1,
    totalAmount: existing.total_amount ? parseFloat(String(existing.total_amount)) : 0,
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? '',
  }

  console.log(`[booking-webhook] Sending emails to ${emailData.guestEmail}`)
  const emailResults = await Promise.allSettled([
    sendBookingConfirmationToGuest(emailData),
    sendBookingNotificationToManager(emailData),
  ])

  emailResults.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      console.log(`[booking-webhook] Email ${index === 0 ? 'guest' : 'manager'} sent successfully`)
    } else {
      console.error(`[booking-webhook] Email ${index === 0 ? 'guest' : 'manager'} failed:`, result.reason)
    }
  })
}

async function handleBookingExpired(supabase: AdminClient, session: Stripe.Checkout.Session) {
  const reservationId = session.metadata?.reservation_id
  if (!reservationId) return

  const { data: existing } = await supabase
    .from('reservations')
    .select('status')
    .eq('id', reservationId)
    .single()

  // Only cancel if still pending_payment (cron may have already cancelled it)
  if (existing?.status === 'pending_payment') {
    const { error: cancelError } = await supabase
      .from('reservations')
      .update({ status: 'cancelled' })
      .eq('id', reservationId)

    if (cancelError) {
      console.error(`[booking-webhook] Erro ao cancelar reserva ${reservationId} por expiração:`, cancelError)
    } else {
      console.log(`[booking-webhook] Reserva ${reservationId} cancelada por expiração de sessão Stripe`)
    }
  }
}
