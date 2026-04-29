import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/requireRole'
import { fetchBookingReservations } from '@/lib/channels/booking-api-client'
import { processBookingReservation } from '@/lib/channels/booking-reservation-processor'

export async function POST(request: NextRequest) {
  if (process.env.BOOKING_CHANNEL_ENABLED !== 'true') {
    return NextResponse.json({ error: 'Feature not enabled' }, { status: 404 })
  }

  const auth = await requireRole(['admin', 'gestor'])
  if (!auth.authorized || !auth.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orgId = auth.organizationId

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { property_listing_id } = body as Record<string, string>

  if (!property_listing_id) {
    return NextResponse.json({ error: 'property_listing_id is required' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // ── Fetch channel_listing for this property ───────────────────
  const { data: channelListing, error: clError } = await adminClient
    .from('channel_listings')
    .select('id, channel_id, external_id, channels!inner(name)')
    .eq('property_listing_id', property_listing_id)
    .eq('organization_id', orgId)
    .eq('channels.name', 'booking')
    .maybeSingle()

  if (clError || !channelListing) {
    return NextResponse.json(
      { error: 'No Booking.com channel configured for this property' },
      { status: 404 }
    )
  }

  // ── Fetch credentials ─────────────────────────────────────────
  const { data: cred, error: credError } = await adminClient
    .from('channel_credentials')
    .select('api_key, external_property_id')
    .eq('organization_id', orgId)
    .eq('channel_id', channelListing.channel_id)
    .eq('external_property_id', channelListing.external_id)
    .eq('is_active', true)
    .maybeSingle()

  if (credError || !cred) {
    return NextResponse.json(
      { error: 'No active credentials found — connect the channel first' },
      { status: 404 }
    )
  }

  // ── Pull last 90 days ─────────────────────────────────────────
  const dateTo = new Date()
  const dateFrom = new Date()
  dateFrom.setDate(dateFrom.getDate() - 90)

  const toStr = dateTo.toISOString().slice(0, 10)
  const fromStr = dateFrom.toISOString().slice(0, 10)

  const { reservations, error: pullError } = await fetchBookingReservations(
    cred.external_property_id,
    cred.api_key,
    fromStr,
    toStr
  )

  if (pullError) {
    console.error('[Booking Sync] Pull failed:', pullError)
    return NextResponse.json(
      { error: `Falha ao obter reservas: ${pullError}` },
      { status: 502 }
    )
  }

  // ── Process each reservation ──────────────────────────────────
  let syncedCount = 0
  let errorCount = 0

  for (const r of reservations) {
    const result = await processBookingReservation(
      adminClient,
      orgId,
      channelListing.id,
      channelListing.channel_id,
      property_listing_id,
      {
        external_id: r.id,
        property_id: r.property_id,
        guest_name: r.guest.name,
        guest_email: r.guest.email,
        check_in: r.check_in,
        check_out: r.check_out,
        number_of_guests: r.number_of_guests,
        status: r.status,
        total_amount: r.total_price.amount,
        currency: r.total_price.currency,
        raw_data: r as unknown as Record<string, unknown>,
      }
    )

    if (result.success) {
      syncedCount++
    } else {
      errorCount++
      console.error('[Booking Sync] Failed to process reservation:', r.id, result.error)
    }
  }

  // ── Update last_synced_at ─────────────────────────────────────
  const now = new Date().toISOString()
  await adminClient
    .from('channel_listings')
    .update({ last_synced_at: now, sync_count: syncedCount, updated_at: now })
    .eq('id', channelListing.id)

  return NextResponse.json({
    ok: true,
    synced_count: syncedCount,
    error_count: errorCount,
    last_sync_at: now,
    date_range: { from: fromStr, to: toStr },
  })
}
