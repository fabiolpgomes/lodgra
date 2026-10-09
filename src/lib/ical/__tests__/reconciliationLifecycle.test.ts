import type { SupabaseClient } from '@supabase/supabase-js'
import { assertReconciledFeedConsistency, type ReconciledFeedInput } from '../reconciliationLifecycle'

const row = {
  id: 'reservation-1', calendar_event_id: 'event-1', status: 'confirmed',
  reservation_status: 'confirmed', deleted_at: null, check_in: '2099-10-03', check_out: '2099-10-07',
}
const current = { checkIn: row.check_in, checkOut: row.check_out }
function setup(rows: unknown[] = [row], error: unknown = null) {
  const query = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(), gte: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue({ data: rows, error }) }
  const stagedQuery = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue({ data: [], error: null }), update: jest.fn().mockReturnThis(),
    in: jest.fn().mockResolvedValue({ error: null }) }
  const from = jest.fn((table: string) => table === 'calendar_events' ? stagedQuery : query)
  const input: ReconciledFeedInput = { supabase: { from } as unknown as SupabaseClient,
    organizationId: 'org-1', propertyListingId: 'listing-1', feedEvents: new Map([['event-1', current]]) }
  return { query, stagedQuery, from, input }
}

it('checks the correct tenant/listing without mutating the commercial reservation', async () => {
  const { query, input, from } = setup()
  await expect(assertReconciledFeedConsistency(input)).resolves.toBeUndefined()
  expect(query.eq.mock.calls).toEqual([['organization_id', 'org-1'], ['property_listing_id', 'listing-1']])
  expect(from.mock.calls).toEqual([['calendar_events'], ['reservations']])
})

it.each([
  ['missing event (including empty feed)', undefined, 'evento ausente'],
  ['new dates', { ...current, checkOut: '2099-10-11' }, 'datas alteradas'],
  ['explicit cancellation', { ...current, status: 'CANCELLED' }, 'cancelamento no iCal'],
])('surfaces %s as pending reconciliation instead of changing status or financial values', async (_label, event, reason) => {
  const { input } = setup()
  input.feedEvents = new Map(event ? [['event-1', event]] : [])
  await expect(assertReconciledFeedConsistency(input)).rejects.toThrow(reason)
})

it.each([
  { ...row, status: 'cancelled' }, { ...row, reservation_status: 'cancelled' },
  { ...row, deleted_at: '2026-10-01' },
])('does not flag a booking already cancelled/deleted by its owner', async (reservation) => {
  const { input } = setup([reservation])
  input.feedEvents.clear()
  await expect(assertReconciledFeedConsistency(input)).resolves.toBeUndefined()
})

it('fails closed if the reservation lookup fails', async () => {
  await expect(assertReconciledFeedConsistency(setup([], { message: 'offline' }).input)).rejects.toThrow('offline')
})


it('invalidates only missing unmatched events, leaving linked reservations untouched', async () => {
  const { input, stagedQuery } = setup()
  stagedQuery.limit.mockResolvedValue({ data: [{ id: 'event-1' }, { id: 'absent' }] as never[], error: null })
  await assertReconciledFeedConsistency(input)
  expect(stagedQuery.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'ignored' }))
  expect(stagedQuery.in).toHaveBeenCalledWith('id', ['absent'])
  expect(stagedQuery.eq).toHaveBeenCalledWith('status', 'unmatched')
  expect(stagedQuery.eq).toHaveBeenCalledWith('organization_id', 'org-1')
  expect(stagedQuery.eq).toHaveBeenCalledWith('property_listing_id', 'listing-1')
})

it('fails closed when missing-event invalidation fails', async () => {
  const { input, stagedQuery } = setup()
  stagedQuery.limit.mockResolvedValue({ data: [{ id: 'absent' }] as never[], error: null })
  stagedQuery.in.mockResolvedValue({ error: { message: 'offline' } as never })
  await expect(assertReconciledFeedConsistency(input)).rejects.toThrow('invalidar eventos ausentes')
})

it('does not treat a stay that already started and left the Booking export as a cancellation (6575495882)', async () => {
  const { input } = setup([{ ...row, check_in: '2026-10-04', check_out: '2026-10-11' }])
  input.feedEvents = new Map()
  input.today = new Date('2026-10-08T09:30:00Z')
  await expect(assertReconciledFeedConsistency(input)).resolves.toBeUndefined()
})

it('still flags a future stay that left the feed', async () => {
  const { input } = setup([{ ...row, check_in: '2026-10-20', check_out: '2026-10-25' }])
  input.feedEvents = new Map()
  input.today = new Date('2026-10-08T09:30:00Z')
  await expect(assertReconciledFeedConsistency(input)).rejects.toThrow('evento ausente')
})

it('reads the flagged reservations back from the stored error', () => {
  const { parseReconciliationIssues } = jest.requireActual('../reconciliationLifecycle')
  expect(parseReconciliationIssues('Reconciliação pendente (2): 386d2a49-5ff9-424a-b77a-cc39d20ff787: evento ausente; 11111111-2222-3333-4444-555555555555: datas alteradas'))
    .toEqual([
      { reservationId: '386d2a49-5ff9-424a-b77a-cc39d20ff787', reason: 'evento ausente' },
      { reservationId: '11111111-2222-3333-4444-555555555555', reason: 'datas alteradas' },
    ])
  expect(parseReconciliationIssues('Failed to fetch iCal: 404')).toEqual([])
})

it('"hoje" é o dia da organização: 01h30 UTC de 09/10 ainda é 08/10 no Brasil', async () => {
  // estadia começa 09/10: em Lisboa já começou (não é cancelamento); em São Paulo ainda não começou (é futura)
  const stay = { ...row, check_in: '2026-10-09', check_out: '2026-10-12' }
  const lisbon = setup([stay]); lisbon.input.feedEvents = new Map(); lisbon.input.today = new Date('2026-10-09T01:30:00Z')
  lisbon.input.timeZone = 'Europe/Lisbon'
  await expect(assertReconciledFeedConsistency(lisbon.input)).resolves.toBeUndefined()
  const sp = setup([stay]); sp.input.feedEvents = new Map(); sp.input.today = new Date('2026-10-09T01:30:00Z')
  sp.input.timeZone = 'America/Sao_Paulo'
  await expect(assertReconciledFeedConsistency(sp.input)).rejects.toThrow('evento ausente')
  expect(sp.query.gte).toHaveBeenCalledWith('check_out', '2026-10-08')
})
