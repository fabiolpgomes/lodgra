'use client'

import { useState } from 'react'
import type { Property } from '@/types/database'
import Link from 'next/link'
import { Users, BedDouble, Bath } from 'lucide-react'
import { PropertyPageHeader } from './layout/PropertyPageHeader'
import { PropertyHeroGallery } from './gallery/PropertyHeroGallery'
import { PropertyDescription } from './content/PropertyDescription'
import { PropertyAmenitiesV2 } from './content/PropertyAmenitiesV2'
import { PropertyLocation } from './content/PropertyLocation'
import { BookingWidgetDesktop } from './booking/BookingWidgetDesktop'
import { BookingWidgetMobile } from './booking/BookingWidgetMobile'
import { PropertyTrustBadges } from './layout/PropertyTrustBadges'
import { PropertyLightbox } from './gallery/PropertyLightbox'

interface PropertyPageV2Props {
  property: Property
  allPhotos: string[]
  currency: string
  initialCheckIn?: string
  initialCheckOut?: string
  initialGuests?: number
  minNights?: number
  minNightsError?: number
}

export function PropertyPageV2({ property, allPhotos, currency, initialCheckIn, initialCheckOut, initialGuests, minNights = 1, minNightsError }: PropertyPageV2Props) {
  const [showLightbox, setShowLightbox] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  const handleOpenLightbox = (index: number) => {
    setLightboxIndex(index)
    setShowLightbox(true)
  }

  return (
    <>
      <PropertyPageHeader
        propertyName={property.name}
        city={property.city || ''}
        country={property.country || ''}
      />

      <main className="bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          {/* Minimum nights error banner */}
          {minNightsError && (
            <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              A estadia mínima para esta propriedade é de <strong>{minNightsError} {minNightsError === 1 ? 'noite' : 'noites'}</strong>. Por favor, ajuste as datas.
            </div>
          )}

          {/* Hero Section with Gallery and Booking Widget */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-6">
            {/* Left: Gallery (2/3 width on desktop) */}
            <div className="lg:col-span-2">
              <PropertyHeroGallery
                photos={allPhotos}
                propertyName={property.name}
                onViewAll={() => handleOpenLightbox(0)}
                onPhotoClick={handleOpenLightbox}
              />
            </div>

            {/* Right: Booking Widget (1/3 width on desktop) */}
            <div className="hidden lg:block">
              <BookingWidgetDesktop
                propertyName={property.name}
                basePrice={property.base_price || 0}
                currency={currency}
                slug={property.slug}
                initialCheckIn={initialCheckIn}
                initialCheckOut={initialCheckOut}
                initialGuests={initialGuests}
                minNights={minNights}
              />
            </div>
          </div>

          {/* Content Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-6">
            {/* Main Content (2/3) */}
            <div className="lg:col-span-2 space-y-8">
              {/* Quick Stats */}
              <div className="flex flex-wrap gap-6 pb-6 border-b border-neutral-200">
                {property.max_guests && (
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-lodgra-brand-50">
                      <Users className="h-5 w-5 text-lodgra-brand-700" />
                    </span>
                    <div>
                      <p className="text-xs text-neutral-500">Hóspedes</p>
                      <p className="font-semibold text-neutral-900">{property.max_guests}</p>
                    </div>
                  </div>
                )}
                {property.bedrooms && (
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-lodgra-brand-50">
                      <BedDouble className="h-5 w-5 text-lodgra-brand-700" />
                    </span>
                    <div>
                      <p className="text-xs text-neutral-500">Quartos</p>
                      <p className="font-semibold text-neutral-900">{property.bedrooms}</p>
                    </div>
                  </div>
                )}
                {property.bathrooms && (
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-lodgra-brand-50">
                      <Bath className="h-5 w-5 text-lodgra-brand-700" />
                    </span>
                    <div>
                      <p className="text-xs text-neutral-500">Casas de banho</p>
                      <p className="font-semibold text-neutral-900">{property.bathrooms}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              {property.description && (
                <PropertyDescription description={property.description} />
              )}

              {/* Amenities */}
              {property.amenities && property.amenities.length > 0 && (
                <PropertyAmenitiesV2 amenities={property.amenities} />
              )}

              {/* Location */}
              <PropertyLocation
                address={property.address || ''}
                city={property.city || ''}
                country={property.country || ''}
              />
            </div>

            {/* Sidebar Desktop Booking (1/3) - will be hidden on mobile */}
            <div className="hidden lg:flex lg:flex-col">
              {/* Desktop booking already shown above, this space is for layout */}
            </div>
          </div>

          {/* Trust Badges */}
          <PropertyTrustBadges />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 py-6 px-4 md:px-6 mt-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-500">
          <p>© {new Date().getFullYear()} Lodgra · Reservas directas sem comissões</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-neutral-700 transition-colors">Política de Privacidade</Link>
            <Link href="/terms" className="hover:text-neutral-700 transition-colors">Termos</Link>
          </div>
        </div>
      </footer>

      {/* Mobile Booking Widget - Fixed Bottom */}
      <BookingWidgetMobile
        propertyName={property.name}
        basePrice={property.base_price || 0}
        currency={currency}
        slug={property.slug}
        initialCheckIn={initialCheckIn}
        initialCheckOut={initialCheckOut}
        initialGuests={initialGuests}
        minNights={minNights}
      />

      {/* Lightbox Modal */}
      {showLightbox && (
        <PropertyLightbox
          photos={allPhotos}
          initialIndex={lightboxIndex}
          onClose={() => setShowLightbox(false)}
        />
      )}
    </>
  )
}
