import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rateLimit'
import { differenceInDays, parseISO, isValid, isBefore, startOfDay } from 'date-fns'
import { getPriceForRangePublic } from '@/lib/pricing/getPriceForRange'
import { formatMinimumStayError, detectLocale } from '@/lib/i18n/messages'

// POST /api/public/bookings — create direct booking + Stripe Checkout Session
// Public — no auth required

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

export async function POST(request: NextRequest) {
  try {
    console.log('[Bookings API] POST request received')
    const ip = getClientIp(request)
    console.log('[Bookings API] IP:', ip)

    // Rate limit: 10 booking attempts / 15 min per IP
    const allowed = checkRateLimit('public:bookings', ip, 10, 15 * 60 * 1000)
    console.log('[Bookings API] Rate limit check:', allowed)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Aguarde alguns minutos.' },
        { status: 429, headers: { 'Retry-After': '900' } }
      )
    }

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Corpo da requisição inválido' }, { status: 400 })
    }

  const {
    slug,
    checkin,
    checkout,
    num_guests,
    guest_name,
    guest_email,
    guest_phone,
    guest_country,
  } = body as Record<string, string | number>

  // ── Validation ─────────────────────────────────────────────────────────────

  if (!slug || !checkin || !checkout || !guest_name || !guest_email) {
    return NextResponse.json({ error: 'Campos obrigatórios em falta' }, { status: 400 })
  }

  const checkinDate = parseISO(checkin as string)
  const checkoutDate = parseISO(checkout as string)
  const today = startOfDay(new Date())

  if (!isValid(checkinDate) || !isValid(checkoutDate)) {
    return NextResponse.json({ error: 'Datas inválidas' }, { status: 400 })
  }
  if (isBefore(checkinDate, today)) {
    return NextResponse.json({ error: 'Check-in não pode ser no passado' }, { status: 400 })
  }
  const nights = differenceInDays(checkoutDate, checkinDate)
  if (nights < 1) {
    return NextResponse.json({ error: 'Checkout deve ser depois do check-in' }, { status: 400 })
  }
  if (nights > 365) {
    return NextResponse.json({ error: 'Período máximo de 365 noites' }, { status: 400 })
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(guest_email as string)) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
  }

  const guests = typeof num_guests === 'number' ? num_guests : parseInt(String(num_guests)) || 1

  const adminClient = createAdminClient()

  // ── Fetch property ──────────────────────────────────────────────────────────

  const { data: property } = await adminClient
    .from('properties')
    .select('id, name, base_price, currency, min_nights, organization_id, is_public, max_guests')
    .eq('slug', slug as string)
    .eq('is_public', true)
    .single()

  if (!property) {
    return NextResponse.json({ error: 'Propriedade não encontrada' }, { status: 404 })
  }

  // ── Validate guests against property capacity ────────────────────────────────
  if (property.max_guests && guests > property.max_guests) {
    return NextResponse.json(
      { error: `Esta propriedade aceita no máximo ${property.max_guests} hóspede${property.max_guests !== 1 ? 's' : ''}.` },
      { status: 400 }
    )
  }

  // ── Double-booking check ────────────────────────────────────────────────────

  const { data: listings } = await adminClient
    .from('property_listings')
    .select('id')
    .eq('property_id', property.id)

  const listingIds = (listings ?? []).map((l: { id: string }) => l.id)

  if (listingIds.length > 0) {
    const { data: conflicts } = await adminClient
      .from('reservations')
      .select('id')
      .in('property_listing_id', listingIds)
      .in('status', ['confirmed', 'pending_payment'])
      .lt('check_in', checkout as string)
      .gt('check_out', checkin as string)
      .limit(1)

    if ((conflicts ?? []).length > 0) {
      return NextResponse.json(
        { error: 'As datas seleccionadas já não estão disponíveis.' },
        { status: 409 }
      )
    }
  }

  // ── Find or create "direct" platform listing ────────────────────────────────

  const { data: directPlatform } = await adminClient
    .from('platforms')
    .select('id')
    .eq('name', 'direct')
    .single()

  if (!directPlatform) {
    return NextResponse.json(
      { error: 'Plataforma de reserva directa não configurada. Contacte o suporte.' },
      { status: 500 }
    )
  }

  let directListingId: string

  const { data: existingListing } = await adminClient
    .from('property_listings')
    .select('id')
    .eq('property_id', property.id)
    .eq('platform_id', directPlatform.id)
    .single()

  if (existingListing) {
    directListingId = existingListing.id
  } else {
    const { data: newListing, error: listingError } = await adminClient
      .from('property_listings')
      .insert({
        property_id: property.id,
        platform_id: directPlatform.id,
        organization_id: property.organization_id,
        is_active: true,
      })
      .select('id')
      .single()

    if (listingError || !newListing) {
      console.error('Erro ao criar listing directo:', listingError)
      return NextResponse.json({ error: 'Erro ao criar reserva' }, { status: 500 })
    }
    directListingId = newListing.id
  }

  // ── Upsert guest ────────────────────────────────────────────────────────────

  const nameParts = (guest_name as string).trim().split(' ')
  const firstName = nameParts[0]
  const lastName = nameParts.slice(1).join(' ') || ''

  const { data: guestRecord, error: guestError } = await adminClient
    .from('guests')
    .upsert(
      {
        first_name: firstName,
        last_name: lastName,
        email: (guest_email as string).toLowerCase().trim(),
        phone: (guest_phone as string) || null,
        country: (guest_country as string) || null,
        organization_id: property.organization_id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'email,organization_id', ignoreDuplicates: false }
    )
    .select('id')
    .single()

  if (guestError) {
    console.error('Erro ao criar hóspede:', guestError)
    // Non-blocking: proceed without guest_id
  }

  console.log('[Bookings API] Guest created/updated successfully')

  // ── Calculate price (uses dynamic pricing rules, falls back to base_price) ──

  console.log('[Bookings API] Calculating price for property:', property.id)
  let pricing
  try {
    pricing = await getPriceForRangePublic(property.id, checkinDate, checkoutDate)
  } catch (pricingError) {
    console.error('[Bookings API] Erro ao calcular preço:', pricingError)
    return NextResponse.json({ error: 'Erro ao calcular preço da reserva. Tente novamente.' }, { status: 500 })
  }
  const totalAmount = pricing.total
  console.log('[Bookings API] Price calculated:', totalAmount)

  if (totalAmount <= 0) {
    return NextResponse.json(
      { error: 'Esta propriedade ainda não tem preço configurado. Contacte o gestor.' },
      { status: 400 }
    )
  }

  // ── Validate minimum stay requirement ────────────────────────────────────────
  if (nights < pricing.minNights) {
    const locale = detectLocale(request.headers.get('accept-language') ?? undefined)
    return NextResponse.json(
      {
        error: 'minimum_stay_required',
        message: formatMinimumStayError(pricing.minNights, locale),
        minNights: pricing.minNights,
      },
      { status: 400 }
    )
  }


  // ── Create reservation (pending_payment) ────────────────────────────────────

  console.log('[Bookings API] Creating reservation with listing:', directListingId)
  const { data: reservation, error: reservationError } = await adminClient
    .from('reservations')
    .insert({
      property_listing_id: directListingId,
      guest_id: guestRecord?.id ?? null,
      check_in: checkin as string,
      check_out: checkout as string,
      number_of_guests: guests,
      total_amount: totalAmount,
      currency: property.currency ?? 'EUR',
      status: 'pending_payment',
      booking_source: 'direct',
      guest_name: (guest_name as string).trim(),
      guest_email: (guest_email as string).toLowerCase().trim(),
      guest_phone: (guest_phone as string) || null,
      num_guests: guests,
      organization_id: property.organization_id,
      commission_calculated_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (reservationError || !reservation) {
    console.error('[Bookings API] Erro ao criar reserva:', reservationError)
    return NextResponse.json({ error: 'Erro ao criar reserva' }, { status: 500 })
  }
  console.log('[Bookings API] Reservation created:', reservation.id)

  // ── Create Stripe Checkout Session ──────────────────────────────────────────

  const stripeKey = process.env.STRIPE_PT_SECRET_KEY || process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    console.error('[Bookings API] Erro: STRIPE_PT_SECRET_KEY ou STRIPE_SECRET_KEY não configurados')
    return NextResponse.json(
      { error: 'Serviço de pagamento não configurado. Contacte o suporte.' },
      { status: 500 }
    )
  }

  const stripe = new Stripe(stripeKey, {
    apiVersion: '2026-02-25.clover',
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lodgra.io'

  try {
    console.log('[Bookings API] Creating Stripe checkout session')
    const amountInCents = Math.round(totalAmount * 100)
    const currency = (property.currency ?? 'EUR').toLowerCase()

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency,
            unit_amount: amountInCents,
            product_data: {
              name: `${property.name} — ${nights} noite${nights !== 1 ? 's' : ''}`,
              description: `Check-in: ${checkin} · Check-out: ${checkout}`,
            },
          },
          quantity: 1,
        },
      ],
      customer_email: (guest_email as string).toLowerCase().trim(),
      success_url: `${appUrl}/p/${slug}/booking-confirmed?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/p/${slug}`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      metadata: {
        reservation_id: reservation.id,
        property_slug: slug as string,
      },
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    console.log('[Bookings API] Stripe session created:', session.id)

    // Store session ID on the reservation
    await adminClient
      .from('reservations')
      .update({ stripe_checkout_session_id: session.id })
      .eq('id', reservation.id)

    console.log('[Bookings API] Success! Returning checkout URL')
    return NextResponse.json({
      reservation_id: reservation.id,
      checkout_url: session.url,
    })
  } catch (stripeError: unknown) {
    // Rollback: cancel the reservation
    await adminClient
      .from('reservations')
      .update({ status: 'cancelled' })
      .eq('id', reservation.id)

    console.error('Stripe session creation failed:', stripeError)
    return NextResponse.json({ error: 'Erro ao iniciar pagamento. Tente novamente.' }, { status: 500 })
  }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : ''
    console.error('[Bookings API] Fatal error:', errorMessage)
    console.error('[Bookings API] Stack:', errorStack)
    console.error('[Bookings API] Full error:', error)
    return NextResponse.json(
      {
        error: 'Erro ao processar reserva',
        details: process.env.NODE_ENV === 'development' ? `${errorMessage} | ${errorStack}` : undefined
      },
      { status: 500 }
    )
  }
}
