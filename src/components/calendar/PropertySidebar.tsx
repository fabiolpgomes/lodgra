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
    <div className="flex h-full flex-col bg-white">
      <div className="border-b border-[#E5DFD2] px-4 py-4 sm:px-5">
        <h3 className="text-base font-semibold text-[#1B2430] sm:text-lg">Propriedades</h3>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3 sm:px-4 sm:py-4">
        {properties.map(property => (
          <button
            key={property.id}
            className={`flex w-full gap-3 rounded-2xl border p-3 text-left transition hover:bg-[#F7F5EF] sm:gap-4 sm:p-4 ${
              selectedPropertyId === property.id
                ? 'border-[#10203E] bg-[#F0F4F8]'
                : 'border-[#E5DFD2] bg-white'
            }`}
            onClick={() => onPropertySelect?.(property.id)}
            aria-label={`Select ${property.name}`}
          >
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#F7F5EF] sm:h-20 sm:w-20">
              {property.imageUrl ? (
                <Image
                  src={property.imageUrl}
                  alt={property.name}
                  width={80}
                  height={80}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-[#F7F5EF]" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h4 className="truncate text-sm font-semibold text-[#1B2430] sm:text-base">{property.name}</h4>
              <p className="mt-1 text-xs font-medium text-[#4D5566] sm:text-sm">{property.type}</p>
              <p className="truncate text-xs text-[#717171] sm:text-sm">{property.location}</p>
            </div>

            <div className="shrink-0">
              <div className="grid grid-cols-5 gap-1">
                {property.availabilityDots.slice(0, 15).map((available, idx) => (
                  <div
                    key={idx}
                    className={`h-2 w-2 rounded-full sm:h-2.5 sm:w-2.5 ${
                      available ? 'bg-emerald-500' : 'bg-gray-400'
                    }`}
                    title={available ? 'Disponível' : 'Reservado'}
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
