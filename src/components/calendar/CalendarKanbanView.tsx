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

export function CalendarKanbanView({
  properties,
  reservations,
  selectedPropertyId,
}: CalendarKanbanViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 6, 24)) // July 24, 2026

  // Generate 14-day window starting from currentDate
  const days = Array.from({ length: 14 }, (_, i) => {
    const date = new Date(currentDate)
    date.setDate(date.getDate() + i)
    return date
  })

  const propertiesToShow = selectedPropertyId
    ? properties.filter(p => p.id === selectedPropertyId)
    : properties

  return (
    <div className="calendar-kanban-view">
      {/* Header with month/navigation */}
      <div className="kanban-header">
        <div className="month-selector">
          <h2>julho de 2026</h2>
        </div>

        <div className="nav-buttons">
          <button
            className="nav-button"
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 1))}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            className="nav-button"
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1))}
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="header-stats">
          <span>16 oportunidades disponíveis</span>
        </div>
      </div>

      {/* Kanban timeline */}
      <div className="kanban-container">
        {/* Day headers */}
        <div className="kanban-days-header">
          {days.map((date, idx) => (
            <div key={idx} className="day-header-cell">
              <div className="day-abbr">
                {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'][date.getDay()]}
              </div>
              <div className="day-number">{date.getDate()}</div>
            </div>
          ))}
        </div>

        {/* Properties rows */}
        <div className="kanban-rows">
          {propertiesToShow.map(property => (
            <div key={property.id} className="kanban-row">
              <div className="property-label">
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

              <div className="kanban-cells">
                {days.map((date, idx) => (
                  <div key={idx} className="kanban-cell">
                    <div className="cell-price">€145</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
