import { render, screen } from '@testing-library/react'
import { ReservationsDashboard } from '@/components/features/reports/ReservationsDashboard'

jest.mock('@/components/common/ui/CurrencyStack', () => ({
  CurrencyStack: () => <div data-testid="currency-stack">Currency Stack</div>,
}))

describe('ReservationsDashboard', () => {
  const mockProperties = [
    { id: '1', name: 'Property 1' },
    { id: '2', name: 'Property 2' },
  ]

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const nextWeek = new Date(today)
  nextWeek.setDate(nextWeek.getDate() + 7)

  const mockReservations = [
    {
      id: '1',
      check_in: tomorrow.toISOString().split('T')[0],
      check_out: new Date(tomorrow.getTime() + 2 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      status: 'confirmed' as const,
      property_listings: [
        {
          properties: [{ id: '1', name: 'Property 1', currency: 'EUR' }],
        },
      ],
      guests: [{ first_name: 'John', last_name: 'Doe' }],
    },
  ]

  it('should render the dashboard with three main sections', () => {
    render(
      <ReservationsDashboard
        _reservations={mockReservations}
        futureReservations={mockReservations}
        properties={mockProperties}
        _startDate={today.toISOString().split('T')[0]}
        _endDate={nextWeek.toISOString().split('T')[0]}
      />
    )

    const hojeElements = screen.getAllByText(/Hoje/i)
    expect(hojeElements.length).toBeGreaterThan(0)
    expect(screen.getByText(/Pipeline 7 Dias/i)).toBeInTheDocument()
    expect(screen.getByText(/KPIs de Desempenho/i)).toBeInTheDocument()
  })

  it('should render TodaySummary with Check-ins section', () => {
    render(
      <ReservationsDashboard
        _reservations={mockReservations}
        futureReservations={mockReservations}
        properties={mockProperties}
        _startDate={today.toISOString().split('T')[0]}
        _endDate={nextWeek.toISOString().split('T')[0]}
      />
    )

    expect(screen.getByText(/Check-ins Hoje/i)).toBeInTheDocument()
  })

  it('should display occupancy metrics section', () => {
    render(
      <ReservationsDashboard
        _reservations={mockReservations}
        futureReservations={mockReservations}
        properties={mockProperties}
        _startDate={today.toISOString().split('T')[0]}
        _endDate={nextWeek.toISOString().split('T')[0]}
      />
    )

    expect(screen.queryByText(/Taxa de Ocupação/i)).toBeInTheDocument()
    expect(screen.queryByText(/ADR/i)).toBeInTheDocument()
  })

  it('should handle empty reservations gracefully', () => {
    render(
      <ReservationsDashboard
        _reservations={[]}
        futureReservations={[]}
        properties={mockProperties}
        _startDate={today.toISOString().split('T')[0]}
        _endDate={nextWeek.toISOString().split('T')[0]}
      />
    )

    const hojeElements = screen.getAllByText(/Hoje/i)
    expect(hojeElements.length).toBeGreaterThan(0)
    expect(screen.getByText(/Pipeline 7 Dias/i)).toBeInTheDocument()
  })

  it('should filter by property ID when provided', () => {
    render(
      <ReservationsDashboard
        _reservations={mockReservations}
        futureReservations={mockReservations}
        properties={mockProperties}
        _startDate={today.toISOString().split('T')[0]}
        _endDate={nextWeek.toISOString().split('T')[0]}
        propertyId="1"
      />
    )

    const hojeElements = screen.getAllByText(/Hoje/i)
    expect(hojeElements.length).toBeGreaterThan(0)
    expect(screen.getByText(/Pipeline 7 Dias/i)).toBeInTheDocument()
  })

  it('should render CurrencyStack component', () => {
    render(
      <ReservationsDashboard
        _reservations={mockReservations}
        futureReservations={mockReservations}
        properties={mockProperties}
        _startDate={today.toISOString().split('T')[0]}
        _endDate={nextWeek.toISOString().split('T')[0]}
      />
    )

    expect(screen.getByTestId('currency-stack')).toBeInTheDocument()
  })
})
