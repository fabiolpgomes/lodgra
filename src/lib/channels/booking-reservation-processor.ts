/**
 * Shared Booking.com reservation upsert processor.
 * Used by both the webhook handler (Story 15.2) and the pull-sync (Story 15.3).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { calculateCommission } from '@/lib/commission/service'
import type { PlanType } from '@/lib/commission/types'
import { reportBookingFee, reportRevenueFee } from '@/lib/billing/stripe-usage'
import { calculateServiceFeeAmount, nightsBetween } from '@/lib/reservations/serviceFee'
import type { CancellationPolicySnapshot, StayDuration } from '@/types/cancellation.types'

export interface BookingReservationPayload {
  external_id: string
  property_id: string
  guest_name?: string
  guest_email?: string
  check_in: string
  check_out: string
  number_of_guests?: number
  status: string
  total_amount?: number
  currency?: string
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
  const status = deriveStatus(payload.status)
  const guestName = payload.guest_name?.trim() || 'Hóspede'
  const hasGuestName = Boolean(payload.guest_name?.trim())
  const guestEmail = payload.guest_email?.trim() || null
  const hasTotalAmount = typeof payload.total_amount === 'number'
  const totalAmount = typeof payload.total_amount === 'number' ? payload.total_amount : 0
  const currency = payload.currency?.trim().toUpperCase() || 'EUR'
  const now = new Date().toISOString()

  // ── 1. Idempotency check ──────────────────────────────────────
  const { data: existing } = await adminClient
    .from('reservations')
    .select('id')
    .eq('external_id', payload.external_id)
    .eq('property_listing_id', propertyListingId)
    .maybeSingle()

  if (existing) {
    const update: Record<string, unknown> = {
      status,
      raw_data: payload.raw_data,
      updated_at: now,
      ...(status === 'cancelled' ? { cancelled_at: now } : { cancelled_at: null }),
    }

    if (typeof payload.number_of_guests === 'number') {
      update.num_guests = payload.number_of_guests
    }

    if (hasGuestName) {
      update.guest_name = guestName
      update.first_name = guestName.split(' ')[0] || 'Hóspede'
      update.last_name = guestName.split(' ').slice(1).join(' ') || ''
    }

    if (guestEmail) {
      update.guest_email = guestEmail
    }

    if (hasTotalAmount) {
      update.total_amount = totalAmount
      update.currency = currency
    }

    const { error: updateError } = await adminClient
      .from('reservations')
      .update(update)
      .eq('id', existing.id)

    if (updateError) {
      return {
        success: false,
        isDuplicate: true,
        error: `Reservation update failed: ${updateError.message}`,
      }
    }

    return { success: true, reservationId: existing.id, isDuplicate: true }
  }

  // ── 2. Upsert guest ───────────────────────────────────────────
  const nameParts = guestName.split(' ')
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
        name: guestName,
        email: guestEmail || fallbackEmail,
        organization_id: orgId,
        updated_at: now,
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
    totalAmount,
    ((org?.plan ?? 'essencial') as PlanType)
  )

  // ── 3b. Story 39.1 — snapshot de service_fee_amount a partir da propriedade ──
  // (não recalculado depois, se o valor-base da propriedade mudar)
  const { data: listingForFees } = await adminClient
    .from('property_listings')
    .select('properties(cleaning_fee, cleaning_fee_type, pet_fee, pet_fee_type)')
    .eq('id', propertyListingId)
    .maybeSingle()

  const propertyFees = listingForFees?.properties as unknown as
    | { cleaning_fee: number | null; cleaning_fee_type: string | null; pet_fee: number | null; pet_fee_type: string | null }
    | null
    | undefined
  const nights = nightsBetween(payload.check_in, payload.check_out)
  const serviceFeeAmount = calculateServiceFeeAmount(propertyFees, nights)

  // ── 3c. Story 37.4 — Auto-select and snapshot cancellation policy ──
  const stayDuration: StayDuration = nights >= 28 ? 'long' : 'short'

  const { data: propertyListingData, error: propertyListingError } = await adminClient
    .from('property_listings')
    .select('property_id')
    .eq('id', propertyListingId)
    .maybeSingle()

  if (propertyListingError || !propertyListingData?.property_id) {
    return {
      success: false,
      isDuplicate: false,
      error: `Property lookup failed: ${propertyListingError?.message ?? 'property_id missing'}`,
    }
  }

  const propertyIdForPolicy = propertyListingData.property_id

  let cancellationPolicyId: string | null = null
  let cancellationPolicySnapshot: CancellationPolicySnapshot | null = null

  if (propertyIdForPolicy) {
    const { data: policies } = await adminClient
      .from('property_cancellation_policies')
      .select('*')
      .eq('property_id', propertyIdForPolicy)
      .eq('is_long_stay', stayDuration === 'long')
      .eq('is_active', true)
      .order('policy_type')

    const selectedPolicy = policies?.find((p) => p.policy_type === 'moderate') || policies?.[0]

    if (selectedPolicy) {
      cancellationPolicyId = selectedPolicy.id
      cancellationPolicySnapshot = {
        policy_type: selectedPolicy.policy_type,
        is_long_stay: selectedPolicy.is_long_stay,
        full_refund_days: selectedPolicy.full_refund_days,
        partial_refund_days: selectedPolicy.partial_refund_days || null,
        partial_refund_percent: selectedPolicy.partial_refund_percent || null,
        non_refundable_discount_percent: selectedPolicy.non_refundable_discount_percent,
        captured_at: now,
      }
    }
  }

  // ── 4. Upsert reservation ─────────────────────────────────────
  const { data: res, error: resError } = await adminClient
    .from('reservations')
    .upsert(
      {
        external_id: payload.external_id,
        property_id: propertyIdForPolicy,
        property_listing_id: propertyListingId,
        guest_id: guest.id,
        check_in: payload.check_in,
        check_out: payload.check_out,
        num_guests: payload.number_of_guests ?? 1,
        ...(hasGuestName
          ? {
              guest_name: guestName,
              first_name: firstName,
              last_name: lastName,
            }
          : {}),
        ...(guestEmail ? { guest_email: guestEmail } : {}),
        total_amount: totalAmount,
        currency,
        commission_amount: commission.commissionAmount,
        commission_rate: commission.commissionRate,
        commission_calculated_at: now,
        service_fee_amount: serviceFeeAmount,
        discount_amount: 0,
        status,
        booking_source: 'booking_api',
        source: 'booking_api',
        channel_id: channelId,
        cancellation_policy_id: cancellationPolicyId,
        cancellation_policy_snapshot: cancellationPolicySnapshot,
        raw_data: payload.raw_data,
        organization_id: orgId,
        ...(status === 'cancelled' ? { cancelled_at: now } : {}),
        updated_at: now,
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

  // ── 6. Report metered billing usage ───────────────────────────
  void reportBookingFee(orgId)
  void reportRevenueFee(orgId, totalAmount)

  return { success: true, reservationId: res.id, isDuplicate: false }
}

function deriveStatus(status: string): 'confirmed' | 'cancelled' | 'pending_review' {
  const s = status.toUpperCase()
  if (s === 'CANCELLED' || s === 'CANCELED') return 'cancelled'
  if (s === 'CONFIRMED') return 'confirmed'
  return 'pending_review'
}
