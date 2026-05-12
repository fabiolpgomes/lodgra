/**
 * JSON-LD structured data generators for SEO / Google Vacation Rentals.
 * Spec: https://developers.google.com/search/docs/appearance/structured-data/vacation-rental
 *
 * Required fields (confirmed via Google Rich Results Test):
 *   identifier (PropertyValue), containsPlace (Accommodation),
 *   makesOffer.checkinTime / checkoutTime (HH:MM format), makesOffer.priceSpecification
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

// HH:MM format — Google VR spec uses plain time strings (no T prefix, no seconds, no timezone)
function toHHMM(t: string | null | undefined, fallback: string): string {
  const val = t ?? fallback
  // Strip timezone, T prefix, and seconds — keep only HH:MM
  const stripped = val.replace(/^T/, '').replace(/([+-]\d{2}:\d{2}|Z)$/, '')
  return stripped.split(':').slice(0, 2).join(':')
}

// Map full country names to ISO 3166-1 alpha-2 codes (Google requires 2-letter codes)
function toCountryCode(country: string | null | undefined): string | undefined {
  if (!country) return undefined
  const trimmed = country.trim()
  if (trimmed.length === 2) return trimmed.toUpperCase()
  const map: Record<string, string> = {
    portugal: 'PT',
    spain: 'ES', espanha: 'ES',
    france: 'FR', franca: 'FR',
    'united kingdom': 'GB', 'reino unido': 'GB',
    germany: 'DE', alemanha: 'DE',
    italy: 'IT', itália: 'IT',
    netherlands: 'NL', 'países baixos': 'NL',
    brazil: 'BR', brasil: 'BR',
  }
  return map[trimmed.toLowerCase()] ?? trimmed
}

export function generatePropertyJsonLd(property: PropertyData) {
  const currency = property.currency ?? 'EUR'

  // Resolve images: prefer optimised WebP gallery, fall back to legacy photos[]
  const images = property.imageUrls?.length
    ? property.imageUrls
    : (property.photos?.filter(Boolean) ?? [])
  const imageField = images.length > 1 ? images : images[0] ?? undefined

  const amenityFeature: object[] = property.structuredAmenities?.map(a => ({
    '@type': 'LocationFeatureSpecification',
    name: a.name,
    value: true,
  })) ?? []

  const postalAddress = {
    '@type': 'PostalAddress',
    ...(property.address && { streetAddress: property.address.trim() }),
    ...(property.city && { addressLocality: property.city.trim() }),
    ...(property.postal_code && { postalCode: property.postal_code.trim() }),
    ...(property.country && { addressCountry: toCountryCode(property.country) }),
  }

  // Time strings in HH:MM format — Google VR spec example: "15:00", "11:00"
  const checkinTime = toHHMM(property.checkin_from, '15:00')
  const checkoutTime = toHHMM(property.checkout_until, '11:00')

  // priceSpecification inside the Offer
  const priceSpecification = property.base_price && property.base_price > 0
    ? {
        '@type': 'UnitPriceSpecification',
        price: property.base_price,
        priceCurrency: currency,
        unitCode: 'DAY',
      }
    : undefined

  // containsPlace — required by Google VR spec (Accommodation with room/guest details)
  const containsPlace = {
    '@type': 'Accommodation',
    ...(property.bedrooms && { numberOfBedrooms: property.bedrooms }),
    ...(property.bathrooms && { numberOfBathroomsTotal: property.bathrooms }),
    ...(property.max_guests && {
      occupancy: { '@type': 'QuantitativeValue', maxValue: property.max_guests },
    }),
  }

  // Offer — required inside makesOffer
  const mainOffer = {
    '@type': 'Offer',
    checkinTime,
    checkoutTime,
    ...(priceSpecification && { priceSpecification }),
  }

  const pageUrl = property.slug ? `${APP_URL}/p/${property.slug}` : undefined
  const hasGeo = !!(property.latitude && property.longitude)

  return {
    '@context': 'https://schema.org',
    '@type': 'VacationRental',
    name: property.name,
    // identifier — required by Google VR spec
    ...(property.slug && {
      identifier: {
        '@type': 'PropertyValue',
        name: 'PropertyID',
        value: property.slug,
      },
    }),
    ...(property.description && { description: property.description }),
    ...(pageUrl && { url: pageUrl }),
    ...(imageField && { image: imageField }),
    address: postalAddress,
    ...(hasGeo && {
      geo: {
        '@type': 'GeoCoordinates',
        latitude: property.latitude,
        longitude: property.longitude,
      },
    }),
    // containsPlace — required by Google VR spec
    containsPlace,
    ...(amenityFeature.length > 0 && { amenityFeature }),
    // makesOffer — required by Google VR spec (array)
    makesOffer: [mainOffer],
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
