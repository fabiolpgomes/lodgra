'use client'

import { useState } from 'react'

interface Property {
  id: string
  name: string
  type: string
  location: string
  imageUrl?: string
  availabilityDots: boolean[]
}

interface CalendarListViewProps {
  properties: Property[]
  onPropertySelect: (propertyId: string) => void
}

export function CalendarListView({
  properties,
  onPropertySelect,
}: CalendarListViewProps) {
  return (
    <div className="calendar-list-view">
      <div className="calendar-list-header">
        <h1>Calendários</h1>
      </div>

      <div className="calendar-list-container">
        {properties.map(property => (
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
              <span className="card-status">Anunciado</span>
            </div>

            <div className="card-availability">
              <div className="dots-grid">
                {property.availabilityDots.map((available, idx) => (
                  <div
                    key={idx}
                    className={`dot ${available ? 'available' : 'booked'}`}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
