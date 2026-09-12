import type { SupabaseClient } from '@supabase/supabase-js'
import { findOverlappingReservations } from '@/lib/ical/reservationSync'

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
