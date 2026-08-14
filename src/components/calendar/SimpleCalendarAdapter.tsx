'use client'

import React from 'react'
import { MonthYearPicker } from './MonthYearPicker'

/**
 * Simple Calendar Adapter for CalendarWithSettings
 * Implements drag-to-select range for day selection
 * Desktop: click + drag mouse
 * Mobile: touch + swipe finger
 */

interface Reservation {
  id: string
  guestName: string
  guestCount?: number
  startDate: Date
  endDate: Date
  price: number
  status: 'pending' | 'confirmed' | 'hosting' | 'completed'
}

interface BlockedDate {
  start_date: string
  end_date: string
}

interface SimpleCalendarAdapterProps {
  onDayClick: (day: number, year: number, month: number) => void
  onRangeSelect?: (startDay: number, endDay: number, month: number, year: number) => void
  onReservationClick?: (reservation: Reservation) => void // NEW: clicked on existing reservation
  selectedDates: string[] // ISO date strings
  onMonthChange?: (month: number, year: number) => void
  reservations?: Reservation[]
  dailyPrices?: Record<string, number> // ISO date -> price
  blockedDates?: BlockedDate[] // Blocked date ranges
}

function SimpleCalendarAdapterComponent({
  onDayClick,
  onRangeSelect,
  onReservationClick,
  selectedDates,
  onMonthChange,
  reservations = [],
  dailyPrices = {},
  blockedDates = [],
}: SimpleCalendarAdapterProps) {
  const today = new Date()

  const [currentMonth, setCurrentMonth] = React.useState(today.getMonth())
  const [currentYear, setCurrentYear] = React.useState(today.getFullYear())
  const [showMonthPicker, setShowMonthPicker] = React.useState(false)
  const [rangeStart, setRangeStart] = React.useState<number | null>(null)
  const [rangeEnd, setRangeEnd] = React.useState<number | null>(null)
  const dragRangeRef = React.useRef<{ start: number; end: number } | null>(null)
  const activePointerIdRef = React.useRef<number | null>(null)

  // Generate calendar days for current month
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay()
  }

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)

  // Create array of days (with empty cells for alignment)
  const days: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) {
    days.push(null)
  }
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day)
  }

  const isDateSelected = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return selectedDates.includes(dateStr)
  }

  const isInDragRange = (day: number | null) => {
    if (!day || rangeStart === null || rangeEnd === null) return false
    const min = Math.min(rangeStart, rangeEnd)
    const max = Math.max(rangeStart, rangeEnd)
    return day >= min && day <= max
  }

  const getDayPrice = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return dailyPrices[dateStr]
  }

  const getReservationForDay = (day: number) => {
    return reservations.find(res => {
      const d = new Date(currentYear, currentMonth, day)
      d.setHours(0, 0, 0, 0)

      const startDate = new Date(res.startDate)
      startDate.setHours(0, 0, 0, 0)

      const endDate = new Date(res.endDate)
      endDate.setHours(23, 59, 59, 999)

      return d >= startDate && d <= endDate
    })
  }

  const isDateBlocked = (day: number) => {
    if (blockedDates.length === 0) return false

    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

    return blockedDates.some(block => {
      return dateStr >= block.start_date && dateStr <= block.end_date
    })
  }

  const handleDayPointerDown = (day: number | null, pointerId: number) => {
    if (!day) return

    activePointerIdRef.current = pointerId
    dragRangeRef.current = { start: day, end: day }
    setRangeStart(day)
    setRangeEnd(day)
  }

  const handleDayPointerEnter = (day: number | null) => {
    if (!dragRangeRef.current || !day) return

    dragRangeRef.current.end = day
    setRangeEnd(day)
  }

  const finishRangeSelection = React.useCallback(() => {
    const dragRange = dragRangeRef.current
    if (!dragRange) return

    activePointerIdRef.current = null
    dragRangeRef.current = null
    const start = Math.min(dragRange.start, dragRange.end)
    const end = Math.max(dragRange.start, dragRange.end)

    if (start === end) {
      onDayClick(start, currentYear, currentMonth)
    } else {
      onRangeSelect?.(start, end, currentMonth, currentYear)
    }

    setRangeStart(null)
    setRangeEnd(null)
  }, [currentMonth, currentYear, onDayClick, onRangeSelect])

  const cancelRangeSelection = React.useCallback(() => {
    activePointerIdRef.current = null
    dragRangeRef.current = null
    setRangeStart(null)
    setRangeEnd(null)
  }, [])

  const handleMonthYearSelect = (date: Date) => {
    setCurrentMonth(date.getMonth())
    setCurrentYear(date.getFullYear())
    setShowMonthPicker(false)
    activePointerIdRef.current = null
    dragRangeRef.current = null
    setRangeStart(null)
    setRangeEnd(null)
  }

  // Notify parent when month/year changes (but don't reset drag state)
  React.useEffect(() => {
    // Only notify parent - don't reset drag state here as it breaks ongoing drags
    onMonthChange?.(currentMonth, currentYear)
  }, [currentMonth, currentYear, onMonthChange])

  // Finish a drag even when the pointer is released outside the calendar.
  React.useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (
        !dragRangeRef.current ||
        activePointerIdRef.current !== event.pointerId
      ) {
        return
      }

      const target = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest<HTMLElement>('[data-day]')
      const day = Number(target?.dataset.day)

      if (Number.isInteger(day) && day > 0) {
        dragRangeRef.current.end = day
        setRangeEnd(day)
      }
    }

    document.addEventListener('pointermove', handlePointerMove)
    document.addEventListener('pointerup', finishRangeSelection)
    document.addEventListener('pointercancel', cancelRangeSelection)
    return () => {
      document.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('pointerup', finishRangeSelection)
      document.removeEventListener('pointercancel', cancelRangeSelection)
    }
  }, [cancelRangeSelection, finishRangeSelection])

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ]

  return (
    <div className="w-full max-w-4xl mx-auto p-4" style={{ userSelect: 'none', touchAction: 'none' }}>
      <div className="rounded-lg shadow" style={{ backgroundColor: '#FBFAF6' }}>
        {/* Header */}
        <div className="p-4 border-b" style={{ borderColor: '#E5DFD2' }}>
          <h2
            className="text-xl font-bold cursor-pointer hover:opacity-70 transition-opacity"
            style={{ color: '#1B2430' }}
            onClick={() => setShowMonthPicker(true)}
            title="Clique para escolher mês e ano"
          >
            {monthNames[currentMonth]} {currentYear} 📅
          </h2>
          <p className="text-sm mt-1" style={{ color: '#4D5566' }}>
            {rangeStart === null
              ? 'Clique e arraste o mouse (ou dedo) pelos dias desejados'
              : `Selecionado: ${Math.min(rangeStart, rangeEnd || rangeStart)} até ${Math.max(rangeStart, rangeEnd || rangeStart)}`}
          </p>
        </div>

        {/* Calendar */}
        <div className="p-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map((day) => (
              <div
                key={day}
                className="text-center font-semibold text-sm py-2"
                style={{ color: '#4D5566' }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1 select-none">
            {days.map((day, index) => (
              <div
                key={index}
                onPointerDown={(event) => handleDayPointerDown(day, event.pointerId)}
                onPointerEnter={() => handleDayPointerEnter(day)}
                data-day={day}
                className={`
                  aspect-square flex items-center justify-center rounded text-sm font-medium
                  transition-colors duration-75 select-none user-select-none
                `}
                style={{
                  backgroundColor:
                    day === null
                      ? '#FBFAF6'
                      : isInDragRange(day)
                      ? '#10203E'
                      : isDateSelected(day)
                      ? '#10203E'
                      : day < today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()
                      ? 'transparent'
                      : '#FBFAF6',
                  color:
                    day === null
                      ? 'inherit'
                      : isInDragRange(day) || isDateSelected(day)
                      ? 'white'
                      : day < today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()
                      ? '#C9A227'
                      : '#1B2430',
                  cursor:
                    day === null
                      ? 'default'
                      : isInDragRange(day) || (!isDateSelected(day) && !(day < today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()))
                      ? 'grab'
                      : 'default',
                }}
              >
                {day && (
                  <div className="flex flex-col items-center justify-center w-full h-full gap-0.5 px-0.5 py-1">
                    <div className="text-sm font-bold">{day}</div>
                    {isDateBlocked(day) ? (
                      <div className="flex flex-col items-center justify-center gap-0.5 w-full h-full px-0.5">
                        <div className="text-lg font-bold">🔒</div>
                        <div className="text-xs font-semibold" style={{ color: isInDragRange(day) || isDateSelected(day) ? 'white' : '#10203E' }}>
                          Bloqueado
                        </div>
                      </div>
                    ) : getReservationForDay(day) ? (
                      <div
                        className="flex flex-col items-center justify-center gap-0.5 w-full h-full px-0.5 cursor-pointer hover:opacity-75 transition-opacity"
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={() => {
                          const res = getReservationForDay(day)
                          if (res) onReservationClick?.(res)
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="text-xs font-bold">🛏️</div>
                        <div className="text-xs font-semibold truncate max-w-full" style={{ color: '#10203E' }}>
                          {getReservationForDay(day)?.guestName?.substring(0, 10) || 'Guest'}
                        </div>
                        <div className="text-xs opacity-75" style={{ color: '#4D5566' }}>
                          {getReservationForDay(day)?.guestCount} hósp.
                        </div>
                        <div className="text-xs font-bold" style={{ color: '#10203E' }}>
                          €{getReservationForDay(day)?.price?.toFixed(0)}
                        </div>
                        <div className="text-xs font-semibold" style={{
                          color: getReservationForDay(day)?.status === 'confirmed' ? '#1976D2' : '#F57C00'
                        }}>
                          {getReservationForDay(day)?.status === 'confirmed' ? 'Confirmado' :
                           getReservationForDay(day)?.status === 'hosting' ? 'Hospedado' :
                           getReservationForDay(day)?.status === 'completed' ? 'Concluído' :
                           'Pendente'}
                        </div>
                      </div>
                    ) : getDayPrice(day) ? (
                      <div className="text-xs font-bold whitespace-nowrap" style={{ color: '#10203E' }}>
                        €{getDayPrice(day)?.toFixed(0)}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="p-4 border-t text-sm" style={{ borderColor: '#E5DFD2', backgroundColor: '#FBFAF6', color: '#4D5566' }}>
          <p>
            {selectedDates.length > 0
              ? `${selectedDates.length} data(s) selecionada(s)`
              : 'Nenhuma data selecionada'}
          </p>
        </div>
      </div>


      {/* Month/Year Picker Modal */}
      {showMonthPicker && (
        <MonthYearPicker
          currentDate={new Date(currentYear, currentMonth, 1)}
          onSelect={handleMonthYearSelect}
          onCancel={() => setShowMonthPicker(false)}
        />
      )}
    </div>
  )
}

// Removed React.memo - was causing closure issues with props
export const SimpleCalendarAdapter = SimpleCalendarAdapterComponent
