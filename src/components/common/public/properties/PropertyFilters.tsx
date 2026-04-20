'use client'

import { useState, useCallback } from 'react'

export interface FilterState {
  location?: string
  priceMin?: number
  priceMax?: number
  amenities?: string[]
  propertyType?: string
  minRating?: number
}

export interface PropertyFiltersProps {
  onFilterChange: (filters: FilterState) => void
  isLoading?: boolean
  resultCount?: number
}

const AMENITIES = [
  { id: 'pool', label: '🏊 Piscina', value: 'pool' },
  { id: 'wifi', label: '📶 WiFi', value: 'wifi' },
  { id: 'ac', label: '❄️ Ar condicionado', value: 'ac' },
  { id: 'kitchen', label: '🍳 Cozinha', value: 'kitchen' },
  { id: 'parking', label: '🚗 Estacionamento', value: 'parking' },
  { id: 'washer', label: '🧺 Máquina lavar', value: 'washer' },
  { id: 'pets', label: '🐕 Pets', value: 'pets' },
  { id: 'heating', label: '🔥 Aquecimento', value: 'heating' },
]

const PROPERTY_TYPES = [
  { id: 'apartment', label: 'Apartamento', value: 'apartment' },
  { id: 'house', label: 'Casa', value: 'house' },
  { id: 'villa', label: 'Vila', value: 'villa' },
  { id: 'cottage', label: 'Chalé', value: 'cottage' },
]

function FilterContent({ filters, onFiltersChange, onClose, isLoading }: {
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  onClose: () => void
  isLoading: boolean
}) {

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    onFiltersChange({ ...filters, location: value })
  }

  const handlePriceMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ? parseFloat(e.target.value) : undefined
    onFiltersChange({ ...filters, priceMin: value })
  }

  const handlePriceMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ? parseFloat(e.target.value) : undefined
    onFiltersChange({ ...filters, priceMax: value })
  }

  const handleAmenityChange = (amenity: string, checked: boolean) => {
    const current = filters.amenities || []
    const updated = checked
      ? [...current, amenity]
      : current.filter(a => a !== amenity)
    onFiltersChange({ ...filters, amenities: updated.length > 0 ? updated : undefined })
  }

  const handlePropertyTypeChange = (type: string) => {
    onFiltersChange({ ...filters, propertyType: type === filters.propertyType ? undefined : type })
  }

  const handleReset = () => {
    onFiltersChange({})
    onClose()
  }

  return (
    <div className="space-y-6">
      {/* Location */}
      <div>
        <label htmlFor="location-filter" className="
          block
          text-sm
          font-semibold
          text-hs-neutral-900
          mb-2
        ">
          Localização
        </label>
        <input
          id="location-filter"
          type="text"
          placeholder="Cidade, país..."
          value={filters.location || ''}
          onChange={handleLocationChange}
          disabled={isLoading}
          className="
            w-full
            px-3
            py-2
            text-sm
            border border-hs-neutral-300
            rounded-lg
            focus:outline-none
            focus:ring-2
            focus:ring-hs-brand-400
            disabled:opacity-50
            disabled:cursor-not-allowed
          "
          aria-label="Filtrar por localização"
        />
      </div>

      {/* Price Range */}
      <div>
        <label className="
          block
          text-sm
          font-semibold
          text-hs-neutral-900
          mb-2
        ">
          Intervalo de Preço
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Mín"
            value={filters.priceMin || ''}
            onChange={handlePriceMinChange}
            disabled={isLoading}
            min="0"
            className="
              flex-1
              px-3
              py-2
              text-sm
              border border-hs-neutral-300
              rounded-lg
              focus:outline-none
              focus:ring-2
              focus:ring-hs-brand-400
              disabled:opacity-50
              disabled:cursor-not-allowed
            "
            aria-label="Preço mínimo"
          />
          <input
            type="number"
            placeholder="Máx"
            value={filters.priceMax || ''}
            onChange={handlePriceMaxChange}
            disabled={isLoading}
            min="0"
            className="
              flex-1
              px-3
              py-2
              text-sm
              border border-hs-neutral-300
              rounded-lg
              focus:outline-none
              focus:ring-2
              focus:ring-hs-brand-400
              disabled:opacity-50
              disabled:cursor-not-allowed
            "
            aria-label="Preço máximo"
          />
        </div>
      </div>

      {/* Property Type */}
      <div>
        <label className="
          block
          text-sm
          font-semibold
          text-hs-neutral-900
          mb-2
        ">
          Tipo de Imóvel
        </label>
        <div className="space-y-2">
          {PROPERTY_TYPES.map((type) => (
            <label key={type.id} className="
              flex
              items-center
              gap-2
              cursor-pointer
              p-2
              rounded-lg
              hover:bg-hs-neutral-100
              transition-colors
              focus-within:ring-2
              focus-within:ring-hs-brand-400
            ">
              <input
                type="radio"
                name="property-type"
                value={type.value}
                checked={filters.propertyType === type.value}
                onChange={() => handlePropertyTypeChange(type.value)}
                disabled={isLoading}
                className="
                  w-4
                  h-4
                  accent-hs-brand-400
                  cursor-pointer
                  disabled:opacity-50
                  disabled:cursor-not-allowed
                "
              />
              <span className="text-sm text-hs-neutral-700">{type.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Amenities */}
      <div>
        <label className="
          block
          text-sm
          font-semibold
          text-hs-neutral-900
          mb-2
        ">
          Comodidades (todos selecionados)
        </label>
        <div className="space-y-2">
          {AMENITIES.map((amenity) => (
            <label key={amenity.id} className="
              flex
              items-center
              gap-2
              cursor-pointer
              p-2
              rounded-lg
              hover:bg-hs-neutral-100
              transition-colors
              focus-within:ring-2
              focus-within:ring-hs-brand-400
            ">
              <input
                type="checkbox"
                value={amenity.value}
                checked={filters.amenities?.includes(amenity.value) || false}
                onChange={(e) => handleAmenityChange(amenity.value, e.target.checked)}
                disabled={isLoading}
                className="
                  w-4
                  h-4
                  accent-hs-brand-400
                  cursor-pointer
                  disabled:opacity-50
                  disabled:cursor-not-allowed
                "
              />
              <span className="text-sm text-hs-neutral-700">{amenity.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Reset Button */}
      <button
        onClick={handleReset}
        disabled={isLoading}
        className="
          w-full
          py-2.5
          px-3
          text-sm
          font-semibold
          text-hs-brand-400
          border border-hs-brand-400
          rounded-lg
          hover:bg-hs-brand-50
          active:bg-hs-brand-100
          transition-colors
          disabled:opacity-50
          disabled:cursor-not-allowed
          focus:outline-none
          focus:ring-2
          focus:ring-hs-brand-400
          focus:ring-offset-2
          min-h-10
        "
        aria-label="Limpar todos os filtros"
      >
        Limpar Filtros
      </button>
    </div>
  )
}

export function PropertyFilters({
  onFilterChange,
  isLoading = false,
  resultCount,
}: PropertyFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({})
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const handleFiltersChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters)
    onFilterChange(newFilters)
  }, [onFilterChange])

  return (
    <>
      {/* Mobile: Filter Toggle Button + Modal */}
      <div className="lg:hidden">
        <button
          onClick={() => setIsMobileOpen(true)}
          className="
            fixed
            bottom-6
            right-6
            z-40
            w-14
            h-14
            bg-hs-brand-400
            text-white
            rounded-full
            shadow-lg
            hover:bg-hs-brand-500
            active:bg-hs-brand-600
            transition-colors
            flex items-center justify-center
            focus:outline-none
            focus:ring-2
            focus:ring-hs-brand-400
            focus:ring-offset-2
            min-h-12
            min-w-12
            p-0
          "
          aria-label="Abrir filtros"
          aria-expanded={isMobileOpen}
        >
          <span className="text-xl">🔽</span>
        </button>

        {/* Mobile Modal Backdrop */}
        {isMobileOpen && (
          <div
            className="
              fixed
              inset-0
              z-50
              bg-black/50
              transition-opacity
            "
            onClick={() => setIsMobileOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Mobile Modal */}
        {isMobileOpen && (
          <div
            className="
              fixed
              bottom-0
              left-0
              right-0
              z-50
              bg-white
              rounded-t-2xl
              p-4
              space-y-4
              max-h-[90vh]
              overflow-y-auto
              animate-in
              slide-in-from-bottom
            "
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-filters-title"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 id="mobile-filters-title" className="
                text-lg
                font-bold
                text-hs-neutral-900
              ">
                Filtros
              </h2>
              <button
                onClick={() => setIsMobileOpen(false)}
                className="
                  p-2
                  text-hs-neutral-600
                  hover:bg-hs-neutral-100
                  rounded-lg
                  transition-colors
                  focus:outline-none
                  focus:ring-2
                  focus:ring-hs-brand-400
                "
                aria-label="Fechar filtros"
              >
                ✕
              </button>
            </div>
            <FilterContent
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onClose={() => setIsMobileOpen(false)}
              isLoading={isLoading}
            />
          </div>
        )}
      </div>

      {/* Desktop: Sidebar */}
      <aside className="
        hidden
        lg:block
        w-80
        sticky
        top-4
        h-fit
      ">
        <div className="
          bg-white
          rounded-xl
          border border-hs-neutral-200
          p-6
          space-y-6
        ">
          <div className="flex items-center justify-between">
            <h2 className="
              text-lg
              font-bold
              text-hs-neutral-900
            ">
              Filtros
            </h2>
            {resultCount !== undefined && (
              <span className="
                text-xs
                font-semibold
                text-hs-neutral-600
                bg-hs-neutral-100
                px-2
                py-1
                rounded-full
              ">
                {resultCount}
              </span>
            )}
          </div>

          <FilterContent
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onClose={() => {}}
            isLoading={isLoading}
          />
        </div>
      </aside>
    </>
  )
}
