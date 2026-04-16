import { createAdminClient } from '@/lib/supabase/admin'
import { calculateCommission } from '@/lib/commission/service'
import type { PlanType } from '@/lib/commission/types'
import type { BookingWebhookPayload } from './webhook-validator'
import { deriveReservationStatus } from './webhook-validator'

export interface SyncResult {
  success: boolean
  reservationId?: string
  isDuplicate?: boolean
  error?: string
}

/**
 * Sync a Booking.com webhook reservation into our database
 *
 * Handles:
 * - Duplicate detection via external_id (idempotent)
 * - Organization_id propagation for RLS
 * - Status mapping from Booking.com to our schema
 * - Commission calculation based on plan
 *
 * Flow:
 * 1. Fetch property_listing by external property_id
 * 2. Check for duplicate via external_id (idempotent)
 * 3. Create/update guest record
 * 4. Calculate commission based on organization plan
 * 5. Upsert reservation with organization_id for RLS
 */
export async function syncBookingReservation(
  payload: BookingWebhookPayload,
  requestId: string
): Promise<SyncResult> {
  const adminClient = createAdminClient()

  try {
    const reservation = payload.data.reservation
    const externalId = reservation.id
    const propertyId = reservation.property_id

    console.log(
      `[Booking Sync] ${requestId} Processing reservation: ${externalId}`
    )

    // ──────────────────────────────────────────────────────────────
    // 1. FIND PROPERTY LISTING
    // ──────────────────────────────────────────────────────────────

    // Booking.com property_id format: e.g., "12345"
    // We need to find it in property_listings by matching against external data
    // For now, we'll look for it via property metadata or a lookup table
    // TODO: Store Booking.com property_id mapping in property_listings

    const { data: propertyListing, error: listingError } = await adminClient
      .from('property_listings')
      .select('id, property_id, properties!inner(id, organization_id)')
      .eq('platform_id', 'booking') // Assuming we mark Booking listings with platform_id='booking'
      // TODO: Add external_property_id column to match against propertyId
      .limit(1)
      .single()

    if (listingError || !propertyListing) {
      console.warn(
        `[Booking Sync] ${requestId} Property not found for Booking ID: ${propertyId}`
      )
      return {
        success: false,
        error: `Property listing not found for Booking ID: ${propertyId}`,
      }
    }

    const organizationId = (
      propertyListing.properties as unknown as { organization_id: string }
    )?.organization_id

    if (!organizationId) {
      console.warn(
        `[Booking Sync] ${requestId} Organization not found for listing: ${propertyListing.id}`
      )
      return {
        success: false,
        error: 'Organization not found',
      }
    }

    // ──────────────────────────────────────────────────────────────
    // 2. CHECK FOR DUPLICATE (IDEMPOTENT)
    // ──────────────────────────────────────────────────────────────

    const { data: existingReservation } = await adminClient
      .from('reservations')
      .select('id, status')
      .eq('external_id', externalId)
      .eq('property_listing_id', propertyListing.id)
      .maybeSingle()

    if (existingReservation) {
      console.log(
        `[Booking Sync] ${requestId} Duplicate detected: ${externalId} (idempotent skip)`
      )

      // Idempotent: return success but mark as duplicate
      return {
        success: true,
        reservationId: existingReservation.id,
        isDuplicate: true,
      }
    }

    // ──────────────────────────────────────────────────────────────
    // 3. CREATE/UPDATE GUEST RECORD
    // ──────────────────────────────────────────────────────────────

    const guestName = reservation.guest.name
    const nameParts = guestName.trim().split(' ')
    const firstName = nameParts[0] || 'Hóspede'
    const lastName = nameParts.slice(1).join(' ') || ''

    // Sanitize external ID for email generation (remove special chars)
    const sanitizedId = externalId.replace(/[^a-z0-9\-_.]/gi, '')
    const generatedEmail = `booking-${sanitizedId}@booking.local`

    const { data: guest, error: guestError } = await adminClient
      .from('guests')
      .upsert(
        {
          first_name: firstName,
          last_name: lastName,
          email: reservation.guest.email || generatedEmail,
          phone: null, // Booking.com webhook doesn't provide phone
          country: null, // Could be inferred from booking data
          organization_id: organizationId,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'email,organization_id',
          ignoreDuplicates: false,
        }
      )
      .select('id')
      .single()

    if (guestError || !guest) {
      console.error(
        `[Booking Sync] ${requestId} Failed to create/update guest:`,
        guestError
      )
      return {
        success: false,
        error: `Guest sync failed: ${guestError?.message || 'unknown'}`,
      }
    }

    // ──────────────────────────────────────────────────────────────
    // 4. CALCULATE COMMISSION
    // ──────────────────────────────────────────────────────────────

    const totalAmount = reservation.total_price.amount
    const currency = reservation.total_price.currency

    // Fetch organization plan
    const { data: org, error: orgError } = await adminClient
      .from('organizations')
      .select('plan')
      .eq('id', organizationId)
      .single()

    if (orgError || !org) {
      console.error(
        `[Booking Sync] ${requestId} Failed to fetch organization:`,
        orgError
      )
      return {
        success: false,
        error: `Organization fetch failed`,
      }
    }

    const commissionCalc = calculateCommission(
      totalAmount,
      (org.plan || 'starter') as PlanType
    )

    // ──────────────────────────────────────────────────────────────
    // 5. UPSERT RESERVATION
    // ──────────────────────────────────────────────────────────────

    const status = deriveReservationStatus(payload.event_type)

    const { data: res, error: resError } = await adminClient
      .from('reservations')
      .upsert(
        {
          // Unique key for upsert
          external_id: externalId,
          property_listing_id: propertyListing.id,

          // Guest & dates
          guest_id: guest.id,
          check_in: reservation.check_in,
          check_out: reservation.check_out,
          num_guests: reservation.number_of_guests,

          // Booking data
          guest_name: guestName,
          guest_email: reservation.guest.email || undefined,
          guest_phone: null,

          // Financial
          total_amount: totalAmount,
          currency: currency,
          commission_amount: commissionCalc.commissionAmount,
          commission_rate: commissionCalc.commissionRate,
          commission_calculated_at: new Date().toISOString(),

          // Status & source
          status: status,
          booking_source: 'booking_api',
          source: 'booking_api',

          // Multi-tenancy
          organization_id: organizationId,

          // Metadata
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'external_id,property_listing_id',
          ignoreDuplicates: false,
        }
      )
      .select('id')
      .single()

    if (resError || !res) {
      console.error(
        `[Booking Sync] ${requestId} Failed to upsert reservation:`,
        resError
      )
      return {
        success: false,
        error: `Reservation upsert failed: ${resError?.message || 'unknown'}`,
      }
    }

    console.log(
      `[Booking Sync] ${requestId} Reservation synced successfully: ${res.id}`
    )

    return {
      success: true,
      reservationId: res.id,
      isDuplicate: false,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(
      `[Booking Sync] ${requestId} Unexpected error:`,
      errorMsg,
      error
    )
    return {
      success: false,
      error: `Sync failed: ${errorMsg}`,
    }
  }
}
