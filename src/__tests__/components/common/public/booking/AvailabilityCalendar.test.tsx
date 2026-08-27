import React from 'react'
import { render, screen } from '@testing-library/react'
import { addDays, format } from 'date-fns'
import { AvailabilityCalendar } from '@/components/common/public/booking/AvailabilityCalendar'

describe('AvailabilityCalendar reserved dates', () => {
  it('marks blocked dates with a stronger reserved state', () => {
    const today = new Date()
    const start = format(today, 'yyyy-MM-dd')
    const end = format(addDays(today, 1), 'yyyy-MM-dd')

    render(
      <AvailabilityCalendar
        blockedRanges={[{ start, end }]}
        checkIn=""
        checkOut=""
        onCheckInChange={jest.fn()}
        onCheckOutChange={jest.fn()}
      />
    )

    const reservedCell = screen.getByTitle(/Reservado:/)
    expect(reservedCell).toHaveClass('bg-slate-300')
    expect(reservedCell).toHaveClass('line-through')
    expect(reservedCell).toHaveAttribute('aria-label', expect.stringContaining('reservado'))
  })

  it('shows the effective minimum nights when a seasonal rule is stricter than the base minimum', () => {
    render(
      <AvailabilityCalendar
        blockedRanges={[]}
        minNights={3}
        pricingRules={[
          {
            start_date: '2026-09-01',
            end_date: '2026-09-30',
            min_nights: 6,
          },
        ]}
        checkIn="2026-09-10"
        checkOut="2026-09-15"
        onCheckInChange={jest.fn()}
        onCheckOutChange={jest.fn()}
      />
    )

    expect(screen.getByText(/Período mínimo efetivo: 6 noites/)).toBeInTheDocument()
    expect(screen.getByText(/Actualmente: 5 noites/)).toBeInTheDocument()
  })
})
