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
            isBooked ? 'bg-gray-400' : 'bg-emerald-600'
          }`}
        />
      )
    }
    return dots
  }

  return (
    <div className="space-y-3 px-4 py-4 sm:px-6">
      {properties.map(property => (
        <button
          key={property.id}
          onClick={() => {
            setSelectedId(property.id)
            onSelectProperty(property.id)
          }}
          className={`flex w-full flex-col gap-3 rounded-2xl border p-3 text-left transition hover:bg-[#F7F5EF] sm:flex-row sm:items-center sm:gap-4 sm:p-4 ${
            selectedId === property.id
              ? 'border-[#10203E] bg-[#F0F4F8]'
              : 'border-[#E5DFD2] bg-white'
          }`}
          aria-label={`Select ${property.name}`}
        >
          {/* Property Image */}
          {property.image_url && (
            <div className="relative h-40 w-full overflow-hidden rounded-xl bg-[#F7F5EF] sm:h-20 sm:w-24 sm:flex-none">
              <Image
                src={property.image_url}
                alt={property.name}
                fill
                className="object-cover"
              />
            </div>
          )}

          {/* Property Info */}
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold text-[#1B2430]">{property.name}</h3>
            <p className="mt-1 text-sm font-medium text-[#4D5566]">{property.type}</p>
            <p className="truncate text-sm text-[#717171]">{property.location}</p>
          </div>

          {/* Availability Dot Pattern */}
          <div className="shrink-0">
            <div className="grid grid-cols-5 gap-1">
              {renderAvailabilityDots(property.reservations)}
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}
