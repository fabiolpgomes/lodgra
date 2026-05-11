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

// ISO 8601 time with timezone offset — Google docs example: "14:30:00+08:00"
function toIsoTime(t: string | null | undefined, fallback: string, offset = '+00:00'): string {
  const val = t ?? fallback
  const parts = val.split(':')
  const normalised = parts.length >= 3 ? val : `${val}:00`
  return `${normalised}${offset}`
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
  }
  return (propertyType && map[propertyType]) || 'Accommodation'
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
      occupancy: { '@type': 'QuantitativeValue', value: property.max_guests },
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
            unitText: 'noites',
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

  // Extra fee offers (cleaning, pet)
  const allOffers: object[] = [mainOffer]
  if (property.cleaning_fee && property.cleaning_fee > 0) {
    allOffers.push({
      '@type': 'Offer',
      name: 'Taxa de limpeza',
      price: property.cleaning_fee,
      priceCurrency: currency,
      description: property.cleaning_fee_type === 'per_night' ? 'por noite' : 'por estadia',
    })
  }
  if (property.pet_fee && property.pet_fee > 0) {
    allOffers.push({
      '@type': 'Offer',
      name: 'Taxa de animais de estimação',
      price: property.pet_fee,
      priceCurrency: currency,
      description: property.pet_fee_type === 'per_night' ? 'por noite' : 'por estadia',
    })
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
    ...(hasGeo && {
      latitude: property.latitude!.toFixed(6),
      longitude: property.longitude!.toFixed(6),
      geo: {
        '@type': 'GeoCoordinates',
        latitude: property.latitude!.toFixed(6),
        longitude: property.longitude!.toFixed(6),
      },
    }),
    containsPlace,
    // Keep at root level (schema.org LodgingBusiness spec)
    checkinTime,
    checkoutTime,
    ...(priceSpecification && { priceSpecification }),
    // makesOffer: main offer first (with all required fields), then extra fees
    makesOffer: allOffers,
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
