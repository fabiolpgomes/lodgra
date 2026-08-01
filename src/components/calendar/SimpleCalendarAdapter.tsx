'use client'

import React from 'react'

/**
 * Simple Calendar Adapter for CalendarWithSettings
 * Implements drag-to-select range for day selection
 * Desktop: click + drag mouse
 * Mobile: touch + swipe finger
 */

interface SimpleCalendarAdapterProps {
  onDayClick: (day: number, year: number, month: number) => void
  onRangeSelect?: (startDay: number, endDay: number, month: number, year: number) => void
  selectedDates: string[] // ISO date strings
}

export function SimpleCalendarAdapter({
  onDayClick,
  onRangeSelect,
  selectedDates,
}: SimpleCalendarAdapterProps) {
  const today = new Date()
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()
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
      onRangeSelect?.(start, end, currentMonth, currentYear)
      setRangeStart(null)
      setRangeEnd(null)
    }
    setIsDragging(false)
  }

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ]

  return (
    <div className="w-full max-w-4xl mx-auto p-4" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      <div className="bg-white rounded-lg shadow">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {monthNames[currentMonth]} {currentYear}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
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
                className="text-center font-semibold text-gray-600 text-sm py-2"
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
                  ${
                    day === null
                      ? 'bg-gray-50 cursor-default'
                      : isInDragRange(day)
                      ? 'bg-blue-500 text-white cursor-grab active:cursor-grabbing'
                      : isDateSelected(day)
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : day < today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()
                      ? 'text-gray-400 cursor-default'
                      : 'bg-gray-50 text-gray-900 hover:bg-blue-100 cursor-grab active:cursor-grabbing'
                  }
                `}
              >
                {day}
              </div>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 text-sm text-gray-600">
          <p>
            {selectedDates.length > 0
              ? `${selectedDates.length} data(s) selecionada(s)`
              : 'Nenhuma data selecionada'}
          </p>
        </div>
      </div>
    </div>
  )
}
