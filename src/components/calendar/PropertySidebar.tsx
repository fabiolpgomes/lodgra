'use client'

import { useState } from 'react'
import Image from 'next/image'

interface Property {
  id: string
  name: string
  type: string
  location: string
  imageUrl?: string
  availabilityDots: boolean[]
}

interface PropertySidebarProps {
  properties: Property[]
  selectedPropertyId?: string
  onPropertySelect?: (propertyId: string) => void
}

export function PropertySidebar({
  properties,
  selectedPropertyId,
  onPropertySelect,
}: PropertySidebarProps) {
  return (
    <div className="property-sidebar">
      <div className="property-sidebar-header">
        <h3>Propriedades</h3>
      </div>

      <div className="property-sidebar-list">
        {properties.map(property => (
          <button
            key={property.id}
            className={`property-sidebar-card ${
              selectedPropertyId === property.id ? 'active' : ''
            }`}
            onClick={() => onPropertySelect?.(property.id)}
            aria-label={`Select ${property.name}`}
          >
            <div className="sidebar-property-image">
              {property.imageUrl ? (
                <Image
                  src={property.imageUrl}
                  alt={property.name}
                  width={80}
                  height={80}
                  className="sidebar-image-img"
                />
              ) : (
                <div className="sidebar-image-placeholder" />
              )}
            </div>

            <div className="sidebar-property-info">
              <h4 className="sidebar-property-name">{property.name}</h4>
              <p className="sidebar-property-type">{property.type}</p>
              <p className="sidebar-property-location">{property.location}</p>
            </div>

            <div className="sidebar-availability-preview">
              <div className="sidebar-dots-grid">
                {property.availabilityDots.slice(0, 15).map((available, idx) => (
                  <div
                    key={idx}
                    className={`sidebar-dot ${available ? 'available' : 'booked'}`}
                    title={available ? 'Available' : 'Booked'}
                  />
                ))}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
