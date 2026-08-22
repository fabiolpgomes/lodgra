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
})
