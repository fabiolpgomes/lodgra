'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Filter, X } from 'lucide-react'

export interface PropertyFilterBarProps {
  availableCurrencies: string[]
}

const STORAGE_KEY = 'properties-filter-preferences'

interface FilterPreferences {
  isActive: string | null
  currency: string | null
}

export function PropertyFilterBar({ availableCurrencies }: PropertyFilterBarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mounted, setMounted] = useState(false)

  const isActive = searchParams.get('isActive')
  const selectedCurrency = searchParams.get('currency')
  const hasFilters = isActive !== null || selectedCurrency

  // Load saved preferences from localStorage on mount
  useEffect(() => {
    if (!mounted) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const preferences = JSON.parse(saved) as FilterPreferences
          const params = new URLSearchParams()

          if (preferences.isActive) {
            params.set('isActive', preferences.isActive)
          }
          if (preferences.currency) {
            params.set('currency', preferences.currency)
          }

          if (params.toString()) {
            router.push(`?${params.toString()}`)
          }
        }
      } catch (error) {
        console.error('Failed to load filter preferences:', error)
      }
      setMounted(true)
    }
  }, [mounted, router])

  const handleActiveChange = (value: string | null) => {
    const params = new URLSearchParams(searchParams)
    if (value) {
      params.set('isActive', value)
    } else {
      params.delete('isActive')
    }

    // Save to localStorage
    const preferences: FilterPreferences = {
      isActive: value,
      currency: selectedCurrency,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))

    router.push(`?${params.toString()}`)
  }

  const handleCurrencyChange = (value: string) => {
    const params = new URLSearchParams(searchParams)
    if (value) {
      params.set('currency', value)
    } else {
      params.delete('currency')
    }

    // Save to localStorage
    const preferences: FilterPreferences = {
      isActive,
      currency: value || null,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))

    router.push(`?${params.toString()}`)
  }

  const handleReset = () => {
    // Clear localStorage
    localStorage.removeItem(STORAGE_KEY)
    router.push('')
  }

  return (
    <div className="mb-6 rounded-2xl border border-brand-border-soft bg-brand-surface p-4 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-brand-text-medium" />
            <span className="text-sm font-medium text-brand-text-dark">Filtros</span>
            {hasFilters && (
              <span className="text-xs px-2 py-1 bg-brand-blue text-white rounded-full">
                {isActive ? 1 : 0 + (selectedCurrency ? 1 : 0)}
              </span>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <label className="text-xs font-semibold text-brand-text-medium">Status:</label>
            <select
              value={isActive || ''}
              onChange={(e) => handleActiveChange(e.target.value || null)}
              className="h-11 rounded-xl border border-brand-border bg-brand-canvas px-3 text-sm text-brand-text-dark focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
            >
              <option value="">Todos</option>
              <option value="true">✓ Ativos</option>
              <option value="false">✗ Inativos</option>
            </select>
          </div>

          {/* Currency Filter */}
          {availableCurrencies.length > 0 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <label className="text-xs font-semibold text-brand-text-medium">Moeda:</label>
              <select
                value={selectedCurrency || ''}
                onChange={(e) => handleCurrencyChange(e.target.value)}
                className="h-11 rounded-xl border border-brand-border bg-brand-canvas px-3 text-sm text-brand-text-dark focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              >
                <option value="">Todas</option>
                {availableCurrencies.map((curr) => (
                  <option key={curr} value={curr}>
                    {curr}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Reset Button */}
        {hasFilters && (
          <button
            onClick={handleReset}
            className="flex h-11 w-full items-center justify-center gap-1 rounded-xl border border-brand-blue/20 bg-brand-blue/10 px-3 text-sm font-medium text-brand-blue transition-all hover:bg-brand-blue/15 sm:w-auto"
          >
            <X className="h-3 w-3" />
            Limpar
          </button>
        )}
      </div>
    </div>
  )
}
