'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { Logo } from '@/components/common/ui/Logo'
import { SearchBar, type SearchParams } from '@/components/common/public/properties/SearchBar'
import { PropertyFilters, type FilterState } from '@/components/common/public/properties/PropertyFilters'
import { PropertyGrid } from '@/components/common/public/properties/PropertyGrid'
import type { PropertyCardProps } from '@/components/common/public/properties/PropertyCard'

interface Props {
  orgSlug: string | null
  orgName: string | null
}

export function BookingPageClient({ orgSlug, orgName }: Props) {
  const [filters, setFilters] = useState<FilterState>({})
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [data, setData] = useState<{
    properties: PropertyCardProps[]
    pagination: { totalPages: number; totalItems: number }
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFilterChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters)
    setCurrentPage(1)
  }, [])

  const handleSearch = useCallback((params: SearchParams) => {
    setSearchParams(params)
    setCurrentPage(1)
  }, [])

  useEffect(() => {
    const timer = setTimeout(async () => {
      setIsLoading(true)
      try {
        const params = new URLSearchParams()
        params.set('limit', '12')
        params.set('page', String(currentPage))
        if (orgSlug) params.set('orgSlug', orgSlug)

        if (searchParams?.location) {
          params.set('location', searchParams.location)
        } else if (filters.location) {
          params.set('location', filters.location)
        }
        if (filters.priceMin !== undefined) params.set('priceMin', String(filters.priceMin))
        if (filters.priceMax !== undefined) params.set('priceMax', String(filters.priceMax))
        if (filters.amenities && filters.amenities.length > 0) {
          filters.amenities.forEach(a => params.append('amenities', a))
        }
        if (filters.propertyType) params.set('type', filters.propertyType)
        if (filters.minRating !== undefined) params.set('minRating', String(filters.minRating))
        if (searchParams?.checkIn) params.set('checkIn', searchParams.checkIn)
        if (searchParams?.checkOut) params.set('checkOut', searchParams.checkOut)
        if (searchParams?.guests) params.set('guests', String(searchParams.guests))

        const response = await fetch(`/api/properties?${params.toString()}`)
        const result = await response.json()
        setData(result.data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [filters, searchParams, currentPage, orgSlug])

  const properties = data?.properties ?? []
  const totalPages = data?.pagination?.totalPages ?? 1
  const resultCount = data?.pagination?.totalItems

  const title = orgName ? `${orgName} — Propriedades` : 'Descobrir Propriedades'
  const subtitle = orgName
    ? `Reserve directamente com ${orgName}`
    : 'Encontre a propriedade perfeita para sua próxima viagem'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/">
            <Logo size="md" />
          </Link>
          <Link href="/login" className="text-sm font-medium text-lodgra-blue hover:underline">
            Entrar
          </Link>
        </div>
      </header>

      {/* Page Title */}
      <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-6 md:py-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{title}</h1>
          <p className="text-gray-600">{subtitle}</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-6">
        <div className="max-w-7xl mx-auto">
          <SearchBar onSearch={handleSearch} isLoading={isLoading} />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 px-4 md:px-6 py-4 mx-4 md:mx-6 mt-4 rounded-lg">
          <p className="text-red-700 font-semibold">Erro ao carregar propriedades</p>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Content */}
      <div className="px-4 md:px-6 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex gap-6">
            <div className="hidden lg:block flex-shrink-0">
              <PropertyFilters
                onFilterChange={handleFilterChange}
                isLoading={isLoading}
                resultCount={resultCount}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="lg:hidden mb-4">
                <PropertyFilters
                  onFilterChange={handleFilterChange}
                  isLoading={isLoading}
                  resultCount={resultCount}
                />
              </div>
              <PropertyGrid
                properties={properties}
                isLoading={isLoading}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                resultCount={resultCount}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
