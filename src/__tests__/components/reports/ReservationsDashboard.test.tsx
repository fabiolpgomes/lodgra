import { render, screen } from '@testing-library/react'
import { ReservationsDashboard } from '@/components/features/reports/ReservationsDashboard'

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

    expect(screen.getByText(/Hoje/i)).toBeInTheDocument()
    expect(screen.getByText(/Pipeline 7 Dias/i)).toBeInTheDocument()
    expect(screen.getByText(/KPIs de Desempenho/i)).toBeInTheDocument()
  })

  it('should filter reservations within 7-day window', () => {
    const eightDaysLater = new Date(today)
    eightDaysLater.setDate(eightDaysLater.getDate() + 8)

    const reservations = [
      {
        id: '1',
        check_in: tomorrow.toISOString().split('T')[0],
        check_out: new Date(tomorrow.getTime() + 2 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        status: 'confirmed' as const,
        property_listings: [{ properties: [{ id: '1', name: 'Property 1' }] }],
      },
      {
        id: '2',
        check_in: eightDaysLater.toISOString().split('T')[0],
        check_out: new Date(eightDaysLater.getTime() + 2 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        status: 'confirmed' as const,
        property_listings: [{ properties: [{ id: '2', name: 'Property 2' }] }],
      },
    ]

    render(
      <ReservationsDashboard
        _reservations={reservations}
        futureReservations={reservations}
        properties={mockProperties}
        _startDate={today.toISOString().split('T')[0]}
        _endDate={nextWeek.toISOString().split('T')[0]}
      />
    )

    expect(screen.getByText(/John/i)).toBeInTheDocument()
  })

  it('should display occupancy metrics correctly', () => {
    render(
      <ReservationsDashboard
        _reservations={mockReservations}
        futureReservations={mockReservations}
        properties={mockProperties}
        _startDate={today.toISOString().split('T')[0]}
        _endDate={nextWeek.toISOString().split('T')[0]}
      />
    )

    expect(screen.getByText(/Taxa de Ocupação/i)).toBeInTheDocument()
    expect(screen.getByText(/ADR/i)).toBeInTheDocument()
    expect(screen.getByText(/Receita/i)).toBeInTheDocument()
  })

  it('should handle empty reservations', () => {
    render(
      <ReservationsDashboard
        _reservations={[]}
        futureReservations={[]}
        properties={mockProperties}
        _startDate={today.toISOString().split('T')[0]}
        _endDate={nextWeek.toISOString().split('T')[0]}
      />
    )

    expect(screen.getByText(/Hoje/i)).toBeInTheDocument()
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

    expect(screen.getByText(/Hoje/i)).toBeInTheDocument()
  })

  it('should only include confirmed reservations', () => {
    const reservations = [
      {
        id: '1',
        check_in: tomorrow.toISOString().split('T')[0],
        check_out: new Date(tomorrow.getTime() + 2 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        status: 'confirmed' as const,
        property_listings: [{ properties: [{ id: '1', name: 'Property 1' }] }],
        guests: [{ first_name: 'John', last_name: 'Doe' }],
      },
      {
        id: '2',
        check_in: tomorrow.toISOString().split('T')[0],
        check_out: new Date(tomorrow.getTime() + 2 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        status: 'pending' as const,
        property_listings: [{ properties: [{ id: '2', name: 'Property 2' }] }],
        guests: [{ first_name: 'Jane', last_name: 'Smith' }],
      },
    ]

    render(
      <ReservationsDashboard
        _reservations={reservations}
        futureReservations={reservations}
        properties={mockProperties}
        _startDate={today.toISOString().split('T')[0]}
        _endDate={nextWeek.toISOString().split('T')[0]}
      />
    )

    expect(screen.getByText(/John/i)).toBeInTheDocument()
  })
})
