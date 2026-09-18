import type { SupabaseClient } from '@supabase/supabase-js'
import { hasActiveReconciledReservation } from '../reconciliationAvailability'

const active = {
  status: 'confirmed', reservation_status: 'confirmed', deleted_at: null,
  check_in: '2026-09-16', check_out: '2026-09-20',
}

function setup(data: unknown, error: { message: string } | null = null) {
  const query = {
    select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data, error }),
  }
  const supabase = { from: jest.fn().mockReturnValue(query) } as unknown as SupabaseClient
  return { query, input: {
    supabase, organizationId: 'org', propertyId: 'property', propertyListingId: 'listing',
    calendarEventId: 'event', checkIn: active.check_in, checkOut: active.check_out,
  } }
}

it('accepts an active reservation with exact dates and scopes its lookup to the event and tenant', async () => {
  const { input, query } = setup(active)
  expect(await hasActiveReconciledReservation(input)).toBe(true)
  expect(query.eq.mock.calls).toEqual([
    ['organization_id', 'org'], ['property_id', 'property'],
    ['property_listing_id', 'listing'], ['calendar_event_id', 'event'],
  ])
})

it.each([
  ['missing', null],
  ['legacy cancellation', { ...active, status: 'cancelled' }],
  ['canonical cancellation', { ...active, reservation_status: 'cancelled' }],
  ['deleted', { ...active, deleted_at: '2026-09-14T00:00:00Z' }],
  ['check-in changed', { ...active, check_in: '2026-09-17' }],
  ['check-out changed', { ...active, check_out: '2026-09-19' }],
])('requires a provisional block when the linked reservation is %s', async (_label, data) => {
  expect(await hasActiveReconciledReservation(setup(data).input)).toBe(false)
})

it('fails closed on a database lookup error', async () => {
  await expect(hasActiveReconciledReservation(setup(null, { message: 'unavailable' }).input))
    .rejects.toThrow('Falha ao verificar reserva reconciliada: unavailable')
})
