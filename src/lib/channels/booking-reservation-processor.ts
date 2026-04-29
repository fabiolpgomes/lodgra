/**
 * Shared Booking.com reservation upsert processor.
 * Used by both the webhook handler (Story 15.2) and the pull-sync (Story 15.3).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { calculateCommission } from '@/lib/commission/service'
import type { PlanType } from '@/lib/commission/types'

export interface BookingReservationPayload {
  external_id: string        // Booking.com reservation ID
  property_id: string        // Booking.com external property_id
  guest_name: string
  guest_email?: string
  check_in: string           // YYYY-MM-DD
  check_out: string          // YYYY-MM-DD
  number_of_guests: number
  status: string             // 'CONFIRMED' | 'CANCELLED' | ...
  total_amount: number
  currency: string
  raw_data: Record<string, unknown>
}

export interface ProcessResult {
  success: boolean
  reservationId?: string
  isDuplicate: boolean
  error?: string
}

/**
 * Upsert a Booking.com reservation (guest + reservation) into the database.
 * Idempotent: calling twice with the same external_id is safe.
 *
 * @param adminClient - Supabase admin client (bypasses RLS)
 * @param orgId       - organization_id for multi-tenancy
 * @param channelListingId - channel_listings.id that maps this property
 * @param channelId   - channels.id (FK for reservations.channel_id)
 * @param propertyListingId - property_listings.id
 * @param payload     - normalised reservation data
 */
export async function processBookingReservation(
  adminClient: SupabaseClient,
  orgId: string,
  channelListingId: string,
  channelId: string,
  propertyListingId: string,
  payload: BookingReservationPayload
): Promise<ProcessResult> {
  // ── 1. Idempotency check ──────────────────────────────────────
  const { data: existing } = await adminClient
    .from('reservations')
    .select('id')
    .eq('external_id', payload.external_id)
    .eq('property_listing_id', propertyListingId)
    .maybeSingle()

  if (existing) {
    // Already exists — update status/amount in case it changed
    await adminClient
      .from('reservations')
      .update({
        status: deriveStatus(payload.status),
        total_amount: payload.total_amount,
        raw_data: payload.raw_data,
        updated_at: new Date().toISOString(),
        ...(deriveStatus(payload.status) === 'cancelled'
          ? { cancelled_at: new Date().toISOString() }
          : {}),
      })
      .eq('id', existing.id)

    return { success: true, reservationId: existing.id, isDuplicate: true }
  }

  // ── 2. Upsert guest ───────────────────────────────────────────
  const nameParts = payload.guest_name.trim().split(' ')
  const firstName = nameParts[0] || 'Hóspede'
  const lastName = nameParts.slice(1).join(' ') || ''
  const sanitizedExtId = payload.external_id.replace(/[^a-z0-9\-_.]/gi, '')
  const fallbackEmail = `booking-${sanitizedExtId}@booking.local`

  const { data: guest, error: guestError } = await adminClient
    .from('guests')
    .upsert(
      {
        first_name: firstName,
        last_name: lastName,
        name: payload.guest_name,
        email: payload.guest_email || fallbackEmail,
        organization_id: orgId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'email,organization_id', ignoreDuplicates: false }
    )
    .select('id')
    .single()

  if (guestError || !guest) {
    return {
      success: false,
      isDuplicate: false,
      error: `Guest upsert failed: ${guestError?.message ?? 'unknown'}`,
    }
  }

  // ── 3. Commission calculation ─────────────────────────────────
  const { data: org } = await adminClient
    .from('organizations')
    .select('plan')
    .eq('id', orgId)
    .single()

  const commission = calculateCommission(
    payload.total_amount,
    ((org?.plan ?? 'starter') as PlanType)
  )

  // ── 4. Upsert reservation ─────────────────────────────────────
  const status = deriveStatus(payload.status)

  const { data: res, error: resError } = await adminClient
    .from('reservations')
    .upsert(
      {
        external_id: payload.external_id,
        property_listing_id: propertyListingId,
        guest_id: guest.id,
        check_in: payload.check_in,
        check_out: payload.check_out,
        num_guests: payload.number_of_guests,
        guest_name: payload.guest_name,
        guest_email: payload.guest_email || undefined,
        total_amount: payload.total_amount,
        currency: payload.currency,
        commission_amount: commission.commissionAmount,
        commission_rate: commission.commissionRate,
        commission_calculated_at: new Date().toISOString(),
        status,
        booking_source: 'booking_api',
        source: 'booking_api',
        channel_id: channelId,
        raw_data: payload.raw_data,
        organization_id: orgId,
        ...(status === 'cancelled' ? { cancelled_at: new Date().toISOString() } : {}),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'external_id,property_listing_id', ignoreDuplicates: false }
    )
    .select('id')
    .single()

  if (resError || !res) {
    return {
      success: false,
      isDuplicate: false,
      error: `Reservation upsert failed: ${resError?.message ?? 'unknown'}`,
    }
  }

  // ── 5. Bump sync count on channel_listing — non-critical ──────
  try {
    await adminClient.rpc('increment_channel_listing_sync_count', {
      p_id: channelListingId,
    })
  } catch {
    // RPC may not exist yet; sync_count updated by pull-sync route directly
  }

  return { success: true, reservationId: res.id, isDuplicate: false }
}

function deriveStatus(status: string): 'confirmed' | 'cancelled' | 'pending_review' {
  const s = status.toUpperCase()
  if (s === 'CANCELLED' || s === 'CANCELED') return 'cancelled'
  if (s === 'CONFIRMED') return 'confirmed'
  return 'pending_review'
}
