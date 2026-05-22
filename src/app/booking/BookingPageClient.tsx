'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { Logo } from '@/components/common/ui/Logo'
import { SearchBar, type SearchParams } from '@/components/common/public/properties/SearchBar'
import { PropertyFilters, type FilterState } from '@/components/common/public/properties/PropertyFilters'
import { PropertyGrid } from '@/components/common/public/properties/PropertyGrid'
import { TemplateHero } from '@/components/booking/TemplateHero'
import { TemplateProperties } from '@/components/booking/TemplateProperties'
import type { PropertyCardProps } from '@/components/common/public/properties/PropertyCard'

interface TemplateConfig {
  booking_headline: string
  booking_subtitle: string
  booking_description: string | null
  template_type: 'standard' | 'luxury' | 'budget'
  hero_image_url: string | null
  featured_property_ids: string[] | null
  show_all_properties: boolean
  primary_color: string
  secondary_color: string
}

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
  const [template, setTemplate] = useState<TemplateConfig | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [templateLoading, setTemplateLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFilterChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters)
    setCurrentPage(1)
  }, [])

  const handleSearch = useCallback((params: SearchParams) => {
    setSearchParams(params)
    setCurrentPage(1)
  }, [])

  // Fetch template config if orgSlug exists
  useEffect(() => {
    if (!orgSlug) {
      setTemplate(null)
      return
    }

    const fetchTemplate = async () => {
      setTemplateLoading(true)
      try {
        const response = await fetch(`/api/organizations/${orgSlug}/template`)
        if (response.ok) {
          const config = await response.json()
          setTemplate(config)
        } else {
          setTemplate(null)
        }
      } catch (err) {
        console.error('Error fetching template:', err)
        setTemplate(null)
      } finally {
        setTemplateLoading(false)
      }
    }

    fetchTemplate()
  }, [orgSlug])

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

  const title = template?.booking_headline ?? (orgName ? `${orgName} — Propriedades` : 'Descobrir Propriedades')
  const subtitle = template?.booking_subtitle ?? (orgName
    ? `Reserve directamente com ${orgName}`
    : 'Encontre a propriedade perfeita para sua próxima viagem')

  return (
    <div className="min-h-screen bg-[#f7f7f7] font-light text-[#3c3c3c]">
      {/* Header - top-nav */}
      <header className="bg-[#ffffff] border-b border-[#e6e6e6] px-6 h-[64px] flex items-center justify-center sticky top-0 z-50">
        <div className="w-full max-w-[1440px] mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Logo size="md" />
            <span className="text-[18px] font-bold tracking-tight text-[#262626]">LODGRA</span>
          </Link>
          <Link
            href="/"
            className="text-[13px] font-bold tracking-[1.5px] uppercase text-[#262626] hover:text-[#1c69d4] transition-colors"
          >
            Conheça a Lodgra
          </Link>
        </div>
      </header>

      {/* Hero Section - Template or Default */}
      {template && !templateLoading ? (
        <TemplateHero
          headline={template.booking_headline}
          subtitle={template.booking_subtitle}
          description={template.booking_description}
          heroImageUrl={template.hero_image_url}
          templateType={template.template_type}
        />
      ) : (
        <div className="bg-[#ffffff] px-6 py-[48px] border-b border-[#e6e6e6]">
          <div className="max-w-[1440px] mx-auto">
            <h1 className="text-[32px] md:text-[48px] font-bold text-[#262626] leading-[1.1] mb-[16px]">{title}</h1>
            <p className="text-[16px] font-light text-[#3c3c3c] leading-[1.55]">{subtitle}</p>
            <div className="w-[48px] h-[4px] bg-[#1c69d4] mt-[24px]"></div>
          </div>
        </div>
      )}

      {/* Search Bar container */}
      <div className="bg-[#ffffff] border-b border-[#e6e6e6] px-6 py-[32px]">
        <div className="max-w-[1440px] mx-auto">
          <SearchBar onSearch={handleSearch} isLoading={isLoading} />
        </div>
      </div>

      {error && (
        <div className="bg-[#1a2129] border border-[#dc2626] px-6 py-4 mx-6 mt-[24px] max-w-[1440px] xl:mx-auto rounded-none">
          <p className="text-[#dc2626] font-bold text-[14px] uppercase tracking-[0.5px] mb-1">Erro</p>
          <p className="text-[#ffffff] text-[14px] font-light">{error}</p>
        </div>
      )}

      {/* Content */}
      <div className="px-6 py-[48px]">
        <div className="max-w-[1440px] mx-auto">
          <div className="flex flex-col lg:flex-row gap-[48px]">
            <div className="hidden lg:block w-[300px] flex-shrink-0">
              <PropertyFilters
                onFilterChange={handleFilterChange}
                isLoading={isLoading}
                resultCount={resultCount}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="lg:hidden mb-[32px]">
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
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
