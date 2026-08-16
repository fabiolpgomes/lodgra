'use client'

import { useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Settings } from 'lucide-react'

interface CalendarDay {
  date: Date
  price: number
  isWeekend: boolean
  isBooked?: boolean
  guestName?: string
  isToday?: boolean
}

interface DetailedCalendarMobileProps {
  propertyName: string
  initialMonth?: Date
  days: CalendarDay[]
  selectedDates?: Date[]
  onDayClick?: (date: Date) => void
  onBackClick?: () => void
  onSettingsClick?: () => void
}

export function DetailedCalendarMobile({
  propertyName,
  initialMonth = new Date(),
  days,
  selectedDates = [],
  onDayClick,
  onBackClick,
  onSettingsClick,
}: DetailedCalendarMobileProps) {
  const [currentMonth, setCurrentMonth] = useState(initialMonth)

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const monthYear = currentMonth.toLocaleString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })

  // Generate calendar grid (7 columns, up to 5 rows)
  // Week starts on Monday (1) instead of Sunday (0)
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
  let startingDayOfWeek = firstDay.getDay()
  // Convert Sunday (0) to 6, keep 1-6 as 0-5
  startingDayOfWeek = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()

  const calendarDays: (CalendarDay | null)[] = [
    ...Array(startingDayOfWeek).fill(null),
    ...days.slice(0, daysInMonth),
  ]

  return (
    <div className="detailed-calendar-mobile">
      {/* Header */}
      <div className="calendar-header-mobile">
        <button
          onClick={onBackClick}
          className="back-button"
          aria-label="Voltar para propriedades"
        >
          ← Voltar
        </button>

        <h2 className="calendar-title">{propertyName}</h2>

        <button
          onClick={onSettingsClick}
          className="settings-button"
          aria-label="Abrir configurações"
        >
          <Settings size={24} aria-hidden="true" />
        </button>
      </div>

      {/* Month Navigator */}
      <div className="month-navigator">
        <button
          onClick={handlePrevMonth}
          className="nav-button prev"
          aria-label="Mês anterior"
        >
          <ChevronLeft size={20} aria-hidden="true" />
        </button>

        <h3 className="month-year">{monthYear}</h3>

        <button
          onClick={handleNextMonth}
          className="nav-button next"
          aria-label="Próximo mês"
        >
          <ChevronRight size={20} aria-hidden="true" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="calendar-grid-mobile" role="grid" aria-label="Calendário de disponibilidade">
        {/* Day headers - Week starts on Monday */}
        {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'].map((day, idx) => (
          <div key={idx} className="day-header" role="columnheader" aria-label={day}>
            {day.charAt(0)}
          </div>
        ))}

        {/* Calendar days */}
        {calendarDays.map((day, idx) => {
          const isSelected = day && selectedDates.some(d => d.getTime() === day.date.getTime())
          const dayLabel = day ? `${day.date.getDate()} ${day.isBooked ? 'reservado' : 'disponível'}${day.isToday ? ' hoje' : ''}` : ''
          return (
            <div
              key={idx}
              className={`day-cell ${
                !day ? 'empty' : `
                ${day.isToday ? 'today' : ''}
                ${day.isBooked ? 'booked' : ''}
                ${day.isWeekend ? 'weekend' : ''}
                ${isSelected ? 'selected' : ''}
              `.trim()}`}
              onClick={() => day && onDayClick?.(day.date)}
              role={day ? 'button' : undefined}
              tabIndex={day ? 0 : undefined}
              aria-label={day ? dayLabel : undefined}
              onKeyPress={(e) => day && (e.key === 'Enter' || e.key === ' ') && onDayClick?.(day.date)}
          >
            {day && (
              <>
                <div className="day-number">
                  {day.date.getDate()}
                  {day.isToday && <div className="today-indicator" />}
                </div>
                {/* Mobile: Show only a visual indicator for booked dates */}
                {day.isBooked && (
                  <div className="booked-indicator" title="Reservado">🛏️</div>
                )}
              </>
            )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
