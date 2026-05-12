/**
 * JSON-LD structured data generators for SEO / Google Vacation Rentals.
 * Follows Google's VacationRental spec exactly — no containsPlace, no BedDetails,
 * no eligibleQuantity. All properties at VacationRental root. makesOffer is an array.
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

// ISO 8601 time — Google VR spec format: "T15:00+00:00" (T prefix, HH:MM, no seconds)
// Guard against double-appending offset if value already contains one
function toIsoTime(t: string | null | undefined, fallback: string, offset = '+00:00'): string {
  const val = t ?? fallback
  const stripped = val.replace(/([+-]\d{2}:\d{2}|Z)$/, '')
  const hhmm = stripped.split(':').slice(0, 2).join(':')
  return `T${hhmm}${offset}`
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

  // Amenities at VacationRental root (not inside containsPlace — Google validator
  // treats nested @type objects as independent items and fails validation)
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

  // Minimal priceSpecification — no eligibleQuantity (not in Google VR spec)
  const priceSpecification = property.base_price && property.base_price > 0
    ? {
        '@type': 'UnitPriceSpecification',
        price: property.base_price,
        priceCurrency: currency,
        unitCode: 'DAY',
      }
    : undefined

  const checkinTime = toIsoTime(property.checkin_from, '15:00')
  const checkoutTime = toIsoTime(property.checkout_until, '11:00')

  // Offer — no identifier (not in Google VR spec example)
  const mainOffer = {
    '@type': 'Offer',
    checkinTime,
    checkoutTime,
    ...(priceSpecification && { priceSpecification }),
  }

  const pageUrl = property.slug ? `${APP_URL}/p/${property.slug}` : undefined
  const hasGeo = !!(property.latitude && property.longitude)

  return {
    '@context': 'https://schema.org/',
    '@type': 'VacationRental',
    name: property.name,
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
    checkinTime,
    checkoutTime,
    // Recommended fields at VacationRental root
    ...(property.bedrooms && { numberOfRooms: property.bedrooms }),
    ...(property.bathrooms && { numberOfBathroomsTotal: property.bathrooms }),
    ...(property.max_guests && {
      occupancy: { '@type': 'QuantitativeValue', maxValue: property.max_guests },
    }),
    ...(amenityFeature.length > 0 && { amenityFeature }),
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
