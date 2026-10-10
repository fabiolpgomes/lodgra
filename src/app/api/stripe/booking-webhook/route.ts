import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { configuredPlatformCurrencies, getConnectWebhookSecret } from '@/lib/stripe/platform'
import { claimStripeEvent, markStripeEventProcessed, releaseStripeEvent } from '@/lib/stripe/webhook-idempotency'
import { confirmDirectBooking } from '@/lib/bookings/confirm-direct-booking.server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Sem assinatura Stripe' }, { status: 400 })
  }

  // Eventos das contas conectadas dos tenants (plataformas BR e PT, endpoint "contas conectadas").
  const secrets = configuredPlatformCurrencies().map(getConnectWebhookSecret).filter(Boolean)
  if (secrets.length === 0) {
    console.error('[booking-webhook] nenhum segredo de webhook configurado')
    return NextResponse.json({ error: 'Webhook não configurado' }, { status: 500 })
  }

  let event: Stripe.Event | null = null
  for (const secret of secrets) {
    try {
      event = Stripe.webhooks.constructEvent(body, sig, secret)
      break
    } catch {
      // assinatura de outra origem — tenta o próximo segredo
    }
  }
  if (!event) {
    console.error('[booking-webhook] Falha na verificação da assinatura')
    return NextResponse.json({ error: 'Webhook error: assinatura inválida' }, { status: 400 })
  }

  const supabase = await createAdminClient()

  // Idempotência: o Stripe pode reenviar ou entregar o mesmo evento em paralelo.
  let claim
  try {
    claim = await claimStripeEvent(supabase, 'booking', event)
  } catch (err: unknown) {
    console.error('[booking-webhook] Falha ao registrar evento', event.id, err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
  if (claim === 'duplicate') {
    console.log(`[booking-webhook] Evento ${event.id} já processado — ignorado`)
    return NextResponse.json({ received: true, duplicate: true })
  }
  if (claim === 'in_progress') {
    console.log(`[booking-webhook] Evento ${event.id} em processamento por outra entrega`)
    return NextResponse.json({ error: 'Evento em processamento' }, { status: 409 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleBookingCompleted(supabase, session, event.account ?? null)
        break
      }
      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleBookingExpired(supabase, session, event.account ?? null)
        break
      }
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        await handleChargeRefunded(supabase, charge, event.account ?? null)
        break
      }
      default:
        // Ignore subscription/other events that may arrive on this webhook
        console.log(`[booking-webhook] Evento ignorado: ${event.type}`)
    }
  } catch (err: unknown) {
    console.error(`[booking-webhook] Erro ao processar ${event.type}:`, err)
    await releaseStripeEvent(supabase, event.id)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }

  await markStripeEventProcessed(supabase, event.id)
  return NextResponse.json({ received: true })
}

type AdminClient = ReturnType<typeof createAdminClient>

/**
 * Um tenant controla a própria conta Stripe e poderia criar uma sessão com o
 * reservation_id de outra organização. Só aceita o evento se vier da conta
 * onde a reserva foi cobrada (ou, no modelo antigo, sem conta conectada).
 */
async function eventMatchesReservation(supabase: AdminClient, reservationId: string, eventAccount: string | null) {
  const { data } = await supabase
    .from('reservations')
    .select('stripe_account_id')
    .eq('id', reservationId)
    .maybeSingle()
  if (!data) return false
  return (data.stripe_account_id ?? null) === eventAccount
}

/** Página de confirmação no site do tenant (a mesma para onde o Checkout redireciona). */
function bookingConfirmedUrl(session: Stripe.Checkout.Session, propertySlug: string | null): string | null {
  if (!propertySlug) return null
  const fromSuccess = session.success_url?.split('/p/')[0]
  const base = fromSuccess && fromSuccess.startsWith('http') ? fromSuccess : (process.env.NEXT_PUBLIC_APP_URL || 'https://lodgra.io')
  return `${base}/p/${propertySlug}/booking-confirmed?session_id=${encodeURIComponent(session.id)}`
}

async function handleBookingCompleted(supabase: AdminClient, session: Stripe.Checkout.Session, eventAccount: string | null) {
  const reservationId = session.metadata?.reservation_id
  if (!reservationId) {
    console.warn('[booking-webhook] checkout.session.completed sem reservation_id no metadata')
    return
  }
  if (!(await eventMatchesReservation(supabase, reservationId, eventAccount))) {
    console.warn(`[booking-webhook] Evento da conta ${eventAccount} não corresponde à reserva ${reservationId} — ignorado`)
    return
  }

  await confirmDirectBooking(supabase, reservationId, {
    paymentFields: {
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: (session.payment_intent as string) ?? null,
    },
    bookingUrl: (propertySlug) => bookingConfirmedUrl(session, propertySlug),
  })
}

/**
 * Reembolso feito pelo tenant diretamente no Stripe: regista o valor reembolsado e,
 * se for total, cancela a reserva (liberta as datas no calendário).
 */
async function handleChargeRefunded(supabase: AdminClient, charge: Stripe.Charge, eventAccount: string | null) {
  const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id
  if (!paymentIntentId || !eventAccount) return

  const { data: reservation } = await supabase
    .from('reservations')
    .select('id, reservation_status, stripe_account_id')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .maybeSingle()
  if (!reservation || reservation.stripe_account_id !== eventAccount) {
    console.log(`[booking-webhook] charge.refunded sem reserva correspondente (${paymentIntentId}) — ignorado`)
    return
  }

  const now = new Date().toISOString()
  const fullRefund = charge.refunded || charge.amount_refunded >= charge.amount
  const lastRefund = charge.refunds?.data?.[0]?.id ?? null
  const update: Record<string, unknown> = {
    refund_amount: charge.amount_refunded / 100,
    stripe_refund_id: lastRefund,
    refund_processed_at: now,
    updated_at: now,
  }
  if (fullRefund && reservation.reservation_status !== 'cancelled') {
    Object.assign(update, {
      reservation_status: 'cancelled',
      status: 'cancelled',
      cancelled_at: now,
      cancellation_reason: 'Reembolso total feito no Stripe',
    })
  }

  const { error } = await supabase.from('reservations').update(update).eq('id', reservation.id)
  if (error) throw error
  console.log(`[booking-webhook] Reserva ${reservation.id}: reembolso ${fullRefund ? 'total (cancelada)' : 'parcial'} registado`)
}

async function handleBookingExpired(supabase: AdminClient, session: Stripe.Checkout.Session, eventAccount: string | null) {
  const reservationId = session.metadata?.reservation_id
  if (!reservationId) return
  if (!(await eventMatchesReservation(supabase, reservationId, eventAccount))) return

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
