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

const inputClass = 'w-full px-[16px] py-[14px] text-[16px] font-light border border-[#e6e6e6] rounded-none focus:outline-none focus:border-[#262626] disabled:opacity-50 disabled:cursor-not-allowed text-[#262626]'

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
    <div className="space-y-[32px]">
      {/* Location */}
      <div>
        <label htmlFor="location-filter" className="block text-[12px] font-bold text-[#6b6b6b] uppercase tracking-[0.5px] mb-2">
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
        <label className="block text-[12px] font-bold text-[#6b6b6b] uppercase tracking-[0.5px] mb-2">
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
            className="w-0 flex-1 px-[16px] py-[14px] text-[16px] font-light border border-[#e6e6e6] rounded-none focus:outline-none focus:border-[#262626] disabled:opacity-50 text-[#262626]"
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
            className="w-0 flex-1 px-[16px] py-[14px] text-[16px] font-light border border-[#e6e6e6] rounded-none focus:outline-none focus:border-[#262626] disabled:opacity-50 text-[#262626]"
            aria-label="Preço máximo"
          />
        </div>
      </div>

      {/* Property Type */}
      <div>
        <label className="block text-[12px] font-bold text-[#6b6b6b] uppercase tracking-[0.5px] mb-2">
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
                className="w-[18px] h-[18px] accent-[#1c69d4] cursor-pointer disabled:opacity-50 rounded-none border-[#e6e6e6]"
              />
              <span className="text-[14px] font-light text-[#3c3c3c] group-hover:text-[#1c69d4] transition-colors">{type.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Amenities */}
      <div>
        <label className="block text-[12px] font-bold text-[#6b6b6b] uppercase tracking-[0.5px] mb-2">
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
                className="w-[18px] h-[18px] accent-[#1c69d4] cursor-pointer disabled:opacity-50 rounded-none border-[#e6e6e6]"
              />
              <span className="text-[14px] font-light text-[#3c3c3c] group-hover:text-[#1c69d4] transition-colors">{amenity.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Reset Button */}
      <div className="pt-[16px] border-t border-[#e6e6e6]">
        <button
          onClick={handleReset}
          disabled={isLoading}
          className="w-full py-[14px] px-[32px] text-[13px] font-bold uppercase tracking-[1.5px] text-[#262626] border border-[#e6e6e6] rounded-none hover:bg-[#fafafa] hover:border-[#262626] transition-colors disabled:opacity-50 h-[48px]"
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
          className="fixed bottom-6 right-6 z-40 w-[56px] h-[56px] bg-[#1a2129] text-[#ffffff] rounded-none shadow-md hover:bg-[#262e38] transition-colors flex items-center justify-center focus:outline-none"
          aria-label="Abrir filtros"
          aria-expanded={isMobileOpen}
        >
          <span className="text-xl">☰</span>
        </button>

        {isMobileOpen && (
          <div
            className="fixed inset-0 z-50 bg-[#1a2129]/80 transition-opacity backdrop-blur-sm"
            onClick={() => setIsMobileOpen(false)}
            aria-hidden="true"
          />
        )}

        {isMobileOpen && (
          <div
            className="fixed bottom-0 left-0 right-0 z-50 bg-[#ffffff] rounded-none p-[24px] space-y-[24px] max-h-[90vh] overflow-y-auto border-t border-[#e6e6e6]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-filters-title"
          >
            <div className="flex items-center justify-between mb-4 border-b border-[#e6e6e6] pb-4">
              <h2 id="mobile-filters-title" className="text-[18px] font-bold text-[#262626]">Filtros</h2>
              <button
                onClick={() => setIsMobileOpen(false)}
                className="p-2 text-[#9a9a9a] hover:text-[#262626] rounded-none transition-colors focus:outline-none font-bold"
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
        <div className="bg-[#ffffff] rounded-none border border-[#e6e6e6] p-[32px]">
          <div className="flex items-center justify-between mb-[32px] pb-[16px] border-b border-[#e6e6e6]">
            <h2 className="text-[20px] font-bold text-[#262626]">Filtros</h2>
            {resultCount !== undefined && (
              <span className="text-[10px] font-bold text-[#6b6b6b] uppercase tracking-[1.5px]">
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
