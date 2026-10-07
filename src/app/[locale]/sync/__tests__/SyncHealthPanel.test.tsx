import { render, screen } from '@testing-library/react'
import { SyncHealthPanel } from '@/app/[locale]/sync/SyncHealthPanel'

jest.mock('@/components/common/layout/PremiumPage', () => ({ PremiumCard: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }))
const originalFetch = global.fetch
const health = {
  checked_at: '2026-10-01T06:00:00Z', limit: 50, gmail_connected: false, gmail_last_sync_at: null,
  last_email_received_at: null, truncated: {}, failures: [],
  emails: [{ id: 'mail', processing_status: 'needs_review', received_at: '2026-10-01T05:00:00Z', last_error: 'Datas não identificadas' }],
  events: [{ id: 'block', property_id: 'p1', source_platform: 'booking', check_in: '2026-10-03', check_out: '2026-10-07', event_kind: 'block' }],
}
afterEach(() => { global.fetch = originalFetch })
it('shows loading then distinguishes block from missing reservation and offers review', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => health })
  render(<SyncHealthPanel locale="pt" />)
  expect(screen.getByRole('status')).toHaveTextContent('A consultar')
  expect(await screen.findByText('Datas não identificadas')).toBeVisible()
  expect(screen.getByText(/Bloqueio de disponibilidade: confirmar/)).toBeVisible()
  expect(screen.getByText(/Gmail não conectado/)).toBeVisible()
  expect(screen.getByRole('link', { name: 'Rever e completar reservas' })).toHaveAttribute('href', '/pt/reservations')
  expect(screen.queryByText(/Tudo certo/)).not.toBeInTheDocument()
})
it('shows failure explicitly instead of an empty healthy state', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: false })
  render(<SyncHealthPanel locale="pt" />)
  expect(await screen.findByRole('alert')).toHaveTextContent('não pôde ser confirmada')
  expect(screen.queryByText('Nenhuma mensagem pendente encontrada.')).not.toBeInTheDocument()
})
