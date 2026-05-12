/**
 * JSON-LD structured data generators for SEO / Google Vacation Rentals.
 * Structure follows Google's "Aluguel por temporada" spec:
 * VacationRental → containsPlace → Accommodation (address, amenities)
 * geo coordinates (lat/lng) live directly on VacationRental per Google requirement.
 * checkinTime, checkoutTime, priceSpecification live BOTH at VacationRental root
 * AND inside the main makesOffer Offer — Google validates inside the Offer.
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://lodgra.io'

interface AmenityItem {
  name: string
  icon?: string
  category?: string
}

interface BedItem {
  bed_type: string
  bed_count: number
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
  beds?: BedItem[]
}

// ISO 8601 time — Google VR spec format: "T15:00+00:00" (T prefix, HH:MM, no seconds)
// Guard against double-appending offset if value already contains one
function toIsoTime(t: string | null | undefined, fallback: string, offset = '+00:00'): string {
  const val = t ?? fallback
  const stripped = val.replace(/([+-]\d{2}:\d{2}|Z)$/, '')
  const hhmm = stripped.split(':').slice(0, 2).join(':')
  return `T${hhmm}${offset}`
}

// Map property_type to schema.org @type for containsPlace
// Use specific subtypes instead of generic Accommodation + additionalType to avoid
// "itemtype invalid" errors in Google's Rich Results Test
function toAccommodationType(propertyType: string | null | undefined): string {
  const map: Record<string, string> = {
    apartment: 'Apartment',
    studio: 'Apartment',
    house: 'House',
    villa: 'House',
    condo: 'Apartment',
    townhouse: 'House',
    cabin: 'House',
    chalet: 'House',
  }
  return (propertyType && map[propertyType]) || 'Apartment'
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

  // Bed details for the Accommodation unit
  const bedDetails: object[] = (property.beds ?? [])
    .filter(b => b.bed_count > 0)
    .map(b => ({
      '@type': 'BedDetails',
      numberOfBeds: b.bed_count,
      typeOfBed: b.bed_type,
    }))

  const postalAddress = {
    '@type': 'PostalAddress',
    ...(property.address && { streetAddress: property.address.trim() }),
    ...(property.city && { addressLocality: property.city.trim() }),
    ...(property.postal_code && { postalCode: property.postal_code.trim() }),
    ...(property.country && { addressCountry: toCountryCode(property.country) }),
  }

  // containsPlace: use specific @type (Apartment, House…) — no additionalType
  const containsPlace = {
    '@type': toAccommodationType(property.property_type),
    address: postalAddress,
    ...(property.bedrooms && { numberOfBedrooms: property.bedrooms }),
    ...(property.bathrooms && { numberOfBathroomsTotal: property.bathrooms }),
    ...(property.max_guests && {
      occupancy: { '@type': 'QuantitativeValue', maxValue: property.max_guests },
    }),
    ...(bedDetails.length > 0 && { bed: bedDetails }),
    ...(amenityFeature.length > 0 && { amenityFeature }),
  }

  // Nightly base price spec (reused at root and inside main Offer)
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
          },
        }),
      }
    : undefined

  const checkinTime = toIsoTime(property.checkin_from, '15:00')
  const checkoutTime = toIsoTime(property.checkout_until, '11:00')

  // Main rental Offer: Google validates checkinTime, checkoutTime, priceSpecification,
  // and identifier inside the Offer within makesOffer — not just at root level
  const mainOffer: Record<string, unknown> = {
    '@type': 'Offer',
    identifier: `offer-${property.slug ?? 'main'}`,
    checkinTime,
    checkoutTime,
    ...(priceSpecification && { priceSpecification }),
  }

  const pageUrl = property.slug ? `${APP_URL}/p/${property.slug}` : undefined
  const hasGeo = !!(property.latitude && property.longitude)

  return {
    '@context': 'https://schema.org',
    '@type': 'VacationRental',
    ...(pageUrl && { '@id': pageUrl, url: pageUrl }),
    ...(property.slug && { identifier: property.slug }),
    name: property.name,
    ...(property.description && { description: property.description }),
    ...(imageField && { image: imageField }),
    // address at root level — required by Google Vacation Rentals spec
    address: postalAddress,
    ...(hasGeo && {
      geo: {
        '@type': 'GeoCoordinates',
        latitude: property.latitude,
        longitude: property.longitude,
      },
    }),
    containsPlace,
    checkinTime,
    checkoutTime,
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
