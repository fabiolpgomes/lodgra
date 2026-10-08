import { buildSyncHealth, describeCalendarError, formatStay, type SyncHealthInput } from '../actions'

const now = new Date('2026-10-08T12:00:00Z')
const input = (overrides: Partial<SyncHealthInput> = {}): SyncHealthInput => ({
  locale: 'pt-BR', now, reconciliationEnabled: true,
  gmail: { email: 'host@gmail.com', last_sync_at: '2026-10-08T11:45:00Z' },
  oldestQueuedAt: null, failingListings: [], placeholderReservations: [], unlinkedReservationEvents: [], changedReservations: [],
  reviewMessages: [], recentPlatformReservations: [], dismissedKeys: new Set(), ...overrides,
})

describe('buildSyncHealth', () => {
  it('is all clear when every source works and nothing waits for the host', () => {
    expect(buildSyncHealth(input())).toMatchObject({ status: 'ok', actions: [] })
  })

  it('names the reservation, property and stay of a guest to complete, with a direct link', () => {
    const health = buildSyncHealth(input({ placeholderReservations: [{
      id: 'res-1', property_id: 'prop-t1', property_name: 'AHS T1 Armação de Pêra', source: 'booking',
      booking_reference: '5159950202', check_in: '2026-10-03', check_out: '2026-10-07', created_at: '2026-10-08T00:00:00Z',
    }] }))
    expect(health.status).toBe('attention')
    expect(health.actions[0]).toMatchObject({
      kind: 'complete_guest', title: 'Booking 5159950202 · AHS T1 Armação de Pêra · 3–7 out',
      href: '/pt-BR/reservations/res-1/edit', reservationId: 'res-1', completable: true, cta: 'Completar',
    })
  })

  it('reports a stopped sync before anything else when Gmail, the queue or a calendar fail', () => {
    const health = buildSyncHealth(input({
      gmail: { email: 'host@gmail.com', last_sync_at: '2026-09-12T08:15:00Z' },
      oldestQueuedAt: '2026-10-08T10:00:00Z',
      failingListings: [{ id: 'l1', property_id: 'p1', property_name: 'AHS Premium Apart', platform: 'booking', last_sync_error: 'Failed to fetch iCal: 404 Not Found', sync_error_count: 3 }],
      placeholderReservations: [{ id: 'r', property_id: 'p', property_name: null, source: 'booking', booking_reference: '1', check_in: '2026-10-10', check_out: '2026-10-12', created_at: null }],
    }))
    expect(health.status).toBe('stopped')
    expect(health.actions.map(action => action.kind)).toEqual(['gmail_stale', 'queue_stalled', 'calendar_failing', 'complete_guest'])
    expect(health.actions[2]).toMatchObject({ title: 'Calendário Booking a falhar · AHS Premium Apart', href: '/pt-BR/properties/p1' })
    expect(health.actions[2].detail).toBe('Falhou nas últimas 3 leituras: o link deixou de existir na plataforma. Copie o link de exportação novo e cole-o no anúncio.')
    expect(health.actions[3].title).toContain('imóvel não identificado')
  })

  it('waits 24 h before flagging a calendar reservation that has no e-mail yet', () => {
    const event = { id: 'e1', property_id: 'p1', property_name: 'AHS Casa do Moinho', source_platform: 'airbnb', check_in: '2026-10-11', check_out: '2026-10-19' }
    expect(buildSyncHealth(input({ unlinkedReservationEvents: [{ ...event, created_at: '2026-10-08T01:00:00Z' }] })).actions).toEqual([])
    expect(buildSyncHealth(input({ unlinkedReservationEvents: [{ ...event, created_at: '2026-10-07T01:00:00Z' }] })).actions[0])
      .toMatchObject({ title: 'Reserva Airbnb · AHS Casa do Moinho · 11–19 out', cta: 'Ver reserva' })
  })

  it('shows the subject of a message and links to it in the right Gmail account', () => {
    const [action] = buildSyncHealth(input({ reviewMessages: [{
      id: 'm1', subject: 'Cancelado: reserva HMF2AA4AQ9 de 8 – 16 de ago.', sender: 'Airbnb <automated@airbnb.com>',
      received_at: '2026-07-12T12:35:14Z', provider_message_id: 'host@gmail.com:18f3a2b4c5d6e7f8', recipient: 'host@gmail.com',
      last_error: 'RESERVATION_CHANGE_REQUIRES_REVIEW',
    }] })).actions
    expect(action).toMatchObject({
      title: 'Airbnb · “Cancelado: reserva HMF2AA4AQ9 de 8 – 16 de ago.”', external: true, cta: 'Abrir no Gmail',
      href: 'https://mail.google.com/mail/?authuser=host%40gmail.com#all/18f3a2b4c5d6e7f8',
    })
  })

  it('hides dismissed problems', () => {
    const health = buildSyncHealth(input({
      unlinkedReservationEvents: [{ id: 'e1', property_id: 'p1', property_name: 'X', source_platform: 'airbnb', check_in: '2026-10-11', check_out: '2026-10-19', created_at: '2026-10-01T00:00:00Z' }],
      dismissedKeys: new Set(['event:e1']),
    }))
    expect(health).toMatchObject({ status: 'ok', actions: [] })
  })

  it('measures how many recent platform reservations arrived complete', () => {
    expect(buildSyncHealth(input({ recentPlatformReservations: [
      { first_name: 'Eivind', guest_name: 'Eivind L', total_amount: 900 },
      { first_name: 'Hóspede', guest_name: 'Hóspede', total_amount: null },
      { first_name: 'Ana', guest_name: 'Ana Silva', total_amount: null },
      { first_name: 'Rui', guest_name: 'Rui Costa', total_amount: 300 },
    ] })).trust).toEqual({ windowDays: 30, total: 4, complete: 2, percent: 50 })
  })

  it('does not flag Gmail when the tenant has not enabled e-mail reconciliation', () => {
    expect(buildSyncHealth(input({ reconciliationEnabled: false, gmail: null })).actions).toEqual([])
  })
})

describe('reservations changed on the platform', () => {
  it('names the reservation and links to it instead of reporting a broken calendar', () => {
    const [action] = buildSyncHealth(input({ changedReservations: [{
      id: 'r9', property_id: 'p1', property_name: 'AHS Premium Apart', source: 'booking', booking_reference: '6575495882',
      guest_name: 'Alexander Sidorov', check_in: '2026-10-20', check_out: '2026-10-25', reason: 'evento ausente',
    }] })).actions
    expect(action).toMatchObject({
      kind: 'reservation_changed_on_platform', severity: 'attention', href: '/pt-BR/reservations/r9', cta: 'Abrir reserva',
      title: 'Booking 6575495882 · Alexander Sidorov · AHS Premium Apart · 20–25 out',
    })
    expect(action.detail).toContain('Confirme se foi cancelada')
  })
})

describe('formatStay', () => {
  it.each([
    ['2026-10-03', '2026-10-07', '3–7 out'],
    ['2026-10-28', '2026-11-03', '28 out – 3 nov'],
    ['2026-12-28', '2027-01-03', '28 dez 2026 – 3 jan 2027'],
  ])('%s → %s', (checkIn, checkOut, expected) => expect(formatStay(checkIn, checkOut)).toBe(expected))
})

describe('describeCalendarError', () => {
  it.each([
    ['Failed to fetch iCal: 403 Forbidden', /recusou o acesso/],
    ['Response is not valid iCal (got <html>...)', /não devolve um calendário/],
    ['The operation was aborted due to timeout', /não respondeu/],
    ['Failed to fetch iCal: 503 Service Unavailable', /erro temporário/],
    ['Ambiguous iCal feed: duplicate UID', /evento inválido/],
    [null, /Confirme o link/],
  ])('%s', (error, expected) => expect(describeCalendarError(error)).toMatch(expected))
})
