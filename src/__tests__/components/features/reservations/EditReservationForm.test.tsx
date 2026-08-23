import { render, screen } from '@testing-library/react'
import { EditReservationForm } from '@/components/features/reservations/EditReservationForm'
import type { ReservationUI } from '@/components/features/reservations/types/reservation-ui'

describe('EditReservationForm', () => {
  const reservation: ReservationUI = {
    id: 'res-1',
    check_in: '2026-08-29',
    check_out: '2026-09-02',
    status: 'confirmed',
    total_price: 350,
    currency: 'BRL',
    guest_name: 'Ana Silva',
  }

  it('shows the reservation currency in the total price label', () => {
    render(
      <EditReservationForm
        reservation={reservation}
        onClose={jest.fn()}
        onSave={jest.fn().mockResolvedValue(undefined)}
      />
    )

    expect(screen.getByText('Valor Total (BRL)')).toBeInTheDocument()
  })
})
