'use client'

import Link from 'next/link'
import { MapPin, Users, Bed, Bath } from 'lucide-react'
import { PropertyPageHeader } from './layout/PropertyPageHeader'
import { PropertyHeroGallery } from './gallery/PropertyHeroGallery'
import { BookingWidgetDesktop } from './booking/BookingWidgetDesktop'
import { BookingWidgetMobile } from './booking/BookingWidgetMobile'
import { PropertyDescription } from './content/PropertyDescription'
import { PropertyAmenitiesV2 } from './content/PropertyAmenitiesV2'
import { PropertyLocation } from './content/PropertyLocation'
import { PropertyTrustBadges } from './layout/PropertyTrustBadges'
import { Logo } from '@/components/common/ui/Logo'

interface PropertyPageV2Props {
  property: {
    id: string
    name: string
    description?: string | null
    city?: string | null
    country?: string | null
    address?: string | null
    photos?: string[] | null
    amenities?: string[] | null
    max_guests?: number
    bedrooms?: number
    bathrooms?: number
    property_type?: string | null
    slug?: string | null
    base_price?: number | null
  }
  allPhotos: string[]
}

export function PropertyPageV2({ property, allPhotos }: PropertyPageV2Props) {
  const location = [property.city, property.country].filter(Boolean).join(', ')

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--lodgra-surface, #FAFAF9)' }}>
      {/* Header */}
      <PropertyPageHeader propertyName={property.name} />

      <main>
        {/* Hero Gallery — full width, behind header */}
        <div className="pt-0">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-4">
            <PropertyHeroGallery
              photos={allPhotos}
              name={property.name}
            />
          </div>
        </div>

        {/* Content + Booking — 2 col layout */}
        <article className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

            {/* Left column — property details */}
            <div className="lg:col-span-2 space-y-8">

              {/* Title + stats */}
              <section aria-label="Detalhes da propriedade">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-lodgra-neutral-900 mb-3 tracking-tight">
                  {property.name}
                </h1>
                {location && (
                  <p className="flex items-center gap-1.5 text-lodgra-neutral-500 text-sm mb-4">
                    <MapPin className="h-4 w-4 shrink-0 text-lodgra-brand-400" />
                    {location}
                  </p>
                )}
                <div className="flex flex-wrap gap-5 text-sm text-lodgra-neutral-700">
                  {(property.max_guests ?? 0) > 0 && (
                    <span className="flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-lodgra-neutral-500" />
                      {property.max_guests} hóspede{property.max_guests !== 1 ? 's' : ''}
                    </span>
                  )}
                  {(property.bedrooms ?? 0) > 0 && (
                    <span className="flex items-center gap-1.5">
                      <Bed className="h-4 w-4 text-lodgra-neutral-500" />
                      {property.bedrooms} quarto{property.bedrooms !== 1 ? 's' : ''}
                    </span>
                  )}
                  {(property.bathrooms ?? 0) > 0 && (
                    <span className="flex items-center gap-1.5">
                      <Bath className="h-4 w-4 text-lodgra-neutral-500" />
                      {property.bathrooms} casa{property.bathrooms !== 1 ? 's' : ''} de banho
                    </span>
                  )}
                </div>
              </section>

              <hr className="border-lodgra-neutral-200" />

              {/* Description */}
              {property.description && (
                <PropertyDescription description={property.description} />
              )}

              {/* Amenities */}
              {property.amenities && property.amenities.length > 0 && (
                <>
                  <hr className="border-lodgra-neutral-200" />
                  <PropertyAmenitiesV2 amenities={property.amenities} />
                </>
              )}

              {/* Location */}
              <hr className="border-lodgra-neutral-200" />
              <PropertyLocation
                city={property.city}
                country={property.country}
                address={property.address}
              />
            </div>

            {/* Right column — booking widget (desktop) */}
            <div className="lg:col-span-1 hidden lg:block">
              <BookingWidgetDesktop
                slug={property.slug!}
                basePrice={property.base_price ?? 0}
              />
            </div>
          </div>
        </article>
      </main>

      {/* Mobile booking bar */}
      <BookingWidgetMobile
        slug={property.slug!}
        basePrice={property.base_price ?? 0}
      />

      {/* Footer */}
      <footer className="mt-16 border-t border-lodgra-neutral-200 bg-white px-4 py-10">
        <div className="max-w-6xl mx-auto space-y-6 text-center">
          <Logo variant="default" size="sm" className="mx-auto" />
          <PropertyTrustBadges />
          <div className="flex flex-wrap justify-center gap-4 text-xs text-lodgra-neutral-500">
            <Link href="/politica-privacidade" className="hover:text-lodgra-neutral-900 transition-colors">
              Política de Privacidade
            </Link>
            <span>·</span>
            <Link href="/termos" className="hover:text-lodgra-neutral-900 transition-colors">
              Termos de Uso
            </Link>
          </div>
          <p className="text-xs text-lodgra-neutral-500">
            © {new Date().getFullYear()} lodgra.pt · Reservas directas sem comissões
          </p>
        </div>
      </footer>
    </div>
  )
}
