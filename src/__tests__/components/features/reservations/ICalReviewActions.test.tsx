import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { EditReservationClient } from '@/components/features/reservations/EditReservationClient'
import type { ReservationUI } from '@/components/features/reservations/types/reservation-ui'

const mockRefresh = jest.fn()
jest.mock('@/lib/i18n/routing', () => ({ useRouter: () => ({ refresh: mockRefresh, push: jest.fn() }) }))
jest.mock('@/components/features/reservations/EditReservationForm', () => ({ EditReservationForm: () => null }))
const reservation: ReservationUI = {
  id: 'reservation-1', calendar_event_id: 'event-1', status: 'pending',
  check_in: '2026-09-16', check_out: '2026-09-20', currency: 'EUR',
}

describe('iCal review actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) })
  })
  it.each([['Confirmar que é reserva', 'confirm'], ['É um bloqueio', 'block']])('allows host to choose %s', async (label, action) => {
    render(<EditReservationClient reservation={reservation} locale="pt" />)
    expect(screen.getByText(/As datas estão bloqueadas/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: label }))
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled())
    expect(global.fetch).toHaveBeenCalledWith('/api/reservations/reservation-1/ical-review', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ action }),
    }))
  })
  it('keeps the choice available and shows a failed review', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: false, json: async () => ({ error: 'Outra sessão já revisou esta reserva' }) })
    render(<EditReservationClient reservation={reservation} locale="pt" />)
    fireEvent.click(screen.getByRole('button', { name: 'É um bloqueio' }))
    expect(await screen.findByText('Outra sessão já revisou esta reserva')).toBeInTheDocument()
    expect(mockRefresh).not.toHaveBeenCalled()
  })
  it('does not offer pending review for a confirmed reservation', () => {
    render(<EditReservationClient reservation={{ ...reservation, status: 'confirmed' }} locale="pt" />)
    expect(screen.queryByRole('button', { name: 'É um bloqueio' })).not.toBeInTheDocument()
  })
})
