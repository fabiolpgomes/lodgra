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
  receivedCalendarEventIds?: Set<string>
  now?: string
  /** Captured before fetching the feed, so older runs cannot cancel newer writes. */
  syncStartedAt?: string
  bookingSources?: string[]
}

export interface FindOverlappingReservationsOptions {
  supabase: SupabaseClient
  propertyId: string
  organizationId?: string
  checkIn: string
  checkOut: string
}

export interface RemoveMissingCalendarBlocksOptions {
  supabase: SupabaseClient
  organizationId: string
  propertyId: string
  propertyListingId: string
  receivedUids: Set<string>
  /** Captured before fetching the complete feed. */
  syncStartedAt?: string
}

export interface OverlappingReservation {
  id: string
  external_id: string | null
  property_listing_id: string | null
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

/**
 * Loads active reservations that intersect the half-open stay range [checkIn, checkOut).
 * Database errors are deliberately fatal: treating a failed lookup as an empty result
 * can create a double booking.
 */
export async function findOverlappingReservations(
  options: FindOverlappingReservationsOptions
): Promise<OverlappingReservation[]> {
  const { supabase, propertyId, organizationId, checkIn, checkOut } = options

  let query = supabase
    .from('reservations')
    .select('id, external_id, property_listing_id')
    .eq('property_id', propertyId)
    .not('status', 'eq', 'cancelled')
    .lt('check_in', checkOut)
    .gt('check_out', checkIn)

  if (organizationId) {
    query = query.eq('organization_id', organizationId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Falha ao verificar sobreposição de reservas: ${error.message}`)
  }

  return (data ?? []) as OverlappingReservation[]
}

export async function cancelMissingReservations(
  options: CancelMissingReservationsOptions
): Promise<number> {
  const {
    supabase,
    propertyListingId,
    organizationId,
    receivedExternalIds,
    receivedCalendarEventIds,
    now = new Date().toISOString(),
    syncStartedAt = now,
    bookingSources = DEFAULT_BOOKING_SOURCES,
  } = options

  const syncStartedTime = Date.parse(syncStartedAt)
  if (!Number.isFinite(syncStartedTime) || !Number.isFinite(Date.parse(now))) {
    throw new Error('Invalid synchronization timestamp for cancellation')
  }

  let query = supabase
    .from('reservations')
    .select('id, external_id, calendar_event_id, deleted_at, check_out, created_at, updated_at')
    .eq('property_listing_id', propertyListingId)
    .neq('status', 'cancelled')
    .neq('reservation_status', 'cancelled')
    .is('deleted_at', null)
    .in('booking_source', bookingSources)

  if (organizationId) {
    query = query.eq('organization_id', organizationId)
  }

  const { data: candidates, error } = await query

  if (error) {
    throw new Error(`Failed to load cancellation candidates: ${error.message}`)
  }

  const today = new Date(now)
  today.setUTCHours(0, 0, 0, 0)

  let cancelled = 0

  for (const reservation of candidates ?? []) {
    if (reservation?.deleted_at) continue
    if ((reservation?.created_at && Date.parse(reservation.created_at) > syncStartedTime) ||
        (reservation?.updated_at && Date.parse(reservation.updated_at) > syncStartedTime)) continue
    if (reservation?.calendar_event_id && receivedCalendarEventIds?.has(reservation.calendar_event_id)) continue
    if (!reservation?.external_id) continue
    if (receivedExternalIds.has(reservation.external_id)) continue

    const checkOut = reservation.check_out
      ? new Date(`${reservation.check_out}T00:00:00.000Z`)
      : null

    if (!checkOut || !Number.isFinite(checkOut.getTime()) || checkOut < today) continue

    let updateQuery = supabase
      .from('reservations')
      .update({
        status: 'cancelled',
        reservation_status: 'cancelled',
        cancelled_at: now,
        updated_at: now,
      })
      .eq('id', reservation.id)
      .eq('property_listing_id', propertyListingId)
      .neq('status', 'cancelled')
      .neq('reservation_status', 'cancelled')
      .is('deleted_at', null)

    if (organizationId) updateQuery = updateQuery.eq('organization_id', organizationId)
    // The row may have changed after selection. An empty RETURNING result means
    // another writer won; it is neither an error nor a successful cancellation.
    updateQuery = reservation.updated_at === null || reservation.updated_at === undefined
      ? updateQuery.is('updated_at', null)
      : updateQuery.eq('updated_at', reservation.updated_at)
    const { data: cancelledRows, error: updateError } = await updateQuery.select('id')

    if (updateError) {
      throw new Error(
        `Failed to cancel reservation ${reservation.id}: ${updateError.message}`
      )
    }

    cancelled += cancelledRows?.length ?? 0
  }

  return cancelled
}

/** Remove only unchanged blocks owned by this feed snapshot. */
export async function removeMissingCalendarBlocks(
  options: RemoveMissingCalendarBlocksOptions
): Promise<number> {
  const { supabase, organizationId, propertyId, propertyListingId, receivedUids,
    syncStartedAt = new Date().toISOString() } = options
  const syncStartedTime = Date.parse(syncStartedAt)
  if (!Number.isFinite(syncStartedTime)) throw new Error('Invalid synchronization timestamp for block cleanup')

  const { data: blocks, error } = await supabase.from('calendar_blocks')
    .select('id, external_uid, created_at, updated_at')
    .eq('organization_id', organizationId)
    .eq('property_id', propertyId)
    .eq('property_listing_id', propertyListingId)
    .eq('block_type', 'platform_sync')
    .not('external_uid', 'is', null)
  if (error) throw new Error(`Failed to load feed blocks: ${error.message}`)

  let removed = 0
  for (const block of blocks ?? []) {
    if (!block.external_uid || receivedUids.has(block.external_uid)) continue
    if ((block.created_at && Date.parse(block.created_at) > syncStartedTime) ||
        (block.updated_at && Date.parse(block.updated_at) > syncStartedTime)) continue

    let deletion = supabase.from('calendar_blocks').delete()
      .eq('id', block.id)
      .eq('organization_id', organizationId)
      .eq('property_id', propertyId)
      .eq('property_listing_id', propertyListingId)
      .eq('block_type', 'platform_sync')
      .eq('external_uid', block.external_uid)
    deletion = block.updated_at === null || block.updated_at === undefined
      ? deletion.is('updated_at', null)
      : deletion.eq('updated_at', block.updated_at)
    const { data: removedRows, error: deleteError } = await deletion.select('id')
    if (deleteError) throw new Error(`Failed to remove feed block ${block.id}: ${deleteError.message}`)
    removed += removedRows?.length ?? 0
  }
  return removed
}
