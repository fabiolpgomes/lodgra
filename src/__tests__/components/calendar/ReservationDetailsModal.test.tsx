import { render, screen, fireEvent, waitFor } from '@testing-library/react'

jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
import { ReservationDetailsModal } from '@/components/calendar/ReservationDetailsModal'

describe('ReservationDetailsModal', () => {
  it('formats reservation values with the provided currency', () => {
    render(
      <ReservationDetailsModal
        isOpen
        reservation={{
          id: 'res-1',
          guestName: 'Ana Silva',
          guestCount: 2,
          startDate: new Date('2026-08-10T00:00:00.000Z'),
          endDate: new Date('2026-08-12T00:00:00.000Z'),
          price: 420,
          status: 'confirmed',
        }}
        onClose={jest.fn()}
        currency={'brl' as any}
      />
    )

    expect(screen.getByText(/R\$\s*420,00/)).toBeInTheDocument()
    expect(screen.getByText(/R\$\s*840,00/)).toBeInTheDocument()
  })

  it('tem "Abrir reserva" e cancela com confirmação', async () => {
    const onCancelled = jest.fn()
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) }) as jest.Mock
    render(
      <ReservationDetailsModal
        isOpen
        locale="pt-BR"
        onCancelled={onCancelled}
        reservation={{ id: 'res-9', guestName: 'Ana', startDate: new Date('2026-08-10T00:00:00Z'), endDate: new Date('2026-08-12T00:00:00Z'), price: 100, status: 'confirmed' }}
        onClose={jest.fn()}
      />
    )
    expect(screen.getByRole('link', { name: /Abrir reserva/ })).toHaveAttribute('href', '/pt-BR/reservations/res-9')
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar reserva' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelamento' }))
    await waitFor(() => expect(onCancelled).toHaveBeenCalled())
    expect(global.fetch).toHaveBeenCalledWith('/api/reservations/res-9/cancel', expect.objectContaining({ method: 'POST' }))
  })
})
