'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ExternalLink, Mail, MessageCircle, Phone } from 'lucide-react'
import { Logo } from '@/components/common/ui/Logo'
import { SearchBar, type SearchParams } from '@/components/common/public/properties/SearchBar'
import { PropertyFilters, type FilterState } from '@/components/common/public/properties/PropertyFilters'
import { PropertyGrid } from '@/components/common/public/properties/PropertyGrid'
import { TemplateHero } from '@/components/booking/TemplateHero'
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

interface PublicContactProfile {
  contact_email: string | null
  contact_phone: string | null
  whatsapp_number: string | null
  website_url: string | null
  instagram_url: string | null
  public_contact_message: string | null
  address_line: string | null
  city: string | null
  country: string | null
}

interface Props {
  orgSlug: string | null
  orgName: string | null
  orgLogoUrl: string | null
  publicProfile: PublicContactProfile | null
  initialData: {
    properties: PropertyCardProps[]
    pagination: { totalPages: number; totalItems: number }
  }
}

function getWhatsAppHref(number: string) {
  const digits = number.replace(/[^\d]/g, '')
  return digits ? `https://wa.me/${digits}` : null
}

function getLocationText(profile: PublicContactProfile) {
  return [profile.address_line, profile.city, profile.country].filter(Boolean).join(', ')
}

function getPhoneHref(number: string) {
  const normalized = number.replace(/[^\d+]/g, '')
  return normalized ? `tel:${normalized}` : null
}

export function BookingPageClient({ orgSlug, orgName, orgLogoUrl, publicProfile, initialData }: Props) {
  const [filters, setFilters] = useState<FilterState>({})
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [data, setData] = useState<{
    properties: PropertyCardProps[]
    pagination: { totalPages: number; totalItems: number }
  } | null>(initialData)
  const [template, setTemplate] = useState<TemplateConfig | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [templateLoading, setTemplateLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasSkippedInitialFetch = useRef(false)

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
    const isInitialView =
      currentPage === 1 &&
      !searchParams &&
      Object.keys(filters).length === 0

    if (!hasSkippedInitialFetch.current && initialData && isInitialView) {
      hasSkippedInitialFetch.current = true
      return
    }

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
    }, 150)

    return () => clearTimeout(timer)
  }, [filters, searchParams, currentPage, orgSlug, initialData])

  const properties = data?.properties ?? []
  const totalPages = data?.pagination?.totalPages ?? 1
  const resultCount = data?.pagination?.totalItems

  const title = template?.booking_headline ?? 'Sua casa de férias, sem complicações.'
  const subtitle = template?.booking_subtitle ?? (orgName
    ? `Reserve directamente com ${orgName}`
    : 'Encontre a propriedade perfeita para sua próxima viagem')
  const whatsappHref = publicProfile?.whatsapp_number ? getWhatsAppHref(publicProfile.whatsapp_number) : null
  const phoneHref = publicProfile?.contact_phone ? getPhoneHref(publicProfile.contact_phone) : null
  const locationText = publicProfile ? getLocationText(publicProfile) : ''
  const hasPublicContact = Boolean(
    publicProfile?.whatsapp_number ||
    publicProfile?.contact_email ||
    publicProfile?.contact_phone ||
    publicProfile?.website_url ||
    publicProfile?.instagram_url ||
    publicProfile?.public_contact_message ||
    locationText
  )
  const contactButtonClass =
    'group inline-flex h-10 items-center gap-2 border border-[#d8d8d8] bg-white px-4 text-[12px] font-bold uppercase tracking-[1.2px] text-[#1E40AF] transition-colors hover:border-[#1E40AF] hover:bg-[#1E40AF]'
  const contactButtonIconClass = 'h-4 w-4 text-[#1E40AF] transition-colors group-hover:text-white'
  const contactButtonTextClass = 'text-[#1E40AF] transition-colors group-hover:text-white'

  return (
    <div className="min-h-screen bg-[#f7f7f7] font-light text-[#3c3c3c]">
      {/* Header - top-nav */}
      <header className="bg-[#ffffff] border-b border-[#e6e6e6] px-6 h-[72px] flex items-center justify-center sticky top-0 z-50">
        <div className="w-full max-w-[1440px] mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Logo size="md" />
            <span className="text-[18px] font-bold tracking-tight text-[#262626]">LODGRA</span>
          </Link>
          {orgName && (
            <div className="ml-4 flex min-w-0 items-center justify-end gap-4 border-l border-[#e6e6e6] pl-5">
              {orgLogoUrl && (
                <div className="flex h-14 w-20 shrink-0 items-center justify-center overflow-visible">
                  <img
                    src={orgLogoUrl}
                    alt={`Logotipo ${orgName}`}
                    className="h-full w-full scale-125 object-contain"
                  />
                </div>
              )}
              <span className="truncate text-right text-[15px] font-bold tracking-[0.4px] text-[#262626] sm:text-[18px]">
                {orgName}
              </span>
            </div>
          )}
        </div>
      </header>

      {hasPublicContact && publicProfile && (
        <section className="border-b border-[#e6e6e6] bg-white px-6 py-4">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-[13px] font-bold uppercase tracking-[1.4px] text-[#262626]">
                Fale diretamente com {orgName ?? 'a empresa'}
              </p>
              {(publicProfile.public_contact_message || locationText) && (
                <p className="mt-1 text-[14px] font-light leading-[1.5] text-[#5f5f5f]">
                  {publicProfile.public_contact_message || locationText}
                  {publicProfile.public_contact_message && locationText ? ` · ${locationText}` : ''}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {whatsappHref && (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  className={contactButtonClass}
                >
                  <MessageCircle className={contactButtonIconClass} />
                  <span className={contactButtonTextClass}>WhatsApp</span>
                </a>
              )}
              {publicProfile.contact_email && (
                <a
                  href={`mailto:${publicProfile.contact_email}`}
                  className={contactButtonClass}
                >
                  <Mail className={contactButtonIconClass} />
                  <span className={contactButtonTextClass}>Email</span>
                </a>
              )}
              {phoneHref && (
                <a
                  href={phoneHref}
                  className={contactButtonClass}
                >
                  <Phone className={contactButtonIconClass} />
                  <span className={contactButtonTextClass}>Telefone</span>
                </a>
              )}
              {publicProfile.website_url && (
                <a
                  href={publicProfile.website_url}
                  target="_blank"
                  rel="noreferrer"
                  className={contactButtonClass}
                >
                  <ExternalLink className={contactButtonIconClass} />
                  <span className={contactButtonTextClass}>Site</span>
                </a>
              )}
              {publicProfile.instagram_url && (
                <a
                  href={publicProfile.instagram_url}
                  target="_blank"
                  rel="noreferrer"
                  className={contactButtonClass}
                >
                  <ExternalLink className={contactButtonIconClass} />
                  <span className={contactButtonTextClass}>Instagram</span>
                </a>
              )}
            </div>
          </div>
        </section>
      )}

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
