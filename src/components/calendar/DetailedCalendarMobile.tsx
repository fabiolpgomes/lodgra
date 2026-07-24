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
  onDayClick?: (date: Date) => void
  onBackClick?: () => void
  onSettingsClick?: () => void
}

export function DetailedCalendarMobile({
  propertyName,
  initialMonth = new Date(),
  days,
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
          aria-label="Back"
        >
          ← Voltar
        </button>

        <h2 className="calendar-title">{propertyName}</h2>

        <button
          onClick={onSettingsClick}
          className="settings-button"
          aria-label="Settings"
        >
          <Settings size={24} />
        </button>
      </div>

      {/* Month Navigator */}
      <div className="month-navigator">
        <button
          onClick={handlePrevMonth}
          className="nav-button prev"
          aria-label="Previous month"
        >
          <ChevronLeft size={20} />
        </button>

        <h3 className="month-year">{monthYear}</h3>

        <button
          onClick={handleNextMonth}
          className="nav-button next"
          aria-label="Next month"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="calendar-grid-mobile">
        {/* Day headers - Week starts on Monday */}
        {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((day, idx) => (
          <div key={idx} className="day-header">
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {calendarDays.map((day, idx) => (
          <div
            key={idx}
            className={`day-cell ${
              !day ? 'empty' : `
              ${day.isToday ? 'today' : ''}
              ${day.isBooked ? 'booked' : ''}
              ${day.isWeekend ? 'weekend' : ''}
            `.trim()}`}
            onClick={() => day && onDayClick?.(day.date)}
          >
            {day && (
              <>
                <div className="day-number">
                  {day.date.getDate()}
                  {day.isToday && <div className="today-indicator" />}
                </div>
                <div className="day-price">€{day.price}</div>
                {day.isBooked && day.guestName && (
                  <div className="guest-name">{day.guestName}</div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
