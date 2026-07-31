'use client'

import { useState, useMemo } from 'react'
import { Home } from 'lucide-react'
import { PropertiesFilters, type PropertiesFilterState } from './PropertiesFilters'

export interface Property {
  id: string
  name: string
  property_type: string | null
  is_active: boolean
  is_public?: boolean
  slug?: string | null
  city: string | null
  country: string | null
  bedrooms: number | null
  max_guests: number | null
  base_price?: number | string | null
  currency?: string | null
  created_at?: string
  updated_at?: string
}

export interface PropertyCardProps {
  property: Property
  imageUrl: string | null
  locale: string
  canEdit?: boolean
}

interface PropertiesListContainerProps {
  properties: Property[]
  imageMap: Map<string, string>
  locale: string
  PropertyCard: React.ComponentType<PropertyCardProps>
}

export function PropertiesListContainer({
  properties,
  imageMap,
  locale,
  PropertyCard,
}: PropertiesListContainerProps) {
  const [filters, setFilters] = useState<PropertiesFilterState>({
    isActive: true,
    currency: null,
  })

  const availableCurrencies = useMemo(() => {
    const currencies = new Set<string>()
    properties.forEach((p) => {
      if (p.currency) currencies.add(p.currency)
    })
    return Array.from(currencies).sort()
  }, [properties])

  const filteredProperties = useMemo(() => {
    return properties.filter((property) => {
      if (filters.isActive !== null && property.is_active !== filters.isActive) {
        return false
      }

      if (filters.currency && property.currency !== filters.currency) {
        return false
      }

      return true
    })
  }, [properties, filters])

  return (
    <>
      <PropertiesFilters
        onFilterChange={setFilters}
        availableCurrencies={availableCurrencies}
      />

      {filteredProperties.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Home className="h-16 w-16 text-brand-text-medium mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-brand-text-dark mb-2">
            Nenhuma propriedade encontrada
          </h3>
          <p className="text-brand-text-medium">
            {properties.length === 0
              ? 'Comece adicionando sua primeira propriedade.'
              : 'Nenhuma propriedade corresponde aos filtros selecionados.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              imageUrl={imageMap.get(property.id) ?? null}
              locale={locale}
            />
          ))}
        </div>
      )}
    </>
  )
}
