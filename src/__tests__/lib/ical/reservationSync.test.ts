import type { SupabaseClient } from '@supabase/supabase-js'
import { cancelMissingReservations, findOverlappingReservations, removeMissingCalendarBlocks } from '@/lib/ical/reservationSync'

function buildClient(result: unknown) {
  const query: Record<string, jest.Mock | ((callback: (value: unknown) => unknown) => Promise<unknown>)> = {}
  query.select = jest.fn(() => query)
  query.eq = jest.fn(() => query)
  query.not = jest.fn(() => query)
  query.lt = jest.fn(() => query)
  query.gt = jest.fn(() => query)
  query.then = (callback: (value: unknown) => unknown) => Promise.resolve(result).then(callback)

  return {
    client: { from: jest.fn(() => query) } as unknown as SupabaseClient,
    query,
  }
}

describe('findOverlappingReservations', () => {
  it('returns active reservations that overlap the half-open stay range', async () => {
    const rows = [{ id: 'reservation-1', external_id: 'airbnb-1', property_listing_id: 'listing-1' }]
    const { client, query } = buildClient({ data: rows, error: null })

    await expect(findOverlappingReservations({
      supabase: client,
      propertyId: 'property-1',
      organizationId: 'organization-1',
      checkIn: '2026-09-10',
      checkOut: '2026-09-17',
    })).resolves.toEqual(rows)

    expect(query.eq).toHaveBeenCalledWith('property_id', 'property-1')
    expect(query.eq).toHaveBeenCalledWith('organization_id', 'organization-1')
    expect(query.not).toHaveBeenCalledWith('status', 'eq', 'cancelled')
    expect(query.lt).toHaveBeenCalledWith('check_in', '2026-09-17')
    expect(query.gt).toHaveBeenCalledWith('check_out', '2026-09-10')
  })

  it('fails closed when the overlap lookup fails', async () => {
    const { client } = buildClient({
      data: null,
      error: { message: 'Gateway Timeout' },
    })

    await expect(findOverlappingReservations({
      supabase: client,
      propertyId: 'property-1',
      checkIn: '2026-09-10',
      checkOut: '2026-09-17',
    })).rejects.toThrow('Falha ao verificar sobreposição de reservas: Gateway Timeout')
  })
})

describe('cancelMissingReservations with linked iCal events', () => {
  const row = { id: 'reservation-1', external_id: 'booking-confirmation-code', calendar_event_id: 'event-1', check_out: '2026-09-20', deleted_at: null, created_at: '2026-09-10T00:00:00Z', updated_at: '2026-09-12T00:00:00Z' }
  function clientFor(rows: unknown[], error: { message: string } | null = null, returnedIds: { id: string }[] = [{ id: 'reservation-1' }]) {
    const updates: unknown[] = []
    const write = {
      eq: jest.fn(() => write), neq: jest.fn(() => write), is: jest.fn(() => write),
      select: jest.fn(async () => ({ data: returnedIds, error })),
    }
    const read = {
      select: jest.fn(() => read), eq: jest.fn(() => read), neq: jest.fn(() => read), is: jest.fn(() => read), in: jest.fn(() => read),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(resolve),
    }
    const client = { from: jest.fn(() => ({ ...read, update: (payload: unknown) => { updates.push(payload); return write } })) } as unknown as SupabaseClient
    return { client, updates, write }
  }
  it('keeps a received linked event even when the external booking code differs', async () => {
    const { client, updates } = clientFor([row])
    expect(await cancelMissingReservations({ supabase: client, propertyListingId: 'listing', organizationId: 'org',
      receivedExternalIds: new Set(['opaque-uid']), receivedCalendarEventIds: new Set(['event-1']), now: '2026-09-14T00:00:00Z' })).toBe(0)
    expect(updates).toEqual([])
  })
  it('cancels both status columns when a complete feed no longer contains the reservation', async () => {
    const { client, updates } = clientFor([row])
    expect(await cancelMissingReservations({ supabase: client, propertyListingId: 'listing', receivedExternalIds: new Set(),
      receivedCalendarEventIds: new Set(), now: '2026-09-14T00:00:00Z' })).toBe(1)
    expect(updates).toEqual([expect.objectContaining({ status: 'cancelled', reservation_status: 'cancelled' })])
  })
  it('does not mutate soft-deleted reservations', async () => {
    const { client, updates } = clientFor([{ ...row, deleted_at: '2026-09-12T00:00:00Z' }])
    expect(await cancelMissingReservations({ supabase: client, propertyListingId: 'listing', receivedExternalIds: new Set(), now: '2026-09-14T00:00:00Z' })).toBe(0)
    expect(updates).toEqual([])
  })
  it('propagates a failed cancellation instead of claiming a successful sync', async () => {
    const { client } = clientFor([row], { message: 'Write failed' })
    await expect(cancelMissingReservations({ supabase: client, propertyListingId: 'listing', receivedExternalIds: new Set(), now: '2026-09-14T00:00:00Z' })).rejects.toThrow('Write failed')
  })

  it.each(['created_at', 'updated_at'])('preserves a reservation whose %s is newer than the fetched snapshot', async (field) => {
    const { client, updates } = clientFor([{ ...row, [field]: '2026-09-14T00:05:00Z' }])
    expect(await cancelMissingReservations({ supabase: client, propertyListingId: 'listing', organizationId: 'org',
      receivedExternalIds: new Set(), syncStartedAt: '2026-09-14T00:00:00Z', now: '2026-09-14T00:10:00Z' })).toBe(0)
    expect(updates).toEqual([])
  })

  it('conditions the cancellation on the observed version and tenant/listing/active scope', async () => {
    const { client, write } = clientFor([row])
    expect(await cancelMissingReservations({ supabase: client, propertyListingId: 'listing', organizationId: 'org',
      receivedExternalIds: new Set(), syncStartedAt: '2026-09-14T00:00:00Z', now: '2026-09-14T00:10:00Z' })).toBe(1)
    expect(write.eq).toHaveBeenCalledWith('id', row.id)
    expect(write.eq).toHaveBeenCalledWith('property_listing_id', 'listing')
    expect(write.eq).toHaveBeenCalledWith('organization_id', 'org')
    expect(write.eq).toHaveBeenCalledWith('updated_at', row.updated_at)
    expect(write.neq).toHaveBeenCalledWith('status', 'cancelled')
    expect(write.neq).toHaveBeenCalledWith('reservation_status', 'cancelled')
    expect(write.is).toHaveBeenCalledWith('deleted_at', null)
    expect(write.select).toHaveBeenCalledWith('id')
  })

  it('does not report cancellation when a concurrent update wins the compare-and-set', async () => {
    const { client, updates, write } = clientFor([row], null, [])
    expect(await cancelMissingReservations({ supabase: client, propertyListingId: 'listing', organizationId: 'org',
      receivedExternalIds: new Set(), now: '2026-09-14T00:00:00Z' })).toBe(0)
    expect(updates).toHaveLength(1)
    expect(write.eq).toHaveBeenCalledWith('updated_at', row.updated_at)
  })

  it('uses IS NULL for a legacy reservation with no recorded version', async () => {
    const { client, write } = clientFor([{ ...row, updated_at: null }])
    expect(await cancelMissingReservations({ supabase: client, propertyListingId: 'listing',
      receivedExternalIds: new Set(), now: '2026-09-14T00:00:00Z' })).toBe(1)
    expect(write.is).toHaveBeenCalledWith('updated_at', null)
    expect(write.eq).not.toHaveBeenCalledWith('updated_at', null)
  })

  it('rejects an invalid snapshot timestamp before querying', async () => {
    const { client, updates } = clientFor([row])
    await expect(cancelMissingReservations({ supabase: client, propertyListingId: 'listing', receivedExternalIds: new Set(),
      syncStartedAt: 'invalid', now: '2026-09-14T00:00:00Z' })).rejects.toThrow('Invalid synchronization timestamp')
    expect(client.from).not.toHaveBeenCalled()
    expect(updates).toEqual([])
  })
})

describe('removeMissingCalendarBlocks', () => {
  const block = { id: 'block-1', external_uid: 'old-feed-uid', created_at: '2026-09-10T00:00:00Z', updated_at: '2026-09-12T00:00:00Z' }
  const options = { organizationId: 'org', propertyId: 'property', propertyListingId: 'listing',
    receivedUids: new Set<string>(), syncStartedAt: '2026-09-14T00:00:00Z' }
  function clientFor(rows = [block], removedRows = [{ id: block.id }], errors: { read?: string; write?: string } = {}) {
    const deletion = { eq: jest.fn(() => deletion), is: jest.fn(() => deletion),
      select: jest.fn(async () => ({ data: removedRows, error: errors.write ? { message: errors.write } : null })) }
    const query = { select: jest.fn(() => query), eq: jest.fn(() => query), not: jest.fn(() => query),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: rows, error: errors.read ? { message: errors.read } : null }).then(resolve) }
    const deleteFn = jest.fn(() => deletion)
    const client = { from: jest.fn(() => ({ ...query, delete: deleteFn })) } as unknown as SupabaseClient
    return { client, deletion, query, deleteFn }
  }
  it('removes an absent unchanged block with full ownership and version predicates', async () => {
    const { client, deletion, query } = clientFor()
    expect(await removeMissingCalendarBlocks({ ...options, supabase: client })).toBe(1)
    for (const [field, value] of [['organization_id','org'],['property_id','property'],['property_listing_id','listing'],['block_type','platform_sync']]) {
      expect(query.eq).toHaveBeenCalledWith(field, value)
      expect(deletion.eq).toHaveBeenCalledWith(field, value)
    }
    expect(deletion.eq).toHaveBeenCalledWith('external_uid', block.external_uid)
    expect(deletion.eq).toHaveBeenCalledWith('updated_at', block.updated_at)
    expect(deletion.select).toHaveBeenCalledWith('id')
  })
  it('preserves received blocks', async () => {
    const { client, deleteFn } = clientFor()
    expect(await removeMissingCalendarBlocks({ ...options, supabase: client, receivedUids: new Set([block.external_uid]) })).toBe(0)
    expect(deleteFn).not.toHaveBeenCalled()
  })
  it.each(['created_at','updated_at'])('preserves a block with %s newer than this feed snapshot', async (field) => {
    const { client, deleteFn } = clientFor([{ ...block, [field]: '2026-09-14T00:05:00Z' }])
    expect(await removeMissingCalendarBlocks({ ...options, supabase: client })).toBe(0)
    expect(deleteFn).not.toHaveBeenCalled()
  })
  it('reports zero removals when a concurrent refresh defeats the version check', async () => {
    const { client, deletion } = clientFor([block], [])
    expect(await removeMissingCalendarBlocks({ ...options, supabase: client })).toBe(0)
    expect(deletion.eq).toHaveBeenCalledWith('updated_at', block.updated_at)
  })
  it('propagates read errors without deleting anything', async () => {
    const { client, deleteFn } = clientFor([], [], { read: 'Database unavailable' })
    await expect(removeMissingCalendarBlocks({ ...options, supabase: client })).rejects.toThrow('Failed to load feed blocks')
    expect(deleteFn).not.toHaveBeenCalled()
  })
  it('propagates deletion errors instead of reporting successful cleanup', async () => {
    const { client } = clientFor([block], [], { write: 'Write failed' })
    await expect(removeMissingCalendarBlocks({ ...options, supabase: client })).rejects.toThrow('Failed to remove feed block')
  })
})
