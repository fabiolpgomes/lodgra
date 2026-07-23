'use client'

import { useState } from 'react'
import Image from 'next/image'

interface Property {
  id: string
  name: string
  type: string
  location: string
  image_url?: string
  reservations: Array<{ date: string; status: 'booked' | 'available' }>
}

interface PropertyCardListProps {
  properties: Property[]
  onSelectProperty: (propertyId: string) => void
}

export function PropertyCardList({ properties, onSelectProperty }: PropertyCardListProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const renderAvailabilityDots = (reservations: Property['reservations']) => {
    const days = 30
    const dots = []
    for (let i = 0; i < days; i++) {
      const isBooked = reservations.some(
        r => new Date(r.date).getDate() === (i % 30) + 1 && r.status === 'booked'
      )
      dots.push(
        <div
          key={i}
          className={`w-2 h-2 rounded-full ${
            isBooked ? 'bg-gray-400' : 'bg-green-500'
          }`}
        />
      )
    }
    return dots
  }

  return (
    <div className="mobile-property-list">
      {properties.map(property => (
        <button
          key={property.id}
          onClick={() => {
            setSelectedId(property.id)
            onSelectProperty(property.id)
          }}
          className={`property-card ${selectedId === property.id ? 'active' : ''}`}
          aria-label={`Select ${property.name}`}
        >
          {/* Property Image */}
          {property.image_url && (
            <div className="property-image">
              <Image
                src={property.image_url}
                alt={property.name}
                fill
                className="object-cover"
              />
            </div>
          )}

          {/* Property Info */}
          <div className="property-info">
            <h3 className="property-name">{property.name}</h3>
            <p className="property-type">{property.type}</p>
            <p className="property-location">{property.location}</p>
          </div>

          {/* Availability Dot Pattern */}
          <div className="availability-preview">
            <div className="dots-grid">
              {renderAvailabilityDots(property.reservations)}
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}
