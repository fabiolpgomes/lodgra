/**
 * JSON-LD structured data generators for SEO / Google Vacation Rentals.
 * Structure follows Google's "Aluguel por temporada" spec:
 * VacationRental → containsPlace → Accommodation (address, geo, amenities)
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://lodgra.io'

interface AmenityItem {
  name: string
  icon?: string
  category?: string
}

interface PropertyData {
  name: string
  description?: string | null
  city?: string | null
  country?: string | null
  address?: string | null
  postal_code?: string | null
  photos?: string[] | null
  imageUrls?: string[]
  base_price?: number | null
  currency?: string | null
  min_nights?: number | null
  max_guests?: number | null
  bedrooms?: number | null
  bathrooms?: number | null
  slug?: string | null
  property_type?: string | null
  checkin_from?: string | null
  checkin_until?: string | null
  checkout_until?: string | null
  cleaning_fee?: number | null
  cleaning_fee_type?: string | null
  pet_fee?: number | null
  pet_fee_type?: string | null
  latitude?: number | null
  longitude?: number | null
  structuredAmenities?: AmenityItem[]
}

// Normalise a HH:MM or HH:MM:SS string to ISO 8601 time (T15:00:00)
function toIsoTime(t: string | null | undefined, fallback: string): string {
  const val = t ?? fallback
  const parts = val.split(':')
  const normalised = parts.length >= 3 ? val : `${val}:00`
  return `T${normalised}`
}

export function generatePropertyJsonLd(property: PropertyData) {
  const currency = property.currency ?? 'EUR'
  const minNights = property.min_nights ?? 1

  // Resolve images: prefer optimised WebP gallery, fall back to legacy photos[]
  const images = property.imageUrls?.length
    ? property.imageUrls
    : (property.photos?.filter(Boolean) ?? [])
  const imageField = images.length > 1 ? images : images[0] ?? undefined

  // Amenities for the Accommodation unit
  const amenityFeature: object[] = property.structuredAmenities?.map(a => ({
    '@type': 'LocationFeatureSpecification',
    name: a.name,
    value: true,
  })) ?? []

  // PostalAddress (lives inside containsPlace.Accommodation)
  const postalAddress = {
    '@type': 'PostalAddress',
    ...(property.address && { streetAddress: property.address }),
    ...(property.city && { addressLocality: property.city }),
    ...(property.postal_code && { postalCode: property.postal_code }),
    ...(property.country && { addressCountry: property.country }),
  }

  // containsPlace: the physical Accommodation unit
  const containsPlace = {
    '@type': 'Accommodation',
    address: postalAddress,
    ...(property.latitude && property.longitude && {
      geo: {
        '@type': 'GeoCoordinates',
        latitude: property.latitude,
        longitude: property.longitude,
      },
    }),
    ...(property.bedrooms && { numberOfRooms: property.bedrooms }),
    ...(property.bathrooms && { numberOfBathroomsTotal: property.bathrooms }),
    ...(property.max_guests && {
      occupancy: { '@type': 'QuantitativeValue', maxValue: property.max_guests },
    }),
    ...(amenityFeature.length > 0 && { amenityFeature }),
  }

  // priceSpecification: nightly base price (Google requires UnitPriceSpecification)
  const priceSpecification = property.base_price && property.base_price > 0
    ? {
        '@type': 'UnitPriceSpecification',
        price: property.base_price,
        priceCurrency: currency,
        unitCode: 'DAY',
        ...(minNights > 1 && {
          eligibleQuantity: {
            '@type': 'QuantitativeValue',
            minValue: minNights,
            unitText: 'noites',
          },
        }),
      }
    : undefined

  // makesOffer: extra fees only (cleaning, pet) — not the base price
  const extraOffers: object[] = []
  if (property.cleaning_fee && property.cleaning_fee > 0) {
    extraOffers.push({
      '@type': 'Offer',
      name: 'Taxa de limpeza',
      price: property.cleaning_fee,
      priceCurrency: currency,
      description: property.cleaning_fee_type === 'per_night' ? 'por noite' : 'por estadia',
    })
  }
  if (property.pet_fee && property.pet_fee > 0) {
    extraOffers.push({
      '@type': 'Offer',
      name: 'Taxa de animais de estimação',
      price: property.pet_fee,
      priceCurrency: currency,
      description: property.pet_fee_type === 'per_night' ? 'por noite' : 'por estadia',
    })
  }

  const pageUrl = property.slug ? `${APP_URL}/p/${property.slug}` : undefined

  return {
    '@context': 'https://schema.org',
    '@type': 'VacationRental',
    ...(pageUrl && { '@id': pageUrl, url: pageUrl }),
    ...(property.slug && { identifier: property.slug }),
    name: property.name,
    ...(property.description && { description: property.description }),
    ...(imageField && { image: imageField }),
    containsPlace,
    checkinTime: toIsoTime(property.checkin_from, '15:00'),
    checkoutTime: toIsoTime(property.checkout_until, '11:00'),
    ...(priceSpecification && { priceSpecification }),
    ...(extraOffers.length > 0 && { makesOffer: extraOffers }),
  }
}

export function generateWebsiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Lodgra',
    url: APP_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${APP_URL}/p/{slug}`,
      },
    },
  }
}
