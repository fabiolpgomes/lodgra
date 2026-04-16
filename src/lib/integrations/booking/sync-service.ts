/**
 * Booking.com Synchronization Service
 *
 * Handles bidirectional sync of:
 * - Prices from our system → Booking.com
 * - Availability from our system → Booking.com
 * - Reservations from Booking.com → our system (already in webhook)
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { BookingComClient, createBookingComClient } from './client'

interface SyncPrice {
  date: string
  amount: number
  currency: string
}

interface SyncAvailability {
  date: string
  available: number
}

interface SyncResult {
  success: boolean
  pricesSynced?: number
  availabilitySynced?: number
  errors?: Array<{ type: string; message: string }>
}

/**
 * Fetch prices from our system for a property and date range
 */
async function fetchPropertyPrices(
  propertyId: string,
  startDate: string,
  endDate: string
): Promise<SyncPrice[]> {
  const adminClient = createAdminClient()

  // Get pricing rules for this property
  const { data: pricingRules, error } = await adminClient
    .from('pricing_rules')
    .select('date, price, currency')
    .eq('property_id', propertyId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })

  if (error) {
    console.error('[Booking Sync] Failed to fetch pricing rules:', error)
    return []
  }

  // Transform to SyncPrice format
  return (pricingRules || []).map((rule: { date: string; price: number; currency?: string }) => ({
    date: rule.date,
    amount: rule.price,
    currency: rule.currency || 'EUR', // Default to EUR
  }))
}

/**
 * Calculate available rooms for a property on a given date
 */
async function calculateAvailability(
  propertyId: string,
  date: string,
  maxCapacity: number
): Promise<number> {
  const adminClient = createAdminClient()

  // Get max_guests from property
  const { data: property } = await adminClient
    .from('properties')
    .select('max_guests')
    .eq('id', propertyId)
    .single()

  const capacity = property?.max_guests || maxCapacity

  // Count confirmed reservations on this date
  const { data: reservations, error } = await adminClient
    .from('reservations')
    .select('id')
    .eq('property_listing_id', propertyId) // This is actually listing ID
    .eq('status', 'confirmed')
    .lte('check_in', date)
    .gt('check_out', date) // check_out > date means still available

  if (error) {
    console.warn('[Booking Sync] Failed to count reservations:', error)
    return capacity // Default to full capacity on error
  }

  const booked = (reservations || []).length
  const available = Math.max(0, capacity - booked)

  return available
}

/**
 * Sync prices to Booking.com for a date range
 */
export async function syncPricesToBooking(
  propertyId: string,
  startDate: string,
  endDate: string,
  logPrefix: string = '[Booking Sync]'
): Promise<{ success: boolean; synced: number; error?: string }> {
  try {
    const adminClient = createAdminClient()

    // Get property listing with external property ID
    const { data: listing, error: listingError } = await adminClient
      .from('property_listings')
      .select('external_property_id, property_id')
      .eq('property_id', propertyId)
      .eq('platform_id', 'booking')
      .single()

    if (listingError || !listing?.external_property_id) {
      console.warn(
        `${logPrefix} Property not linked to Booking.com: ${propertyId}`
      )
      return { success: false, synced: 0, error: 'Not linked to Booking.com' }
    }

    // Fetch prices from our system
    const prices = await fetchPropertyPrices(propertyId, startDate, endDate)

    if (prices.length === 0) {
      console.info(
        `${logPrefix} No prices found for ${propertyId} (${startDate} to ${endDate})`
      )
      return { success: true, synced: 0 }
    }

    // Push to Booking.com
    const client = createBookingComClient(listing.external_property_id)
    const results = await client.pushPrices(prices)

    const successCount = results.filter((r) => r.success).length
    const failureCount = results.length - successCount

    console.info(
      `${logPrefix} Synced prices for ${propertyId}: ${successCount}/${results.length} successful`
    )

    if (failureCount > 0) {
      console.warn(`${logPrefix} ${failureCount} price updates failed`)
    }

    return { success: true, synced: successCount }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`${logPrefix} Failed to sync prices:`, errorMsg)
    return { success: false, synced: 0, error: errorMsg }
  }
}

/**
 * Sync availability to Booking.com for a date range
 */
export async function syncAvailabilityToBooking(
  propertyId: string,
  startDate: string,
  endDate: string,
  logPrefix: string = '[Booking Sync]'
): Promise<{ success: boolean; synced: number; error?: string }> {
  try {
    const adminClient = createAdminClient()

    // Get property listing with external property ID and capacity
    const { data: listing, error: listingError } = await adminClient
      .from('property_listings')
      .select('external_property_id, properties!inner(id, max_guests)')
      .eq('property_id', propertyId)
      .eq('platform_id', 'booking')
      .single()

    if (listingError || !listing?.external_property_id) {
      console.warn(
        `${logPrefix} Property not linked to Booking.com: ${propertyId}`
      )
      return { success: false, synced: 0, error: 'Not linked to Booking.com' }
    }

    const maxCapacity = (listing.properties as unknown as { max_guests?: number })?.max_guests || 4

    // Generate list of dates to sync
    const dates: string[] = []
    const current = new Date(startDate)
    const end = new Date(endDate)

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0]
      dates.push(dateStr)
      current.setDate(current.getDate() + 1)
    }

    // Calculate availability for each date
    const availability: SyncAvailability[] = []
    for (const date of dates) {
      const available = await calculateAvailability(
        listing.external_property_id,
        date,
        maxCapacity
      )
      availability.push({ date, available })
    }

    // Push to Booking.com
    const client = createBookingComClient(listing.external_property_id)
    const results = await client.pushAvailabilities(availability)

    const successCount = results.filter((r) => r.success).length

    console.info(
      `${logPrefix} Synced availability for ${propertyId}: ${successCount}/${results.length} successful`
    )

    return { success: true, synced: successCount }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`${logPrefix} Failed to sync availability:`, errorMsg)
    return { success: false, synced: 0, error: errorMsg }
  }
}

/**
 * Full sync: prices + availability for a property and date range
 */
export async function syncPropertyToBooking(
  propertyId: string,
  startDate: string,
  endDate: string
): Promise<SyncResult> {
  const requestId = crypto.randomUUID()
  const logPrefix = `[Booking Sync ${requestId}]`

  console.info(`${logPrefix} Starting full sync for property: ${propertyId}`)

  const priceResult = await syncPricesToBooking(
    propertyId,
    startDate,
    endDate,
    logPrefix
  )
  const availResult = await syncAvailabilityToBooking(
    propertyId,
    startDate,
    endDate,
    logPrefix
  )

  const errors: Array<{ type: string; message: string }> = []
  if (!priceResult.success && priceResult.error) {
    errors.push({ type: 'pricing', message: priceResult.error })
  }
  if (!availResult.success && availResult.error) {
    errors.push({ type: 'availability', message: availResult.error })
  }

  const success = priceResult.success && availResult.success

  console.info(
    `${logPrefix} Full sync complete: ${success ? 'success' : 'with errors'}`
  )

  return {
    success,
    pricesSynced: priceResult.synced,
    availabilitySynced: availResult.synced,
    errors: errors.length > 0 ? errors : undefined,
  }
}

/**
 * Sync all properties linked to Booking.com
 */
export async function syncAllPropertiesToBooking(
  daysAhead: number = 30
): Promise<{ totalSynced: number; successCount: number; failureCount: number }> {
  const adminClient = createAdminClient()

  console.info('[Booking Sync] Starting bulk sync for all properties')

  // Get all properties linked to Booking.com
  const { data: listings, error } = await adminClient
    .from('property_listings')
    .select('property_id, external_property_id')
    .eq('platform_id', 'booking')

  if (error || !listings) {
    console.error('[Booking Sync] Failed to fetch Booking-linked properties:', error)
    return { totalSynced: 0, successCount: 0, failureCount: 0 }
  }

  const startDate = new Date().toISOString().split('T')[0]
  const endDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]

  let successCount = 0
  let failureCount = 0
  let totalSynced = 0

  for (const listing of listings) {
    const result = await syncPropertyToBooking(
      listing.property_id,
      startDate,
      endDate
    )

    if (result.success) {
      successCount++
      totalSynced += (result.pricesSynced || 0) + (result.availabilitySynced || 0)
    } else {
      failureCount++
    }
  }

  console.info(
    `[Booking Sync] Bulk sync complete: ${successCount}/${listings.length} properties synced, ${totalSynced} total updates`
  )

  return { totalSynced, successCount, failureCount }
}
