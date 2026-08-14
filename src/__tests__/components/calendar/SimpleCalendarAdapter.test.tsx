import React from 'react'
import { fireEvent, render } from '@testing-library/react'
import { SimpleCalendarAdapter } from '@/components/calendar/SimpleCalendarAdapter'

describe('SimpleCalendarAdapter range selection', () => {
  it('highlights every day while dragging and emits the selected range once', () => {
    const onRangeSelect = jest.fn()
    const { container } = render(
      <SimpleCalendarAdapter
        onDayClick={jest.fn()}
        onRangeSelect={onRangeSelect}
        selectedDates={[]}
      />
    )

    const day10 = container.querySelector('[data-day="10"]') as HTMLElement
    const day11 = container.querySelector('[data-day="11"]') as HTMLElement
    const day12 = container.querySelector('[data-day="12"]') as HTMLElement

    fireEvent.pointerDown(day10)
    fireEvent.pointerEnter(day12)

    expect(day10).toHaveStyle({ backgroundColor: '#10203E', color: 'white' })
    expect(day11).toHaveStyle({ backgroundColor: '#10203E', color: 'white' })
    expect(day12).toHaveStyle({ backgroundColor: '#10203E', color: 'white' })

    fireEvent.pointerUp(document)

    expect(onRangeSelect).toHaveBeenCalledTimes(1)
    expect(onRangeSelect).toHaveBeenCalledWith(10, 12, expect.any(Number), expect.any(Number))
  })

  it('keeps dates highlighted when the parent persists the selection', () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const selectedDates = [10, 11, 12].map(
      (day) => `${year}-${month}-${String(day).padStart(2, '0')}`
    )

    const { container } = render(
      <SimpleCalendarAdapter
        onDayClick={jest.fn()}
        selectedDates={selectedDates}
      />
    )

    for (const day of [10, 11, 12]) {
      expect(container.querySelector(`[data-day="${day}"]`)).toHaveStyle({
        backgroundColor: '#10203E',
        color: 'white',
      })
    }
  })

  it('selects a range when a touch pointer moves across nested day content', () => {
    const onDayClick = jest.fn()
    const onRangeSelect = jest.fn()
    const { container } = render(
      <SimpleCalendarAdapter
        onDayClick={onDayClick}
        onRangeSelect={onRangeSelect}
        selectedDates={[]}
      />
    )
    const day10 = container.querySelector('[data-day="10"]') as HTMLElement
    const day12Content = container.querySelector('[data-day="12"] > div') as HTMLElement
    const elementFromPoint = jest.fn(() => day12Content)
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: elementFromPoint,
    })

    fireEvent.pointerDown(day10, { pointerId: 7, pointerType: 'touch' })
    fireEvent.pointerMove(document, {
      pointerId: 7,
      pointerType: 'touch',
      clientX: 120,
      clientY: 80,
    })
    fireEvent.pointerUp(document, { pointerId: 7, pointerType: 'touch' })

    expect(onDayClick).not.toHaveBeenCalled()
    expect(onRangeSelect).toHaveBeenCalledWith(10, 12, expect.any(Number), expect.any(Number))
    expect(elementFromPoint).toHaveBeenCalledTimes(1)
    delete (document as Document & { elementFromPoint?: typeof elementFromPoint })
      .elementFromPoint
  })

  it('cancels a pointer gesture without applying the selection', () => {
    const onDayClick = jest.fn()
    const onRangeSelect = jest.fn()
    const { container } = render(
      <SimpleCalendarAdapter
        onDayClick={onDayClick}
        onRangeSelect={onRangeSelect}
        selectedDates={[]}
      />
    )

    fireEvent.pointerDown(container.querySelector('[data-day="10"]') as HTMLElement)
    fireEvent.pointerEnter(container.querySelector('[data-day="12"]') as HTMLElement)
    fireEvent.pointerCancel(document)

    expect(onDayClick).not.toHaveBeenCalled()
    expect(onRangeSelect).not.toHaveBeenCalled()
  })

  it('does not open the day editor when clicking an existing reservation', () => {
    const onDayClick = jest.fn()
    const onReservationClick = jest.fn()
    const today = new Date()
    const reservation = {
      id: 'reservation-1',
      guestName: 'Ana Silva',
      guestCount: 2,
      startDate: new Date(today.getFullYear(), today.getMonth(), 10),
      endDate: new Date(today.getFullYear(), today.getMonth(), 12),
      price: 180,
      status: 'confirmed' as const,
    }
    const { getAllByRole } = render(
      <SimpleCalendarAdapter
        onDayClick={onDayClick}
        onReservationClick={onReservationClick}
        selectedDates={[]}
        reservations={[reservation]}
      />
    )

    const [reservationButton] = getAllByRole('button', { name: /ana silva/i })
    fireEvent.pointerDown(reservationButton)
    fireEvent.pointerUp(document)
    fireEvent.click(reservationButton)

    expect(onDayClick).not.toHaveBeenCalled()
    expect(onReservationClick).toHaveBeenCalledWith(reservation)
  })
})
