import type { SupabaseClient } from '@supabase/supabase-js'
import {
  buildStableExternalId,
  detectSource,
  type ICalReservationSource,
} from './bookingParser'
import type { ICalEvent } from './icalService'

export interface ReservationExternalIdContext {
  source: ICalReservationSource
  stableExternalId: string
  externalIdCandidates: string[]
}

export interface CancelMissingReservationsOptions {
  supabase: SupabaseClient
  propertyListingId: string
  organizationId?: string
  receivedExternalIds: Set<string>
  now?: string
  bookingSources?: string[]
}

const DEFAULT_BOOKING_SOURCES = ['ical_import', 'ical_auto_sync', 'booking', 'airbnb', 'flatio', 'vrbo']

export function buildReservationExternalIdContext(
  event: Pick<ICalEvent, 'uid' | 'summary' | 'description'>
): ReservationExternalIdContext {
  const source = detectSource(event.summary, event.description, event.uid)
  const stableExternalId = buildStableExternalId(event.uid, event.description, source)
  const externalIdCandidates = Array.from(
    new Set([stableExternalId, event.uid].filter(Boolean))
  )

  return {
    source,
    stableExternalId,
    externalIdCandidates,
  }
}

export async function cancelMissingReservations(
  options: CancelMissingReservationsOptions
): Promise<number> {
  const {
    supabase,
    propertyListingId,
    organizationId,
    receivedExternalIds,
    now = new Date().toISOString(),
    bookingSources = DEFAULT_BOOKING_SOURCES,
  } = options

  let query = supabase
    .from('reservations')
    .select('id, external_id, check_out')
    .eq('property_listing_id', propertyListingId)
    .neq('status', 'cancelled')
    .in('booking_source', bookingSources)

  if (organizationId) {
    query = query.eq('organization_id', organizationId)
  }

  const { data: candidates, error } = await query

  if (error) {
    throw new Error(`Failed to load cancellation candidates: ${error.message}`)
  }

  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  let cancelled = 0

  for (const reservation of candidates ?? []) {
    if (!reservation?.external_id) continue
    if (receivedExternalIds.has(reservation.external_id)) continue

    const checkOut = reservation.check_out
      ? new Date(`${reservation.check_out}T00:00:00.000Z`)
      : null

    if (!checkOut || checkOut < today) continue

    const { error: updateError } = await supabase
      .from('reservations')
      .update({
        status: 'cancelled',
        cancelled_at: now,
        updated_at: now,
      })
      .eq('id', reservation.id)

    if (updateError) {
      throw new Error(
        `Failed to cancel reservation ${reservation.id}: ${updateError.message}`
      )
    }

    cancelled++
  }

  return cancelled
}
