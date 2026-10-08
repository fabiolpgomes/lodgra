import { buildSyncHealth, propertySyncStatus, type SyncAction, type SyncHealthInput } from '../actions'
import { planSyncAlerts, renderSyncAlertEmail, type AlertState } from '../alerts'

const now = new Date('2026-10-08T12:00:00Z')
const health = (overrides: Partial<SyncHealthInput> = {}) => buildSyncHealth({
  locale: 'pt-BR', now, reconciliationEnabled: true,
  gmail: { email: 'host@gmail.com', last_sync_at: '2026-10-08T11:45:00Z' },
  oldestQueuedAt: null, failingListings: [], placeholderReservations: [], unlinkedReservationEvents: [], changedReservations: [],
  reviewMessages: [], recentPlatformReservations: [], dismissedKeys: new Set(), ...overrides,
})
const guest = { id: 'r1', property_id: 'p1', property_name: 'AHS T1', source: 'booking', booking_reference: '5159950202', check_in: '2026-10-10', check_out: '2026-10-12', created_at: '2026-10-08T10:00:00Z' }
const listing = (count: number) => ({ id: 'l1', property_id: 'p2', property_name: 'AHS Premium Apart', platform: 'booking', last_sync_error: 'Failed to fetch iCal: 400 Bad Request', sync_error_count: count })
const state = (key: string, notified: string | null, dismissed: string | null = null): AlertState =>
  ({ action_key: key, dismissed_at: dismissed, first_notified_at: notified, last_notified_at: notified })

describe('planSyncAlerts', () => {
  it('e-mails a new problem at once', () => {
    const plan = planSyncAlerts(health({ placeholderReservations: [guest] }).actions, [], now)
    expect(plan.send).toBe(true)
    expect(plan.items).toEqual([expect.objectContaining({ isNew: true, action: expect.objectContaining({ key: 'guest:r1' }) })])
  })

  it('stays quiet until a day has passed, then reminds', () => {
    const actions = health({ placeholderReservations: [guest] }).actions
    expect(planSyncAlerts(actions, [state('guest:r1', '2026-10-08T06:00:00Z')], now).send).toBe(false)
    const reminder = planSyncAlerts(actions, [state('guest:r1', '2026-10-07T12:10:00Z')], now)
    expect(reminder.send).toBe(true)
    expect(reminder.items[0].isNew).toBe(false)
  })

  it('never e-mails a dismissed problem', () => {
    const actions = health({ placeholderReservations: [guest] }).actions
    expect(planSyncAlerts(actions, [state('guest:r1', null, '2026-10-08T09:00:00Z')], now)).toMatchObject({ send: false, items: [] })
  })

  it('ignores a calendar hiccup but alerts when it keeps failing', () => {
    expect(planSyncAlerts(health({ failingListings: [listing(1)] }).actions, [], now).send).toBe(false)
    expect(planSyncAlerts(health({ failingListings: [listing(3)] }).actions, [], now).send).toBe(true)
  })

  it('does not e-mail to-dos that only belong in the panel', () => {
    const actions = health({ unlinkedReservationEvents: [{ id: 'e1', property_id: 'p1', property_name: 'X', source_platform: 'airbnb', check_in: '2026-10-11', check_out: '2026-10-19', created_at: '2026-10-06T00:00:00Z' }] }).actions
    expect(actions).toHaveLength(1)
    expect(planSyncAlerts(actions, [], now).send).toBe(false)
  })

  it('clears the bookkeeping of resolved problems so a relapse alerts again', () => {
    const plan = planSyncAlerts([], [state('guest:old', '2026-10-07T12:00:00Z'), state('message:x', null, '2026-10-01T00:00:00Z')], now)
    expect(plan.resolvedKeys).toEqual(['guest:old'])
  })

  it('includes ongoing problems in a digest triggered by a new one', () => {
    const actions = health({ placeholderReservations: [guest], gmail: { email: 'host@gmail.com', last_sync_at: '2026-10-08T06:00:00Z' } }).actions
    const plan = planSyncAlerts(actions, [state('guest:r1', '2026-10-08T06:00:00Z')], now)
    expect(plan.send).toBe(true)
    expect(plan.items.map(item => [item.action.kind, item.isNew])).toEqual([['gmail_stale', true], ['complete_guest', false]])
  })
})

describe('renderSyncAlertEmail', () => {
  it('names the problem, links each fix and escapes tenant text', () => {
    const actions: SyncAction[] = health({ placeholderReservations: [{ ...guest, property_name: '<b>T1</b>' }] }).actions
    const email = renderSyncAlertEmail(planSyncAlerts(actions, [], now), { appUrl: 'https://www.lodgra.io/', locale: 'pt-BR', organizationName: 'AHS' })
    expect(email.subject).toBe('Lodgra · 1 ação pendente · AHS')
    expect(email.html).toContain('https://www.lodgra.io/pt-BR/reservations/r1/edit')
    expect(email.html).toContain('&lt;b&gt;T1&lt;/b&gt;')
    expect(email.html).not.toContain('<b>T1</b>')
    expect(email.text).toContain('[NOVO] Booking 5159950202')
  })

  it('says the sync stopped when a source is down', () => {
    const actions = health({ gmail: { email: 'host@gmail.com', last_sync_at: '2026-10-08T06:00:00Z' } }).actions
    expect(renderSyncAlertEmail(planSyncAlerts(actions, [], now), { appUrl: 'https://x.io', locale: 'pt-BR', organizationName: null }).subject)
      .toBe('Lodgra · Sincronização parada')
  })
})

describe('propertySyncStatus', () => {
  it('is green, amber or red for the property only', () => {
    const h = health({ placeholderReservations: [guest], failingListings: [listing(1)] })
    expect(propertySyncStatus(h, 'p1')).toMatchObject({ tone: 'attention', label: '1 ação pendente' })
    expect(propertySyncStatus(h, 'p2')).toMatchObject({ tone: 'failing', label: 'Calendário a falhar' })
    expect(propertySyncStatus(h, 'p3')).toMatchObject({ tone: 'ok', label: 'Sincronização em dia' })
  })
})
