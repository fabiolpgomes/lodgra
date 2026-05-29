'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ExternalLink, Mail, MessageCircle, Phone, ChevronDown } from 'lucide-react'
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
  const [contactExpanded, setContactExpanded] = useState(false)
  const hasSkippedInitialFetch = useRef(false)

  const handleFilterChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters)
    setCurrentPage(1)
  }, [])

  const handleSearch = useCallback((params: SearchParams) => {
    setSearchParams(params)
    setCurrentPage(1)
  }, [])

  useEffect(() => {
    if (!orgSlug) { setTemplate(null); return }
    const fetchTemplate = async () => {
      setTemplateLoading(true)
      try {
        const response = await fetch(`/api/organizations/${orgSlug}/template`)
        setTemplate(response.ok ? await response.json() : null)
      } catch { setTemplate(null) }
      finally { setTemplateLoading(false) }
    }
    fetchTemplate()
  }, [orgSlug])

  useEffect(() => {
    const isInitialView = currentPage === 1 && !searchParams && Object.keys(filters).length === 0
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
        if (searchParams?.location) params.set('location', searchParams.location)
        else if (filters.location) params.set('location', filters.location)
        if (filters.priceMin !== undefined) params.set('priceMin', String(filters.priceMin))
        if (filters.priceMax !== undefined) params.set('priceMax', String(filters.priceMax))
        if (filters.amenities?.length) filters.amenities.forEach(a => params.append('amenities', a))
        if (filters.propertyType) params.set('type', filters.propertyType)
        if (filters.minRating !== undefined) params.set('minRating', String(filters.minRating))
        if (searchParams?.checkIn) params.set('checkIn', searchParams.checkIn)
        if (searchParams?.checkOut) params.set('checkOut', searchParams.checkOut)
        if (searchParams?.guests) params.set('guests', String(searchParams.guests))
        const response = await fetch(`/api/properties?${params.toString()}`)
        setData((await response.json()).data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally { setIsLoading(false) }
    }, 150)
    return () => clearTimeout(timer)
  }, [filters, searchParams, currentPage, orgSlug, initialData])

  const properties = data?.properties ?? []
  const totalPages = data?.pagination?.totalPages ?? 1
  const resultCount = data?.pagination?.totalItems
  const title = template?.booking_headline ?? 'Sua casa de férias, sem complicações.'
  const subtitle = template?.booking_subtitle ?? (orgName ? `Reserve directamente com ${orgName}` : 'Encontre a propriedade perfeita para sua próxima viagem')
  const whatsappHref = publicProfile?.whatsapp_number ? getWhatsAppHref(publicProfile.whatsapp_number) : null
  const phoneHref = publicProfile?.contact_phone ? getPhoneHref(publicProfile.contact_phone) : null
  const locationText = publicProfile ? getLocationText(publicProfile) : ''
  const hasPublicContact = Boolean(
    publicProfile?.whatsapp_number || publicProfile?.contact_email ||
    publicProfile?.contact_phone || publicProfile?.website_url ||
    publicProfile?.instagram_url || publicProfile?.public_contact_message || locationText
  )

  const contactLinks = [
    whatsappHref && { href: whatsappHref, icon: <MessageCircle className="h-4 w-4 shrink-0" />, label: 'WhatsApp', external: true },
    publicProfile?.contact_email && { href: `mailto:${publicProfile.contact_email}`, icon: <Mail className="h-4 w-4 shrink-0" />, label: 'Email', external: false },
    phoneHref && { href: phoneHref, icon: <Phone className="h-4 w-4 shrink-0" />, label: 'Telefone', external: false },
    publicProfile?.website_url && { href: publicProfile.website_url, icon: <ExternalLink className="h-4 w-4 shrink-0" />, label: 'Site', external: true },
    publicProfile?.instagram_url && { href: publicProfile.instagram_url, icon: <ExternalLink className="h-4 w-4 shrink-0" />, label: 'Instagram', external: true },
  ].filter(Boolean) as { href: string; icon: React.ReactNode; label: string; external: boolean }[]

  const primaryContacts = contactLinks.slice(0, 2)
  const secondaryContacts = contactLinks.slice(2)

  const btnBase = 'inline-flex h-11 items-center gap-2 border border-gray-300 bg-white px-4 text-[12px] font-bold uppercase tracking-[1.2px] text-brand-800 transition-colors hover:border-brand-800 hover:bg-brand-800 hover:text-white active:scale-95'

  return (
    <div className="min-h-screen bg-gray-50 font-light text-gray-700">

      {/* ── Header ─────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 h-14 sm:h-[72px] flex items-center sticky top-0 z-40">
        <div className="w-full max-w-[1440px] mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Logo size="sm" />
            <span className="text-[16px] sm:text-[18px] font-bold tracking-tight text-gray-900">LODGRA</span>
          </Link>
          {orgName && (
            <div className="ml-3 flex min-w-0 items-center gap-2 sm:gap-4 border-l border-gray-200 pl-3 sm:pl-5">
              {orgLogoUrl && (
                <div className="flex h-10 w-14 sm:h-14 sm:w-20 shrink-0 items-center justify-center overflow-visible">
                  <img src={orgLogoUrl} alt={`Logotipo ${orgName}`} className="h-full w-full scale-125 object-contain" />
                </div>
              )}
              <span className="truncate text-right text-[13px] sm:text-[18px] font-bold tracking-[0.4px] text-gray-900 max-w-[140px] sm:max-w-none">
                {orgName}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* ── Hero — compact on mobile ───────────────────────── */}
      {template && !templateLoading ? (
        <TemplateHero
          headline={template.booking_headline}
          subtitle={template.booking_subtitle}
          description={template.booking_description}
          heroImageUrl={template.hero_image_url}
          templateType={template.template_type}
        />
      ) : (
        <div className="bg-white px-4 sm:px-6 py-6 sm:py-12 border-b border-gray-200">
          <div className="max-w-[1440px] mx-auto">
            <h1 className="text-2xl sm:text-[48px] font-bold text-gray-900 leading-[1.15] mb-2 sm:mb-4">{title}</h1>
            <p className="text-sm sm:text-[16px] font-light text-gray-600 leading-[1.55]">{subtitle}</p>
            <div className="w-10 h-1 bg-brand-600 mt-4 sm:mt-6" />
          </div>
        </div>
      )}

      {/* ── Search ─────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 sm:py-8">
        <div className="max-w-[1440px] mx-auto">
          <SearchBar onSearch={handleSearch} isLoading={isLoading} hideLocation={!!orgSlug} />
        </div>
      </div>

      {/* ── Contact bar — collapsed on mobile ─────────────── */}
      {hasPublicContact && publicProfile && contactLinks.length > 0 && (
        <section className="border-b border-gray-200 bg-white px-4 sm:px-6 py-3 sm:py-4">
          <div className="mx-auto max-w-[1440px]">
            {/* Mobile: compact row */}
            <div className="flex items-center gap-2 sm:hidden">
              <p className="text-[11px] font-bold uppercase tracking-[1.2px] text-gray-500 shrink-0 mr-1">
                Contacto:
              </p>
              <div className="flex flex-1 items-center gap-2 overflow-hidden">
                {primaryContacts.map(({ href, icon, label, external }) => (
                  <a key={label} href={href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined}
                    className={`${btnBase} flex-1 justify-center`}>
                    {icon}<span>{label}</span>
                  </a>
                ))}
              </div>
              {secondaryContacts.length > 0 && (
                <button
                  onClick={() => setContactExpanded(v => !v)}
                  className="h-11 w-11 shrink-0 flex items-center justify-center border border-gray-300 bg-white text-gray-600 hover:border-brand-800 hover:text-brand-800 transition-colors"
                  aria-label="Ver mais contactos"
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${contactExpanded ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>

            {/* Mobile: expanded secondary contacts */}
            {contactExpanded && secondaryContacts.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2 sm:hidden">
                {secondaryContacts.map(({ href, icon, label, external }) => (
                  <a key={label} href={href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined}
                    className={btnBase}>
                    {icon}<span>{label}</span>
                  </a>
                ))}
              </div>
            )}

            {/* Desktop: full contact bar */}
            <div className="hidden sm:flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="text-[13px] font-bold uppercase tracking-[1.4px] text-gray-900">
                  Fale diretamente com {orgName ?? 'a empresa'}
                </p>
                {(publicProfile.public_contact_message || locationText) && (
                  <p className="mt-1 text-[14px] font-light leading-[1.5] text-gray-600">
                    {publicProfile.public_contact_message || locationText}
                    {publicProfile.public_contact_message && locationText ? ` · ${locationText}` : ''}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {contactLinks.map(({ href, icon, label, external }) => (
                  <a key={label} href={href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined}
                    className={btnBase}>
                    {icon}<span>{label}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {error && (
        <div className="bg-gray-900 border border-red-600 px-4 py-4 mx-4 mt-4 max-w-[1440px] xl:mx-auto rounded-none">
          <p className="text-red-500 font-bold text-[14px] uppercase tracking-[0.5px] mb-1">Erro</p>
          <p className="text-white text-[14px] font-light">{error}</p>
        </div>
      )}

      {/* ── Content ────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 py-6 sm:py-12">
        <div className="max-w-[1440px] mx-auto">
          <div className="flex flex-col lg:flex-row gap-6 sm:gap-12">
            <div className="hidden lg:block w-[300px] flex-shrink-0">
              <PropertyFilters onFilterChange={handleFilterChange} isLoading={isLoading} resultCount={resultCount} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="lg:hidden mb-6">
                <PropertyFilters onFilterChange={handleFilterChange} isLoading={isLoading} resultCount={resultCount} />
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
