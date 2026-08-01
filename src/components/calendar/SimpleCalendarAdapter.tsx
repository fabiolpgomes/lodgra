'use client'

import React from 'react'

/**
 * Simple Calendar Adapter for CalendarWithSettings
 * Implements minimal calendar interface for day-click selection
 * Supports:
 * - Single day click
 * - Shift+Click for date range selection
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

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ]

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {monthNames[currentMonth]} {currentYear}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Clique em um dia para selecionar preço, ou Shift+Click para selecionar período
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
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => (
              <div
                key={index}
                onClick={(e) => {
                  if (!day) return

                  if (e.shiftKey && rangeStart !== null) {
                    // Shift+Click: select range
                    const start = Math.min(rangeStart, day)
                    const end = Math.max(rangeStart, day)
                    onRangeSelect?.(start, end, currentMonth, currentYear)
                    setRangeStart(null)
                  } else if (e.shiftKey) {
                    // First Shift+Click: set start
                    setRangeStart(day)
                  } else {
                    // Regular click: select single day
                    onDayClick(day, currentYear, currentMonth)
                    setRangeStart(null)
                  }
                }}
                className={`
                  aspect-square flex items-center justify-center rounded text-sm font-medium
                  transition-all duration-200
                  ${
                    day === null
                      ? 'bg-gray-50'
                      : isDateSelected(day)
                        ? 'bg-blue-600 text-white cursor-pointer hover:bg-blue-700'
                        : rangeStart === day
                          ? 'bg-blue-400 text-white cursor-pointer border-2 border-blue-700'
                          : day < today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()
                          ? 'text-gray-400 cursor-default'
                          : 'bg-gray-50 text-gray-900 cursor-pointer hover:bg-blue-100'
                  }
                `}
                title={rangeStart !== null ? `Shift+Click aqui para selecionar do dia ${rangeStart} até este dia` : undefined}
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
