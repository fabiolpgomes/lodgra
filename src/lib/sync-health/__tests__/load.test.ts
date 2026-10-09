jest.mock('@/lib/dates/business-timezone.server', () => ({
  getOrganizationTimeZone: jest.fn().mockResolvedValue('Europe/Lisbon'),
}))

import { loadSyncHealth } from '../load'

function chain(result: { data: unknown; error: unknown }) {
  const q: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'in', 'is', 'neq', 'gte', 'lte', 'gt', 'not', 'or', 'order', 'limit']) q[m] = jest.fn(() => q)
  q.maybeSingle = jest.fn(() => Promise.resolve(result))
  q.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve)
  return q
}

const ORG = 'org-1'
const now = new Date('2026-10-08T12:00:00Z')

function db(tables: Record<string, Array<{ data: unknown; error?: unknown }>>) {
  const calls: Record<string, number> = {}
  return {
    from: jest.fn((table: string) => {
      const index = calls[table] = (calls[table] ?? -1) + 1
      const results = tables[table] ?? [{ data: [] }]
      const result = results[Math.min(index, results.length - 1)]
      return chain({ data: result.data, error: result.error ?? null })
    }),
  }
}

const base = {
  organizations: [{ data: { email_ical_reconciliation_enabled: true } }],
  email_connections: [{ data: [{ email: 'host@gmail.com', last_sync_at: '2026-10-08T11:50:00Z' }] }],
  property_listings: [{ data: [] }],
  sync_action_states: [{ data: [] }],
}

describe('loadSyncHealth', () => {
  it('does not flag a calendar reservation that already exists in Lodgra (Chantal, 28 ago – 7 dez)', async () => {
    const health = await loadSyncHealth(db({
      ...base,
      calendar_events: [{ data: [{ id: 'e1', property_id: 'p1', source_platform: 'airbnb', check_in: '2026-08-28', check_out: '2026-12-07', created_at: '2026-09-01T00:00:00Z', properties: { name: 'AHS 2 Dorms' } }] }],
      // 1st reservations query: placeholders, 2nd: trust, 3rd: existing stays for the events
      reservations: [{ data: [] }, { data: [] }, { data: [{ property_id: 'p1', check_in: '2026-08-28', check_out: '2026-12-07' }] }],
      raw_emails: [{ data: [] }, { data: [] }],
    }) as never, ORG, 'pt-BR', now)
    expect(health.actions).toEqual([])
  })

  it('hides incomplete e-mails whose extraction is being retried or already matched', async () => {
    const message = (id: string) => ({ id, subject: `Nova reserva ${id}`, sender: 'noreply@booking.com', received_at: '2026-09-26T00:00:00Z', provider_message_id: `host@gmail.com:${id}`, recipient: 'host@gmail.com', last_error: 'Required reservation fields are missing' })
    const health = await loadSyncHealth(db({
      ...base,
      calendar_events: [{ data: [] }],
      reservations: [{ data: [] }],
      raw_emails: [{ data: [] }, { data: [message('a1'), message('b2'), message('c3')] }],
      email_extractions: [{ data: [{ raw_email_id: 'a1', match_status: 'no_match' }, { raw_email_id: 'b2', match_status: 'auto_matched' }, { raw_email_id: 'c3', match_status: 'needs_review' }] }],
    }) as never, ORG, 'pt-BR', now)
    expect(health.actions.map(action => action.key)).toEqual(['message:c3'])
  })

  it('shows reservations flagged by a calendar check as reservation actions, not as a broken calendar', async () => {
    const health = await loadSyncHealth(db({
      ...base,
      property_listings: [{ data: [{ id: 'l1', property_id: 'p1', last_sync_error: 'Reconciliação pendente (1): 386d2a49-5ff9-424a-b77a-cc39d20ff787: datas alteradas', sync_error_count: 4, platforms: { name: 'booking', display_name: 'Booking.com' }, properties: { name: 'AHS Premium', is_active: true } }] }],
      calendar_events: [{ data: [] }],
      // placeholders, trust, changed reservations
      reservations: [{ data: [] }, { data: [] }, { data: [{ id: '386d2a49-5ff9-424a-b77a-cc39d20ff787', property_id: 'p1', source: 'booking', booking_reference: '6575495882', guest_name: 'Alexander Sidorov', check_in: '2026-10-20', check_out: '2026-10-27', properties: { name: 'AHS Premium' } }] }],
      raw_emails: [{ data: [] }, { data: [] }],
    }) as never, ORG, 'pt-BR', now)
    expect(health.actions.map(action => action.kind)).toEqual(['reservation_changed_on_platform'])
    expect(health.actions[0].detail).toContain('As datas mudaram')
  })

  it('refuses to report health when a source cannot be read', async () => {
    await expect(loadSyncHealth(db({ ...base, raw_emails: [{ data: null, error: { message: 'down' } }] }) as never, ORG, 'pt-BR', now))
      .rejects.toThrow('SYNC_HEALTH_UNAVAILABLE')
  })
})
