'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Property {
  id: string
  name: string
  type: string
  location: string
  imageUrl?: string
}

interface Reservation {
  id: string
  propertyId: string
  guestName: string
  startDate: Date
  endDate: Date
  price: number
  status: 'pending' | 'confirmed' | 'hosting' | 'completed'
}

interface CalendarKanbanViewProps {
  properties: Property[]
  reservations: Reservation[]
  selectedPropertyId?: string
}

const MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
]

export function CalendarKanbanView({
  properties,
  reservations,
  selectedPropertyId,
}: CalendarKanbanViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 6, 24)) // July 24, 2026

  // Generate 14-day window starting from Monday
  const startDate = new Date(currentDate)
  // Find the Monday of the current week
  const day = startDate.getDay()
  const diff = startDate.getDate() - day + (day === 0 ? -6 : 1) // adjust to get Monday
  startDate.setDate(diff)

  const days = Array.from({ length: 14 }, (_, i) => {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    return date
  })

  const propertiesToShow = selectedPropertyId
    ? properties.filter(p => p.id === selectedPropertyId)
    : properties

  const monthName = MONTHS[currentDate.getMonth()]
  const year = currentDate.getFullYear()

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [month, yearStr] = e.target.value.split('-')
    setCurrentDate(new Date(parseInt(yearStr), parseInt(month), 1))
  }

  return (
    <div className="calendar-kanban-view">
      {/* Header with month dropdown */}
      <div className="kanban-header">
        <div className="month-selector">
          <select value={`${currentDate.getMonth()}-${year}`} onChange={handleMonthChange} className="month-dropdown">
            {Array.from({ length: 24 }, (_, i) => {
              const date = new Date(2026, i, 1)
              const m = date.getMonth()
              const y = date.getFullYear()
              return (
                <option key={i} value={`${m}-${y}`}>
                  {MONTHS[m]} de {y}
                </option>
              )
            })}
          </select>
        </div>

        <div className="header-stats">
          <span>16 oportunidades disponíveis</span>
        </div>
      </div>

      {/* Kanban timeline - horizontal scrolling */}
      <div className="kanban-container">
        <div className="kanban-wrapper">
          {/* Left column: property names */}
          <div className="kanban-properties-column">
            <div className="property-label-header">Propriedades</div>
            {propertiesToShow.map(property => (
              <div key={property.id} className="property-label-row">
                {property.imageUrl ? (
                  <img src={property.imageUrl} alt={property.name} />
                ) : (
                  <div className="label-placeholder">📷</div>
                )}
                <div className="label-text">
                  <div className="label-name">{property.name}</div>
                  <div className="label-type">{property.type}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Scrollable calendar grid */}
          <div className="kanban-scroll-area">
            {/* Day headers (vertical) */}
            <div className="kanban-days-header">
              {days.map((date, idx) => (
                <div key={idx} className="day-header-cell">
                  <div className="day-abbr">
                    {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'][date.getDay()]}
                  </div>
                  <div className="day-number">{date.getDate()}</div>
                </div>
              ))}
            </div>

            {/* Calendar cells grid */}
            <div className="kanban-cells-grid">
              {propertiesToShow.map(property => (
                <div key={property.id} className="kanban-row">
                  {days.map((date, idx) => (
                    <div key={idx} className="kanban-cell">
                      <div className="cell-price">€145</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
