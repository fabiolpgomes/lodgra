import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SyncBell } from '@/components/common/layout/SyncBell'

const respond = (status: number, body: unknown) =>
  jest.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body })

describe('SyncBell', () => {
  const originalFetch = global.fetch
  afterEach(() => { global.fetch = originalFetch })

  it('shows the pending count and links each action to its fix', async () => {
    global.fetch = respond(200, { status: 'attention', actions: [
      { key: 'guest:r1', severity: 'attention', title: 'Booking 5159950202 · AHS T1 · 10–12 out', cta: 'Completar', href: '/pt-BR/reservations/r1/edit', external: false },
    ] }) as unknown as typeof fetch
    render(<SyncBell locale="pt-BR" />)
    const bell = await screen.findByLabelText('Notificações: 1 ação de sincronização pendente')
    expect(global.fetch).toHaveBeenCalledWith('/api/sync/actions?locale=pt-BR', { cache: 'no-store' })
    fireEvent.click(bell)
    expect(screen.getByText('1 ação pendente')).toBeInTheDocument()
    expect(screen.getByText('Booking 5159950202 · AHS T1 · 10–12 out').closest('a')).toHaveAttribute('href', '/pt-BR/reservations/r1/edit')
    expect(screen.getByText('Abrir painel de sincronização').closest('a')).toHaveAttribute('href', '/pt-BR/sync')
  })

  it('stays quiet for roles without sync access', async () => {
    global.fetch = respond(403, { error: 'Forbidden' }) as unknown as typeof fetch
    render(<SyncBell locale="pt-BR" />)
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    expect(screen.getByLabelText('Notificações')).toBeInTheDocument()
  })
})
