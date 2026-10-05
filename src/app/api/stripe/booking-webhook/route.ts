import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { configuredPlatformCurrencies, getConnectWebhookSecret } from '@/lib/stripe/platform'
import { claimStripeEvent, markStripeEventProcessed, releaseStripeEvent } from '@/lib/stripe/webhook-idempotency'
import { sendBookingConfirmationToGuest, sendBookingNotificationToManager } from '@/lib/email/bookingConfirmationGuest'
import { enqueueEmail } from '@/lib/email/queue'
import type { CurrencyCode } from '@/lib/utils/currency'

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

  // ── Idempotency check ────────────────────────────────────────────────────────
  const { data: existing } = await supabase
    .from('reservations')
    .select('status, check_in, check_out, guest_name, guest_email, total_amount, num_guests, property_listing_id, currency, preferred_locale, guests:guests!reservations_guest_id_fkey(preferred_locale)')
    .eq('id', reservationId)
    .single()

  if (!existing) {
    console.error(`[booking-webhook] Reserva ${reservationId} não encontrada`)
    return
  }

  if (existing.status !== 'pending_payment') {
    // Já confirmada, ou cancelada/expirada entretanto: uma entrega tardia não a reabre.
    console.log(`[booking-webhook] Reserva ${reservationId} em '${existing.status}' — ignorado`)
    return
  }

  // ── Confirm reservation ─────────────────────────────────────────────────────
  // Update condicional: só confirma se ainda não estiver confirmada. Duas entregas
  // concorrentes não confirmam (nem enviam e-mails) duas vezes.
  const { data: confirmedRows, error: updateError } = await supabase
    .from('reservations')
    .update({
      status: 'confirmed',
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: session.payment_intent as string ?? null,
    })
    .eq('id', reservationId)
    .eq('status', 'pending_payment')
    .select('id')

  if (updateError) {
    console.error(`[booking-webhook] Erro ao confirmar reserva ${reservationId}:`, updateError)
    throw updateError
  }
  if (!confirmedRows || confirmedRows.length === 0) {
    console.log(`[booking-webhook] Reserva ${reservationId} confirmada por outra entrega — idempotent skip`)
    return
  }

  console.log(`[booking-webhook] Reserva ${reservationId} confirmada`)

  // ── Fetch property info for emails ──────────────────────────────────────────
  console.log(`[booking-webhook] Fetching property listing: ${existing.property_listing_id}`)
  const { data: listing, error: listingError } = await supabase
    .from('property_listings')
    .select('property_id, properties(name, city, slug, organization_id, owner_id, currency)')
    .eq('id', existing.property_listing_id)
    .single()

  if (listingError) {
    console.error(`[booking-webhook] Erro ao buscar listing: ${listingError.message}`)
    return
  }

  const property = listing?.properties as unknown as {
    name: string
    city: string | null
    slug: string | null
    organization_id: string
    owner_id: string | null
    currency: string | null
  } | null
  console.log(`[booking-webhook] Property found: ${property?.name ?? 'Unknown'}`)

  if (!property) {
    console.error('[booking-webhook] Propriedade não encontrada para emails')
    return
  }

  // ── Send emails (non-blocking) ──────────────────────────────────────────────
  const currency = (existing.currency ?? property.currency)?.toUpperCase() as CurrencyCode | undefined
  if (!currency) {
    console.error('[booking-webhook] Reserva sem moeda disponível para emails:', reservationId)
    return
  }

  const guestRelation = existing.guests as unknown as { preferred_locale: string | null } | Array<{ preferred_locale: string | null }> | null
  const guestProfile = Array.isArray(guestRelation) ? guestRelation[0] : guestRelation

  const emailData = {
    reservationId,
    propertyName: property.name,
    propertySlug: property.slug,
    propertyCity: property.city,
    organizationId: property.organization_id,
    checkIn: existing.check_in,
    checkOut: existing.check_out,
    guestName: existing.guest_name ?? 'Hóspede',
    guestEmail: existing.guest_email ?? null,
    numGuests: existing.num_guests ?? 1,
    totalAmount: existing.total_amount ? parseFloat(String(existing.total_amount)) : 0,
    currency,
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? '',
    preferredLocale: existing.preferred_locale ?? guestProfile?.preferred_locale ?? null,
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

  // ── Notify property owner ────────────────────────────────────────────────────
  if (property?.owner_id) {
    const { data: owner } = await supabase
      .from('owners')
      .select('full_name, email')
      .eq('id', property.owner_id)
      .single()

    if (owner?.email) {
      const nights = Math.round(
        (new Date(existing.check_out).getTime() - new Date(existing.check_in).getTime()) / 86400000
      )
      await enqueueEmail({
        type: 'owner_reservation',
        ownerName: owner.full_name ?? 'Proprietário',
        ownerEmail: owner.email,
        guestName: existing.guest_name ?? 'Hóspede',
        propertyName: property.name,
        checkIn: existing.check_in,
        checkOut: existing.check_out,
        nights,
        totalAmount: existing.total_amount ? String(existing.total_amount) : undefined,
        currency,
        source: 'direct',
      })
      console.log(`[booking-webhook] Notificação ao proprietário enviada para ${owner.email}`)
    }
  }
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
