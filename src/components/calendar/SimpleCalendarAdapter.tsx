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

interface SimpleCalendarAdapterProps {
  onDayClick: (day: number, year: number, month: number) => void
  onRangeSelect?: (startDay: number, endDay: number, month: number, year: number) => void
  selectedDates: string[] // ISO date strings
  onMonthChange?: (month: number, year: number) => void
  reservations?: Reservation[]
  dailyPrices?: Record<string, number> // ISO date -> price
}

export function SimpleCalendarAdapter({
  onDayClick,
  onRangeSelect,
  selectedDates,
  onMonthChange,
  reservations = [],
  dailyPrices = {},
}: SimpleCalendarAdapterProps) {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = React.useState(today.getMonth())
  const [currentYear, setCurrentYear] = React.useState(today.getFullYear())
  const [showMonthPicker, setShowMonthPicker] = React.useState(false)
  const [rangeStart, setRangeStart] = React.useState<number | null>(null)
  const [rangeEnd, setRangeEnd] = React.useState<number | null>(null)
  const [isDragging, setIsDragging] = React.useState(false)

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
      return d >= res.startDate && d <= res.endDate
    })
  }

  const handleDayMouseDown = (day: number | null) => {
    if (!day) return
    setRangeStart(day)
    setRangeEnd(day)
    setIsDragging(true)
  }

  const handleDayMouseEnter = (day: number | null) => {
    if (!isDragging || !day || rangeStart === null) return
    setRangeEnd(day)
  }

  const handleMouseUp = () => {
    if (isDragging && rangeStart !== null && rangeEnd !== null) {
      const start = Math.min(rangeStart, rangeEnd)
      const end = Math.max(rangeStart, rangeEnd)

      // If single day click (no drag), call onDayClick
      if (start === end) {
        onDayClick?.(start, currentYear, currentMonth)
      } else {
        // If range selection, call onRangeSelect
        onRangeSelect?.(start, end, currentMonth, currentYear)
      }

      setRangeStart(null)
      setRangeEnd(null)
    }
    setIsDragging(false)
  }

  const handleMonthYearSelect = (date: Date) => {
    setCurrentMonth(date.getMonth())
    setCurrentYear(date.getFullYear())
    setShowMonthPicker(false)
    setRangeStart(null)
    setRangeEnd(null)
  }

  // Notify parent when month/year changes
  React.useEffect(() => {
    // Reset selection on month change
    setRangeStart(null)
    setRangeEnd(null)
    // Notify parent to reload data for new month
    onMonthChange?.(currentMonth, currentYear)
  }, [currentMonth, currentYear, onMonthChange])

  // Add global mouseup listener to ensure drag-to-select works correctly
  React.useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging && rangeStart !== null && rangeEnd !== null) {
        const start = Math.min(rangeStart, rangeEnd)
        const end = Math.max(rangeStart, rangeEnd)

        if (start === end) {
          onDayClick?.(start, currentYear, currentMonth)
        } else {
          onRangeSelect?.(start, end, currentMonth, currentYear)
        }

        setRangeStart(null)
        setRangeEnd(null)
      }
      setIsDragging(false)
    }

    document.addEventListener('mouseup', handleGlobalMouseUp)
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [isDragging, rangeStart, rangeEnd, currentYear, currentMonth, onDayClick, onRangeSelect])

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ]

  return (
    <div className="w-full max-w-4xl mx-auto p-4" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
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
                onMouseDown={() => handleDayMouseDown(day)}
                onMouseEnter={() => handleDayMouseEnter(day)}
                onTouchStart={() => handleDayMouseDown(day)}
                onTouchMove={(e) => {
                  const touch = e.touches[0]
                  const element = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement
                  if (element?.dataset.day) {
                    handleDayMouseEnter(parseInt(element.dataset.day))
                  }
                }}
                onTouchEnd={handleMouseUp}
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
                  <div className="flex flex-col items-center justify-center w-full h-full gap-1 px-1">
                    <div className="text-sm font-semibold">{day}</div>
                    {getReservationForDay(day) ? (
                      <div className="text-xs font-bold" title="Reservado">
                        📅
                      </div>
                    ) : getDayPrice(day) ? (
                      <div className="text-xs font-semibold whitespace-nowrap bg-opacity-20 px-1 py-0.5 rounded" style={{ backgroundColor: '#10203E', color: 'inherit' }}>
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

      {/* Reservations List */}
      {reservations.length > 0 && (
        <div className="max-w-4xl mx-auto p-4 mt-4">
          <h3 className="font-bold mb-4" style={{ color: '#1B2430' }}>
            Reservas em {monthNames[currentMonth]} {currentYear}
          </h3>
          <div className="space-y-2">
            {reservations.map((res) => {
              const statusColors: Record<string, { bg: string; text: string }> = {
                confirmed: { bg: '#E3F2FD', text: '#1976D2' },
                hosting: { bg: '#E8F5E9', text: '#388E3C' },
                pending: { bg: '#FFF3E0', text: '#F57C00' },
                completed: { bg: '#F5F5F5', text: '#616161' },
              }
              const colors = statusColors[res.status] || statusColors.confirmed
              const statusLabel = {
                confirmed: 'Confirmado',
                hosting: 'Hospedado',
                pending: 'Pendente',
                completed: 'Concluído',
              }[res.status]

              return (
                <div
                  key={res.id}
                  className="p-3 rounded border"
                  style={{
                    backgroundColor: colors.bg,
                    borderColor: colors.text,
                    color: colors.text,
                  }}
                >
                  <div className="font-semibold">{res.guestName}</div>
                  <div className="text-sm">
                    {res.guestCount} {res.guestCount === 1 ? 'hóspede' : 'hóspedes'} • €{res.price.toFixed(2)}
                  </div>
                  <div className="text-xs">
                    {res.startDate.toLocaleDateString('pt-BR')} até {res.endDate.toLocaleDateString('pt-BR')} • {statusLabel}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

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
