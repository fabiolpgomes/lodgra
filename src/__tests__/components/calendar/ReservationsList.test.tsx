import { render, screen } from '@testing-library/react'
import { ReservationsList } from '@/components/calendar/ReservationsList'

describe('ReservationsList', () => {
  it('formats reservation prices with the provided currency', () => {
    render(
      <ReservationsList
        reservations={[
          {
            id: 'res-1',
            guestName: 'Ana Silva',
            guestCount: 2,
            startDate: new Date('2026-08-10T00:00:00.000Z'),
            endDate: new Date('2026-08-12T00:00:00.000Z'),
            price: 420,
            status: 'confirmed',
          },
        ]}
        monthName="Agosto"
        year={2026}
        currency={'brl' as any}
      />
    )

    expect(screen.getByText(/R\$\s*420,00/)).toBeInTheDocument()
  })
})
