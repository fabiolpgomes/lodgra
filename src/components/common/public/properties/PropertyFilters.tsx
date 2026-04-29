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
  { id: 'piscina', label: '🏊 Piscina', value: 'piscina' },
  { id: 'wifi', label: '📶 Wi-Fi', value: 'wi-fi' },
  { id: 'cozinha', label: '🍳 Cozinha', value: 'cozinha' },
  { id: 'varanda', label: '🌿 Varanda', value: 'varanda' },
  { id: 'estacionamento', label: '🚗 Estacionamento', value: 'garagem' },
  { id: 'praia', label: '🏖️ Perto da praia', value: 'praia' },
  { id: 'ar-condicionado', label: '❄️ Ar condicionado', value: 'ar condicionado' },
  { id: 'jardim', label: '🌳 Jardim', value: 'jardim' },
]

const PROPERTY_TYPES = [
  { id: 'apartment', label: 'Apartamento', value: 'apartment' },
  { id: 'house', label: 'Casa', value: 'house' },
  { id: 'villa', label: 'Vila', value: 'villa' },
  { id: 'cottage', label: 'Chalé', value: 'cottage' },
]

const inputClass = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed'

function FilterContent({ filters, onFiltersChange, onClose, isLoading }: {
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  onClose: () => void
  isLoading: boolean
}) {
  // Local price state — only propagate on blur to avoid re-fetch on every keystroke
  const [priceMinInput, setPriceMinInput] = useState(filters.priceMin?.toString() ?? '')
  const [priceMaxInput, setPriceMaxInput] = useState(filters.priceMax?.toString() ?? '')

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ ...filters, location: e.target.value })
  }

  const handlePriceMinBlur = () => {
    const value = priceMinInput ? parseFloat(priceMinInput) : undefined
    onFiltersChange({ ...filters, priceMin: value })
  }

  const handlePriceMaxBlur = () => {
    const value = priceMaxInput ? parseFloat(priceMaxInput) : undefined
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
    setPriceMinInput('')
    setPriceMaxInput('')
    onFiltersChange({})
    onClose()
  }

  return (
    <div className="space-y-6">
      {/* Location */}
      <div>
        <label htmlFor="location-filter" className="block text-sm font-semibold text-gray-900 mb-2">
          Localização
        </label>
        <input
          id="location-filter"
          type="text"
          placeholder="Cidade, país..."
          value={filters.location || ''}
          onChange={handleLocationChange}
          disabled={isLoading}
          className={inputClass}
          aria-label="Filtrar por localização"
        />
      </div>

      {/* Price Range — blur-only to avoid per-keystroke refresh */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Intervalo de Preço (noite)
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Mín"
            value={priceMinInput}
            onChange={(e) => setPriceMinInput(e.target.value)}
            onBlur={handlePriceMinBlur}
            disabled={isLoading}
            min="0"
            className="w-0 flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Preço mínimo"
          />
          <input
            type="number"
            placeholder="Máx"
            value={priceMaxInput}
            onChange={(e) => setPriceMaxInput(e.target.value)}
            onBlur={handlePriceMaxBlur}
            disabled={isLoading}
            min="0"
            className="w-0 flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Preço máximo"
          />
        </div>
      </div>

      {/* Property Type */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Tipo de Imóvel
        </label>
        <div className="space-y-2">
          {PROPERTY_TYPES.map((type) => (
            <label key={type.id} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="property-type"
                value={type.value}
                checked={filters.propertyType === type.value}
                onChange={() => handlePropertyTypeChange(type.value)}
                disabled={isLoading}
                className="w-4 h-4 accent-blue-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <span className="text-sm text-gray-700">{type.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Amenities */}
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Comodidades (todos selecionados)
        </label>
        <div className="space-y-2">
          {AMENITIES.map((amenity) => (
            <label key={amenity.id} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors">
              <input
                type="checkbox"
                value={amenity.value}
                checked={filters.amenities?.includes(amenity.value) || false}
                onChange={(e) => handleAmenityChange(amenity.value, e.target.checked)}
                disabled={isLoading}
                className="w-4 h-4 accent-blue-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <span className="text-sm text-gray-700">{amenity.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Reset Button */}
      <button
        onClick={handleReset}
        disabled={isLoading}
        className="w-full py-2.5 px-3 text-sm font-semibold text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 active:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
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
          className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 active:bg-blue-800 transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-label="Abrir filtros"
          aria-expanded={isMobileOpen}
        >
          <span className="text-xl">🔽</span>
        </button>

        {isMobileOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/50 transition-opacity"
            onClick={() => setIsMobileOpen(false)}
            aria-hidden="true"
          />
        )}

        {isMobileOpen && (
          <div
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl p-4 space-y-4 max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-filters-title"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 id="mobile-filters-title" className="text-lg font-bold text-gray-900">Filtros</h2>
              <button
                onClick={() => setIsMobileOpen(false)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
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

      {/* Desktop: Sidebar — w-64 to leave more room for property cards */}
      <aside className="hidden lg:block w-64 flex-shrink-0 sticky top-4 h-fit">
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Filtros</h2>
            {resultCount !== undefined && (
              <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
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
