'use client'

import { useState, useCallback } from 'react'
import { Filter, X } from 'lucide-react'

export interface PropertiesFilterState {
  isActive: boolean | null
  currency: string | null
}

export interface PropertiesFiltersProps {
  onFilterChange: (filters: PropertiesFilterState) => void
  availableCurrencies: string[]
}

export function PropertiesFilters({ onFilterChange, availableCurrencies }: PropertiesFiltersProps) {
  const [filters, setFilters] = useState<PropertiesFilterState>({
    isActive: true,
    currency: null,
  })
  const [isOpen, setIsOpen] = useState(false)

  const handleActiveChange = useCallback((value: boolean | null) => {
    const newFilters = { ...filters, isActive: value }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }, [filters, onFilterChange])

  const handleCurrencyChange = useCallback((value: string | null) => {
    const newFilters = { ...filters, currency: value }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }, [filters, onFilterChange])

  const handleReset = useCallback(() => {
    const resetFilters: PropertiesFilterState = {
      isActive: true,
      currency: null,
    }
    setFilters(resetFilters)
    onFilterChange(resetFilters)
  }, [onFilterChange])

  const activeFilterCount = [
    filters.isActive !== true ? 1 : 0,
    filters.currency ? 1 : 0,
  ].reduce((a, b) => a + b, 0)

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-surface rounded-lg border border-brand-border hover:border-brand-blue/30 transition-colors"
          >
            <Filter className="h-4 w-4 text-brand-text-medium" />
            <span className="text-sm font-medium text-brand-text-dark">
              Filtros {activeFilterCount > 0 && `(${activeFilterCount})`}
            </span>
          </button>

          {isOpen && (
            <div className="absolute top-full mt-2 left-0 w-80 bg-white rounded-lg shadow-lg border border-brand-border-soft p-4 z-20">
              <div className="space-y-4">
                {/* Ativo/Inativo Filter */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-brand-text-medium mb-2 block">
                    Status
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleActiveChange(true)}
                      className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-all ${
                        filters.isActive === true
                          ? 'bg-brand-blue text-white'
                          : 'bg-brand-surface-soft text-brand-text-dark border border-brand-border hover:border-brand-blue/30'
                      }`}
                    >
                      ✓ Ativos
                    </button>
                    <button
                      onClick={() => handleActiveChange(false)}
                      className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-all ${
                        filters.isActive === false
                          ? 'bg-brand-blue text-white'
                          : 'bg-brand-surface-soft text-brand-text-dark border border-brand-border hover:border-brand-blue/30'
                      }`}
                    >
                      ✗ Inativos
                    </button>
                    <button
                      onClick={() => handleActiveChange(null)}
                      className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-all ${
                        filters.isActive === null
                          ? 'bg-brand-blue text-white'
                          : 'bg-brand-surface-soft text-brand-text-dark border border-brand-border hover:border-brand-blue/30'
                      }`}
                    >
                      Todos
                    </button>
                  </div>
                </div>

                {/* Currency Filter */}
                {availableCurrencies.length > 0 && (
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-brand-text-medium mb-2 block">
                      Moeda
                    </label>
                    <select
                      value={filters.currency || ''}
                      onChange={(e) => handleCurrencyChange(e.target.value || null)}
                      className="w-full px-3 py-2 rounded border border-brand-border bg-brand-canvas text-brand-text-dark text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 transition-all"
                    >
                      <option value="">Todas as moedas</option>
                      {availableCurrencies.map((curr) => (
                        <option key={curr} value={curr}>
                          {curr}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Reset Button */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="flex-1 px-3 py-2 rounded text-sm font-medium bg-brand-surface-soft text-brand-text-dark border border-brand-border hover:border-brand-blue/30 transition-all"
                  >
                    Fechar
                  </button>
                  {activeFilterCount > 0 && (
                    <button
                      onClick={handleReset}
                      className="flex-1 px-3 py-2 rounded text-sm font-medium bg-brand-blue/10 text-brand-blue border border-brand-blue/20 hover:bg-brand-blue/15 transition-all flex items-center justify-center gap-1"
                    >
                      <X className="h-3 w-3" />
                      Limpar
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
