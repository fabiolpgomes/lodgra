'use client'

import { useState } from 'react'
import { X, Menu } from 'lucide-react'
import Image from 'next/image'

interface Property {
  id: string
  name: string
  type: string
  location: string
  imageUrl?: string
}

interface HamburgerMenuProps {
  properties: Property[]
  selectedPropertyId?: string
  onPropertySelect?: (propertyId: string) => void
}

export function HamburgerMenu({
  properties,
  selectedPropertyId,
  onPropertySelect,
}: HamburgerMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleSelect = (propertyId: string) => {
    onPropertySelect?.(propertyId)
    setIsOpen(false)
  }

  return (
    <>
      <button
        className="hamburger-button"
        onClick={() => setIsOpen(true)}
        aria-label="Open menu"
        aria-expanded={isOpen}
      >
        <Menu size={24} />
      </button>

      {isOpen && (
        <div className="hamburger-overlay" onClick={() => setIsOpen(false)}>
          <div
            className="hamburger-menu-content"
            onClick={e => e.stopPropagation()}
          >
            <div className="hamburger-header">
              <h3>Propriedades</h3>
              <button
                className="hamburger-close"
                onClick={() => setIsOpen(false)}
                aria-label="Close menu"
              >
                <X size={24} />
              </button>
            </div>

            <div className="hamburger-properties-list">
              {properties.map(property => (
                <button
                  key={property.id}
                  className={`hamburger-property-item ${
                    selectedPropertyId === property.id ? 'active' : ''
                  }`}
                  onClick={() => handleSelect(property.id)}
                  aria-label={`Select ${property.name}`}
                >
                  <div className="hamburger-property-image">
                    {property.imageUrl ? (
                      <Image
                        src={property.imageUrl}
                        alt={property.name}
                        width={60}
                        height={60}
                        className="hamburger-image-img"
                      />
                    ) : (
                      <div className="hamburger-image-placeholder" />
                    )}
                  </div>

                  <div className="hamburger-property-info">
                    <h4 className="hamburger-property-name">{property.name}</h4>
                    <p className="hamburger-property-meta">
                      {property.type} • {property.location}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
