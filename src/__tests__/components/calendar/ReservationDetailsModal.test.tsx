import { render, screen } from '@testing-library/react'
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
})
