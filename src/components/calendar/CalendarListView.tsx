'use client'

import { useState } from 'react'

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
  guestCount?: number
  startDate: Date
  endDate: Date
  status: string
}

interface CalendarListViewProps {
  properties: Property[]
  reservations: Reservation[]
  onPropertySelect: (propertyId: string) => void
}

export function CalendarListView({
  properties,
  reservations,
  onPropertySelect,
}: CalendarListViewProps) {
  const getReservationCount = (propertyId: string) => {
    return reservations.filter(r => r.propertyId === propertyId).length
  }

  const getNextReservation = (propertyId: string) => {
    const now = new Date()
    const future = reservations
      .filter(r => r.propertyId === propertyId && new Date(r.startDate) >= now)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    return future[0]
  }

  return (
    <div className="calendar-list-view">
      <div className="calendar-list-header">
        <h1>Calendários</h1>
      </div>

      <div className="calendar-list-container">
        {properties.map(property => {
          const resCount = getReservationCount(property.id)
          const nextRes = getNextReservation(property.id)

          return (
            <div
              key={property.id}
              className="calendar-list-card"
              onClick={() => onPropertySelect(property.id)}
            >
              <div className="card-image">
                {property.imageUrl ? (
                  <img src={property.imageUrl} alt={property.name} />
                ) : (
                  <div className="image-placeholder">📷</div>
                )}
              </div>

              <div className="card-content">
                <h3 className="card-name">{property.name}</h3>
                <p className="card-type">{property.type}</p>
                <p className="card-location">{property.location}</p>
                {resCount > 0 ? (
                  <span className="card-reservations">
                    📅 {resCount} reserva{resCount !== 1 ? 's' : ''}
                    {nextRes && ` • Próxima: ${new Date(nextRes.startDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`}
                  </span>
                ) : (
                  <span className="card-status">Disponível</span>
                )}
              </div>

              <div className="card-badge">
                {resCount > 0 ? (
                  <span className="badge-booked">{resCount}</span>
                ) : (
                  <span className="badge-available">✓</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
