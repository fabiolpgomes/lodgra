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
  { id: 'piscina', label: 'Piscina', value: 'piscina' },
  { id: 'wifi', label: 'Wi-Fi', value: 'wi-fi' },
  { id: 'cozinha', label: 'Cozinha', value: 'cozinha' },
  { id: 'varanda', label: 'Varanda', value: 'varanda' },
  { id: 'estacionamento', label: 'Estacionamento', value: 'garagem' },
  { id: 'praia', label: 'Perto da praia', value: 'praia' },
  { id: 'ar-condicionado', label: 'Ar condicionado', value: 'ar condicionado' },
  { id: 'jardim', label: 'Jardim', value: 'jardim' },
]

const PROPERTY_TYPES = [
  { id: 'apartment', label: 'Apartamento', value: 'apartment' },
  { id: 'house', label: 'Casa', value: 'house' },
  { id: 'villa', label: 'Vila', value: 'villa' },
  { id: 'cottage', label: 'Chalé', value: 'cottage' },
]

const inputClass = 'w-full px-4 py-3.5 text-[16px] font-light border border-brand-gold/20 rounded-xl bg-brand-white focus:outline-none focus:border-brand-gold disabled:opacity-50 disabled:cursor-not-allowed text-brand-text-dark'

function FilterContent({ filters, onFiltersChange, onClose, isLoading }: {
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  onClose: () => void
  isLoading: boolean
}) {
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
    <div className="space-y-8">
      {/* Location */}
      <div>
        <label htmlFor="location-filter" className="block text-[12px] font-bold text-brand-text-medium uppercase tracking-[0.5px] mb-2">
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

      {/* Price Range */}
      <div>
        <label className="block text-[12px] font-bold text-brand-text-medium uppercase tracking-[0.5px] mb-2">
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
            className="w-0 flex-1 px-4 py-3.5 text-[16px] font-light border border-brand-gold/20 rounded-xl bg-brand-white focus:outline-none focus:border-brand-gold disabled:opacity-50 text-brand-text-dark"
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
            className="w-0 flex-1 px-4 py-3.5 text-[16px] font-light border border-brand-gold/20 rounded-xl bg-brand-white focus:outline-none focus:border-brand-gold disabled:opacity-50 text-brand-text-dark"
            aria-label="Preço máximo"
          />
        </div>
      </div>

      {/* Property Type */}
      <div>
        <label className="block text-[12px] font-bold text-brand-text-medium uppercase tracking-[0.5px] mb-2">
          Tipo de Imóvel
        </label>
        <div className="space-y-3">
          {PROPERTY_TYPES.map((type) => (
            <label key={type.id} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="radio"
                name="property-type"
                value={type.value}
                checked={filters.propertyType === type.value}
                onChange={() => handlePropertyTypeChange(type.value)}
                disabled={isLoading}
                className="w-[18px] h-[18px] accent-brand-gold cursor-pointer disabled:opacity-50 rounded-lg border-brand-gold/20"
              />
              <span className="text-[14px] font-light text-brand-text-medium group-hover:text-brand-gold transition-colors">{type.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Amenities */}
      <div>
        <label className="block text-[12px] font-bold text-brand-text-medium uppercase tracking-[0.5px] mb-2">
          Comodidades
        </label>
        <div className="space-y-3">
          {AMENITIES.map((amenity) => (
            <label key={amenity.id} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                value={amenity.value}
                checked={filters.amenities?.includes(amenity.value) || false}
                onChange={(e) => handleAmenityChange(amenity.value, e.target.checked)}
                disabled={isLoading}
                className="w-[18px] h-[18px] accent-brand-gold cursor-pointer disabled:opacity-50 rounded-lg border-brand-gold/20"
              />
              <span className="text-[14px] font-light text-brand-text-medium group-hover:text-brand-gold transition-colors">{amenity.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Reset Button */}
      <div className="pt-4 border-t border-brand-gold/15">
        <button
          onClick={handleReset}
          disabled={isLoading}
          className="w-full py-3.5 px-8 text-[13px] font-bold uppercase tracking-[1.5px] text-brand-blue border border-brand-gold/25 rounded-full hover:bg-brand-gold/10 hover:border-brand-gold transition-colors disabled:opacity-50 h-[48px]"
        >
          LIMPAR FILTROS
        </button>
      </div>
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
          className="fixed bottom-6 right-6 z-40 w-[56px] h-[56px] bg-brand-blue text-white rounded-full shadow-md hover:bg-brand-gold transition-colors flex items-center justify-center focus:outline-none"
          aria-label="Abrir filtros"
          aria-expanded={isMobileOpen}
        >
          <span className="text-xl">☰</span>
        </button>

        {isMobileOpen && (
          <div
            className="fixed inset-0 z-50 bg-brand-blue/80 transition-opacity backdrop-blur-sm"
            onClick={() => setIsMobileOpen(false)}
            aria-hidden="true"
          />
        )}

        {isMobileOpen && (
          <div
            className="fixed bottom-0 left-0 right-0 z-50 bg-brand-white rounded-t-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto border-t border-brand-gold/20"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-filters-title"
          >
            <div className="flex items-center justify-between mb-4 border-b border-brand-gold/15 pb-4">
              <h2 id="mobile-filters-title" className="text-[18px] font-bold text-brand-text-dark">Filtros</h2>
              <button
                onClick={() => setIsMobileOpen(false)}
                className="p-2 text-brand-text-medium hover:text-brand-gold rounded-lg transition-colors focus:outline-none font-bold"
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
      <aside className="hidden lg:block w-full flex-shrink-0 sticky top-[96px] h-fit">
        <div className="bg-brand-white rounded-2xl border border-brand-gold/15 p-8 shadow-sm transition-all hover:border-brand-gold/45 hover:shadow-[0_18px_42px_rgba(201,162,39,0.14)]">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-brand-gold/15">
            <h2 className="text-[20px] font-bold text-brand-text-dark">Filtros</h2>
            {resultCount !== undefined && (
              <span className="text-[10px] font-bold text-brand-text-medium uppercase tracking-[1.5px]">
                {resultCount} {resultCount === 1 ? 'RESULTADO' : 'RESULTADOS'}
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
