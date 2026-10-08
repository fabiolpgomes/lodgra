import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SyncActionsPanel, describeFullSync } from '../SyncActionsPanel'

const push = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
jest.mock('@/components/common/layout/PremiumPage', () => ({ PremiumCard: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }))
jest.mock('../CompleteGuestDrawer', () => ({
  CompleteGuestDrawer: ({ target }: { target: { title: string } | null }) => target ? <div role="dialog">{target.title}</div> : null,
}))

const action = (overrides: Record<string, unknown>) => ({
  key: 'guest:r1', kind: 'complete_guest', severity: 'attention', title: 'Booking 5159950202 · AHS T1 · 3–7 out',
  detail: 'Falta o nome do hóspede', platform: 'Booking', property: null, reservationId: 'r1', since: null,
  href: '/pt-BR/reservations/r1/edit', external: false, cta: 'Completar', completable: true, ...overrides,
})
const respond = (body: unknown, ok = true) => ({ ok, status: ok ? 200 : 503, json: async () => body })
const originalFetch = global.fetch
afterEach(() => { global.fetch = originalFetch; push.mockReset() })

it('shows the status, the trust indicator and identifiable actions', async () => {
  global.fetch = jest.fn().mockResolvedValue(respond({
    status: 'attention', checked_at: '', trust: { windowDays: 30, total: 4, complete: 3, percent: 75 },
    actions: [action({}), action({ key: 'event:e1', kind: 'ical_reservation_without_email', title: 'Reserva Airbnb · AHS Casa do Moinho · 11–19 out', completable: false, reservationId: null, href: '/pt-BR/properties/p1', cta: 'Ver reserva' })],
  }))
  render(<SyncActionsPanel locale="pt-BR" />)
  expect(await screen.findByTestId('sync-status')).toHaveTextContent('2 ações pendentes')
  expect(screen.getByText(/75% das reservas/)).toBeVisible()

  fireEvent.click(screen.getByText('Booking 5159950202 · AHS T1 · 3–7 out'))
  expect(screen.getByRole('dialog')).toHaveTextContent('Booking 5159950202')

  fireEvent.click(screen.getByText('Reserva Airbnb · AHS Casa do Moinho · 11–19 out'))
  expect(push).toHaveBeenCalledWith('/pt-BR/properties/p1')
})

it('dismisses an action with a reason and reloads', async () => {
  const fetchMock = jest.fn()
    .mockResolvedValueOnce(respond({ status: 'attention', checked_at: '', trust: { windowDays: 30, total: 0, complete: 0, percent: null }, actions: [action({ key: 'event:e1', kind: 'ical_reservation_without_email', completable: false })] }))
    .mockResolvedValueOnce(respond({ success: true }))
    .mockResolvedValue(respond({ status: 'ok', checked_at: '', trust: { windowDays: 30, total: 0, complete: 0, percent: null }, actions: [] }))
  global.fetch = fetchMock
  render(<SyncActionsPanel locale="pt-BR" />)
  fireEvent.click(await screen.findByText('Ignorar'))
  fireEvent.click(screen.getByText('É um bloqueio meu, não uma reserva'))
  await waitFor(() => expect(screen.getByTestId('sync-status')).toHaveTextContent('Tudo em dia'))
  expect(fetchMock).toHaveBeenCalledWith('/api/sync/actions/dismiss', expect.objectContaining({
    body: JSON.stringify({ key: 'event:e1', reason: 'É um bloqueio meu, não uma reserva' }),
  }))
})

it('never shows "Tudo em dia" when the state cannot be read', async () => {
  global.fetch = jest.fn().mockResolvedValue(respond({}, false))
  render(<SyncActionsPanel locale="pt-BR" />)
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível verificar')
  expect(screen.queryByText('Tudo em dia')).not.toBeInTheDocument()
})

it('summarises a partial manual sync naming the failing source', () => {
  expect(describeFullSync(207, { ical: { ok: false }, email: { ok: true, staged: 2 }, reconciliation: { ok: true, matched: 1 } }))
    .toBe('Um ou mais calendários falharam · 2 e-mail(s) novo(s) · 1 reserva(s) completada(s) com os dados do e-mail.')
})
