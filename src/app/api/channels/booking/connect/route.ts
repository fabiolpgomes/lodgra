import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/requireRole'
import { validateBookingCredentials } from '@/lib/channels/booking-api-client'

if (process.env.BOOKING_CHANNEL_ENABLED !== 'true') {
  // Module-level guard — tree-shaken in production when flag is off
}

export async function POST(request: NextRequest) {
  if (process.env.BOOKING_CHANNEL_ENABLED !== 'true') {
    return NextResponse.json({ error: 'Feature not enabled' }, { status: 404 })
  }

  // Auth — admin or gestor only
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

  const { property_listing_id, external_property_id, api_key } =
    body as Record<string, string>

  if (!property_listing_id || !external_property_id || !api_key) {
    return NextResponse.json(
      { error: 'property_listing_id, external_property_id and api_key are required' },
      { status: 400 }
    )
  }

  // Validate input lengths to prevent abuse
  if (
    external_property_id.length > 100 ||
    api_key.length > 500 ||
    property_listing_id.length > 100
  ) {
    return NextResponse.json({ error: 'Input too long' }, { status: 400 })
  }

  // ── Validate credentials against Booking.com API ──────────────
  const validationError = await validateBookingCredentials(
    external_property_id,
    api_key
  )
  if (validationError) {
    return NextResponse.json(
      { error: `Credenciais inválidas: ${validationError}` },
      { status: 422 }
    )
  }

  const adminClient = createAdminClient()

  // ── Fetch channel ID for 'booking' ────────────────────────────
  const { data: channel, error: channelError } = await adminClient
    .from('channels')
    .select('id')
    .eq('name', 'booking')
    .single()

  if (channelError || !channel) {
    console.error('[Channel Connect] channels table missing booking row')
    return NextResponse.json(
      { error: 'Channel configuration error — run migrations' },
      { status: 500 }
    )
  }

  // ── Upsert channel_credentials ────────────────────────────────
  const { error: credError } = await adminClient
    .from('channel_credentials')
    .upsert(
      {
        organization_id: orgId,
        channel_id: channel.id,
        external_property_id,
        api_key,               // stored server-side, never returned
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'organization_id,channel_id,external_property_id' }
    )

  if (credError) {
    console.error('[Channel Connect] Failed to save credentials:', credError)
    return NextResponse.json({ error: 'Failed to save credentials' }, { status: 500 })
  }

  // ── Upsert channel_listings mapping ───────────────────────────
  const { data: listing, error: listingError } = await adminClient
    .from('channel_listings')
    .upsert(
      {
        property_listing_id,
        channel_id: channel.id,
        external_id: external_property_id,
        organization_id: orgId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'channel_id,external_id' }
    )
    .select('id')
    .single()

  if (listingError) {
    console.error('[Channel Connect] Failed to upsert channel_listing:', listingError)
    return NextResponse.json({ error: 'Failed to create channel mapping' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    channel_listing_id: listing.id,
    message: 'Canal Booking.com ligado com sucesso',
  })
}
