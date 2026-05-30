'use client'

import { useState, useCallback } from 'react'
import type { Property } from '@/types/database'
import Link from 'next/link'
import { Users, BedDouble, Bath, ArrowLeft, ExternalLink, Mail, MessageCircle, Phone } from 'lucide-react'
import { PropertyPageHeader } from './layout/PropertyPageHeader'
import { PropertyHeroGallery } from './gallery/PropertyHeroGallery'
import { PropertyDescription } from './content/PropertyDescription'
import { PropertyAmenitiesV2, type StructuredAmenity } from './content/PropertyAmenitiesV2'
import { PropertyLocation } from './content/PropertyLocation'
import { PropertyReviewScore } from './content/PropertyReviewScore'
import { PropertyReviewCards } from './content/PropertyReviewCards'
import type { ReviewScoreData, PropertyReview } from '@/types/database'
import { PropertyPolicies } from './content/PropertyPolicies'
import { PropertyRooms, type PropertyRoom } from './content/PropertyRooms'
import { PropertyBathrooms, type PropertyBathroom } from './content/PropertyBathrooms'
import { BookingWidgetDesktop } from './booking/BookingWidgetDesktop'
import { AvailabilityCalendar } from './booking/AvailabilityCalendar'
import { BookingWidgetMobile } from './booking/BookingWidgetMobile'
import { PropertyTrustBadges } from './layout/PropertyTrustBadges'
import { LazyPropertyLightbox } from '@/components/common/lazy/LazyPublic'
import { Logo } from '@/components/common/ui/Logo'
import { SimilarProperties } from '@/components/properties/SimilarProperties'
import type { SimilarProperty } from '@/lib/supabase/properties'

interface PricingRule {
  start_date: string
  end_date: string
  min_nights: number
}

interface PropertyPageV2Props {
  property: Property
  allPhotos: string[]
  currency: string
  initialCheckIn?: string
  initialCheckOut?: string
  initialGuests?: number
  minNights?: number
  pricingRules?: PricingRule[]
  structuredAmenities?: StructuredAmenity[]
  rooms?: PropertyRoom[]
  bathrooms?: PropertyBathroom[]
  minNightsError?: number
  datesUnavailable?: boolean
  cleaningFee?: number | null
  cleaningFeeType?: string | null
  petFee?: number | null
  petFeeType?: string | null
  checkinFrom?: string | null
  checkinUntil?: string | null
  checkoutUntil?: string | null
  blockedRanges?: { start: string; end: string }[]
  reviewScore?: ReviewScoreData | null
  featuredReviews?: PropertyReview[]
  similarProperties?: SimilarProperty[]
  orgName?: string | null
  publicProfile?: {
    contact_email: string | null
    contact_phone: string | null
    whatsapp_number: string | null
    website_url: string | null
    instagram_url: string | null
    public_contact_message: string | null
    address_line: string | null
    city: string | null
    country: string | null
  } | null
}

export function PropertyPageV2({ property, allPhotos, currency, initialCheckIn, initialCheckOut, initialGuests, minNights = 1, pricingRules = [], structuredAmenities, rooms, bathrooms, minNightsError, datesUnavailable, cleaningFee, cleaningFeeType, petFee, petFeeType, checkinFrom, checkinUntil, checkoutUntil, blockedRanges = [], reviewScore, featuredReviews, similarProperties = [], orgName, publicProfile }: PropertyPageV2Props) {
  const [showLightbox, setShowLightbox] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  // Shared date state — synced between AvailabilityCalendar ↔ BookingWidgetDesktop
  const [sharedCheckIn, setSharedCheckIn] = useState(initialCheckIn || '')
  const [sharedCheckOut, setSharedCheckOut] = useState(initialCheckOut || '')

  const handleOpenLightbox = (index: number) => {
    setLightboxIndex(index)
    setShowLightbox(true)
  }

  const handleCheckInChange = useCallback((v: string) => setSharedCheckIn(v), [])
  const handleCheckOutChange = useCallback((v: string) => setSharedCheckOut(v), [])

  // Contact bar helpers
  const whatsappHref = publicProfile?.whatsapp_number
    ? `https://wa.me/${publicProfile.whatsapp_number.replace(/[^\d]/g, '')}`
    : null
  const phoneHref = publicProfile?.contact_phone
    ? `tel:${publicProfile.contact_phone.replace(/[^\d+]/g, '')}`
    : null
  const locationText = publicProfile
    ? [publicProfile.address_line, publicProfile.city, publicProfile.country].filter(Boolean).join(', ')
    : ''
  const hasContact = !!(publicProfile?.whatsapp_number || publicProfile?.contact_email ||
    publicProfile?.contact_phone || publicProfile?.website_url || publicProfile?.instagram_url)
  const contactBtnClass = 'inline-flex min-h-[44px] items-center gap-2 border border-gray-300 bg-white px-4 text-[12px] font-bold uppercase tracking-[1.2px] text-brand-800 transition-colors hover:border-brand-800 hover:bg-brand-800 hover:text-white'

  return (
    <>
      {/* Back button (item 6) */}
      <div className="bg-white border-b border-gray-100 px-4 md:px-6 py-2">
        <div className="max-w-7xl mx-auto">
          <Link href="/booking" className="inline-flex items-center gap-2 text-[13px] text-brand-800 hover:text-brand-600 font-medium transition-colors min-h-[44px]">
            <ArrowLeft className="h-4 w-4" />
            Voltar às propriedades
          </Link>
        </div>
      </div>

      <PropertyPageHeader
        propertyName={property.name}
        city={property.city || ''}
        country={property.country || ''}
      />

      <main className="bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          {/* Error banners */}
          {datesUnavailable && (
            <div className="mt-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              As datas seleccionadas já não estão disponíveis. Por favor, escolha novas datas.
            </div>
          )}
          {minNightsError && (
            <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              A estadia mínima é de <strong>{minNightsError} {minNightsError === 1 ? 'noite' : 'noites'}</strong>. Por favor, ajuste as datas.
            </div>
          )}

          {/* ── Single grid: content (2/3) + sticky booking widget (1/3) (item 8) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-6">

            {/* LEFT — gallery + all content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Gallery */}
              <PropertyHeroGallery
                photos={allPhotos}
                propertyName={property.name}
                onViewAll={() => handleOpenLightbox(0)}
                onPhotoClick={handleOpenLightbox}
              />

              {/* Property identity */}
              <div className="flex flex-col items-start gap-2 pb-2">
                <Logo size="lg" />
                <h1 className="text-2xl font-bold text-gray-900 leading-tight">{property.name}</h1>
              </div>

              {/* Quick Stats */}
              <div className="flex flex-wrap gap-6 pb-6 border-b border-gray-200">
                {property.max_guests && (
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-lodgra-brand-50">
                      <Users className="h-5 w-5 text-lodgra-brand-700" />
                    </span>
                    <div>
                      <p className="text-xs text-gray-500">Hóspedes</p>
                      <p className="font-semibold text-gray-900">{property.max_guests}</p>
                    </div>
                  </div>
                )}
                {property.bedrooms && (
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-lodgra-brand-50">
                      <BedDouble className="h-5 w-5 text-lodgra-brand-700" />
                    </span>
                    <div>
                      <p className="text-xs text-gray-500">Quartos</p>
                      <p className="font-semibold text-gray-900">{property.bedrooms}</p>
                    </div>
                  </div>
                )}
                {property.bathrooms && (
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-lodgra-brand-50">
                      <Bath className="h-5 w-5 text-lodgra-brand-700" />
                    </span>
                    <div>
                      <p className="text-xs text-gray-500">Casas de banho</p>
                      <p className="font-semibold text-gray-900">{property.bathrooms}</p>
                    </div>
                  </div>
                )}
              </div>

              {property.description && <PropertyDescription description={property.description} />}
              {(structuredAmenities?.length || property.amenities?.length) ? (
                <PropertyAmenitiesV2 amenities={property.amenities ?? []} structuredAmenities={structuredAmenities} />
              ) : null}
              <PropertyRooms rooms={rooms ?? []} />
              <PropertyBathrooms bathrooms={bathrooms ?? []} />
              <PropertyPolicies cleaningFee={cleaningFee} cleaningFeeType={cleaningFeeType} petFee={petFee} petFeeType={petFeeType} checkinFrom={checkinFrom} checkinUntil={checkinUntil} checkoutUntil={checkoutUntil} currency={currency} />

              {/* Availability Calendar — item 7 */}
              <AvailabilityCalendar
                blockedRanges={blockedRanges}
                minNights={minNights}
                checkIn={sharedCheckIn}
                checkOut={sharedCheckOut}
                onCheckInChange={handleCheckInChange}
                onCheckOutChange={handleCheckOutChange}
              />

              <PropertyReviewScore reviewScore={reviewScore} />
              <PropertyReviewCards featuredReviews={featuredReviews} />
              <PropertyLocation address={property.address || ''} city={property.city || ''} country={property.country || ''} />

              {/* Contact bar — item 3 */}
              {hasContact && publicProfile && (
                <div className="border border-gray-200 rounded-xl p-5 bg-white">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold uppercase tracking-[1.4px] text-gray-900">
                        Fale directamente com {orgName ?? 'a empresa'}
                      </p>
                      {(publicProfile.public_contact_message || locationText) && (
                        <p className="mt-1 text-[13px] font-light leading-[1.5] text-gray-600">
                          {publicProfile.public_contact_message || locationText}
                          {publicProfile.public_contact_message && locationText ? ` · ${locationText}` : ''}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {whatsappHref && (
                        <a href={whatsappHref} target="_blank" rel="noreferrer" className={contactBtnClass}>
                          <MessageCircle className="h-4 w-4" /><span>WhatsApp</span>
                        </a>
                      )}
                      {publicProfile.contact_email && (
                        <a href={`mailto:${publicProfile.contact_email}`} className={contactBtnClass}>
                          <Mail className="h-4 w-4" /><span>Email</span>
                        </a>
                      )}
                      {phoneHref && (
                        <a href={phoneHref} className={contactBtnClass}>
                          <Phone className="h-4 w-4" /><span>Telefone</span>
                        </a>
                      )}
                      {publicProfile.website_url && (
                        <a href={publicProfile.website_url} target="_blank" rel="noreferrer" className={contactBtnClass}>
                          <ExternalLink className="h-4 w-4" /><span>Site</span>
                        </a>
                      )}
                      {publicProfile.instagram_url && (
                        <a href={publicProfile.instagram_url} target="_blank" rel="noreferrer" className={contactBtnClass}>
                          <ExternalLink className="h-4 w-4" /><span>Instagram</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT — sticky booking widget (item 8) */}
            <div className="hidden lg:block">
              <div className="sticky top-24">
                <BookingWidgetDesktop
                  propertyName={property.name}
                  basePrice={property.base_price || 0}
                  currency={currency}
                  slug={property.slug}
                  initialCheckIn={sharedCheckIn}
                  initialCheckOut={sharedCheckOut}
                  initialGuests={initialGuests}
                  minNights={minNights}
                  maxGuests={property.max_guests ?? undefined}
                  pricingRules={pricingRules}
                  blockedRanges={blockedRanges}
                  cleaningFee={cleaningFee}
                  cleaningFeeType={cleaningFeeType}
                  petFee={petFee}
                  petFeeType={petFeeType}
                  externalCheckIn={sharedCheckIn}
                  externalCheckOut={sharedCheckOut}
                  onCheckInChange={handleCheckInChange}
                  onCheckOutChange={handleCheckOutChange}
                />
              </div>
            </div>
          </div>

          <SimilarProperties
            properties={similarProperties}
            description={`Outras opções em ${property.city || 'sua região'} para comparar localização, preço e comodidades.`}
          />

          {/* Trust Badges */}
          <PropertyTrustBadges />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-6 px-4 md:px-6 mt-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
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
        maxGuests={property.max_guests ?? undefined}
        pricingRules={pricingRules}
        blockedRanges={blockedRanges}
        cleaningFee={cleaningFee}
        cleaningFeeType={cleaningFeeType}
        petFee={petFee}
        petFeeType={petFeeType}
      />

      {/* Lightbox Modal */}
      {showLightbox && (
        <LazyPropertyLightbox
          photos={allPhotos}
          initialIndex={lightboxIndex}
          onClose={() => setShowLightbox(false)}
        />
      )}
    </>
  )
}
