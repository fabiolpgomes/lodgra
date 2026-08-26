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
        className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#E5DFD2] bg-white text-[#1B2430] shadow-sm transition hover:bg-[#F7F5EF]"
        onClick={() => setIsOpen(true)}
        aria-label="Abrir menu"
        aria-expanded={isOpen}
      >
        <Menu size={24} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center sm:p-4" onClick={() => setIsOpen(false)}>
          <div
            className="w-full max-w-md rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E5DFD2] px-4 py-4 pt-[calc(1rem+env(safe-area-inset-top))] sm:px-5">
              <h3 className="text-base font-semibold text-[#1B2430] sm:text-lg">Propriedades</h3>
              <button
                className="flex h-11 w-11 items-center justify-center rounded-full text-[#1B2430] hover:bg-[#F7F5EF]"
                onClick={() => setIsOpen(false)}
                aria-label="Fechar menu"
              >
                <X size={24} />
              </button>
            </div>

            <div className="max-h-[75vh] space-y-3 overflow-y-auto px-3 py-3 sm:px-4 sm:py-4">
              {properties.map(property => (
                <button
                  key={property.id}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition hover:bg-[#F7F5EF] ${
                    selectedPropertyId === property.id
                      ? 'border-[#10203E] bg-[#F0F4F8]'
                      : 'border-[#E5DFD2] bg-white'
                  }`}
                  onClick={() => handleSelect(property.id)}
                  aria-label={`Selecionar ${property.name}`}
                >
                  <div className="relative h-15 w-15 shrink-0 overflow-hidden rounded-xl bg-[#F7F5EF]">
                    {property.imageUrl ? (
                      <Image
                        src={property.imageUrl}
                        alt={property.name}
                        width={60}
                        height={60}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-[#F7F5EF]" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-sm font-semibold text-[#1B2430]">{property.name}</h4>
                    <p className="truncate text-xs text-[#717171]">
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
