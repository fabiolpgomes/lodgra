/**
 * JSON-LD structured data generators for SEO / Google Vacation Rentals.
 * Spec: https://developers.google.com/search/docs/appearance/structured-data/vacation-rental
 *
 * Validated structure (Google Rich Results Test):
 *   - identifier: plain string (PropertyValue rejected by validator)
 *   - checkinTime / checkoutTime: "HH:MM:SS" ISO 8601 Time on VacationRental (not inside Offer)
 *   - containsPlace: Accommodation + additionalType "EntirePlace" (per Google VR spec example)
 *   - occupancy: QuantitativeValue with "value" (not "maxValue")
 *   - makesOffer: Offer with price+priceCurrency directly (priceSpecification types rejected)
 *   - amenityFeature: Google-recognized English keywords via AMENITY_MAP
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://lodgra.io'

interface AmenityItem {
  name: string
  icon?: string
  category?: string
}

interface ReviewScore {
  globalAvg: number
  totalCount: number
}

interface FeaturedReview {
  reviewer_name?: string | null
  rating: number
  source: string
  comment?: string | null
  review_date?: string | null
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
  reviewScore?: ReviewScore | null
  featuredReviews?: FeaturedReview[] | null
}

// Google VR spec Time: ISO 8601 "HH:MM:SS" (local time, no timezone — spec example: "18:00:00+08:00")
function toTimeISO(t: string | null | undefined, fallback: string): string {
  const val = t ?? fallback
  const stripped = val.replace(/^T/, '').replace(/([+-]\d{2}:\d{2}|Z)$/, '')
  const parts = stripped.split(':')
  return `${parts[0] ?? '00'}:${parts[1] ?? '00'}:${parts[2] ?? '00'}`
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

// Map amenity names (PT/EN) → Google VR recognized keyword values
const AMENITY_MAP: Record<string, string> = {
  // Wi-Fi
  'wi-fi': 'wifi', 'wifi': 'wifi', 'internet': 'wifi', 'wi fi': 'wifi',
  // Pool
  'piscina': 'pool', 'pool': 'pool', 'swimming pool': 'pool',
  'piscina interior': 'pool', 'piscina exterior': 'pool',
  // AC
  'ar condicionado': 'ac', 'ar-condicionado': 'ac', 'ac': 'ac',
  'air conditioning': 'ac', 'airconditioned': 'ac',
  // Elevator
  'elevador': 'elevator', 'elevator': 'elevator', 'lift': 'elevator',
  // Washer / Dryer
  'máquina de lavar': 'washerDryer', 'maquina de lavar': 'washerDryer',
  'washing machine': 'washerDryer', 'washer': 'washerDryer',
  'lavadora': 'washerDryer', 'secadora': 'washerDryer', 'dryer': 'washerDryer',
  // Parking
  'estacionamento': 'parking', 'parking': 'parking',
  'garagem': 'parking', 'garage': 'parking',
  // Kitchen
  'cozinha': 'kitchen', 'kitchen': 'kitchen', 'kitchenette': 'kitchenette',
  // TV
  'televisão': 'tv', 'televisao': 'tv', 'tv': 'tv',
  'television': 'tv', 'tv cabo': 'tv', 'cable tv': 'tv',
  // Gym
  'ginásio': 'gym', 'ginasio': 'gym', 'gym': 'gym',
  'fitness': 'gym', 'centro de fitness': 'gym',
  // Balcony / Terrace
  'varanda': 'balcony', 'balcony': 'balcony',
  'terraço': 'terrace', 'terraco': 'terrace', 'terrace': 'terrace',
  // BBQ
  'churrasqueira': 'bbq', 'bbq': 'bbq',
  'barbecue': 'bbq', 'grelhador': 'bbq',
  // Child friendly
  'adequado para crianças': 'childFriendly', 'criancas': 'childFriendly',
  'child friendly': 'childFriendly',
  // Beach
  'praia': 'beachFront', 'beach': 'beachFront',
  'oceanfront': 'oceanFront', 'frente de praia': 'beachFront',
  // Pet friendly
  'animais domésticos': 'petFriendly', 'animais': 'petFriendly',
  'pets': 'petFriendly', 'pet friendly': 'petFriendly',
  'aceita animais': 'petFriendly', 'pets allowed': 'petFriendly',
  // Sauna
  'sauna': 'sauna',
  // Hot tub
  'jacuzzi': 'hotTub', 'banheira de hidromassagem': 'hotTub',
  'hot tub': 'hotTub', 'spa': 'hotTub',
  // Fireplace
  'lareira': 'fireplace', 'fireplace': 'fireplace',
  // Accessible
  'acessível': 'accessible', 'acessivel': 'accessible',
  'acessibilidade': 'accessible', 'wheelchair': 'accessible',
  'cadeira de rodas': 'accessible',
  // Breakfast
  'pequeno-almoço': 'breakfast', 'pequeno almoço': 'breakfast',
  'breakfast': 'breakfast', 'café da manhã': 'breakfast',
  // Smoking
  'fumar permitido': 'smokingAllowed', 'smoking allowed': 'smokingAllowed',
  // Ski
  'ski': 'skiInSkiOut', 'ski in ski out': 'skiInSkiOut',
  // Waterfront
  'beira-mar': 'waterfront', 'waterfront': 'waterfront',
  'frente de água': 'waterfront',
}

function toGoogleAmenityName(name: string): string {
  return AMENITY_MAP[name.toLowerCase().trim()] ?? name
}

// Source-native rating max values (mirrors page.tsx logic)
const SOURCE_MAX: Record<string, number> = {
  booking: 10, airbnb: 5, google: 5, tripadvisor: 5, direct: 10, other: 10,
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
    name: toGoogleAmenityName(a.name),
    value: true,
  })) ?? []

  const postalAddress = {
    '@type': 'PostalAddress',
    ...(property.address && { streetAddress: property.address.trim() }),
    ...(property.city && { addressLocality: property.city.trim() }),
    ...(property.postal_code && { postalCode: property.postal_code.trim() }),
    ...(property.country && { addressCountry: toCountryCode(property.country) }),
  }

  // Time "HH:MM:SS" on VacationRental (LodgingBusiness property — not inside Offer)
  const checkinTime = toTimeISO(property.checkin_from, '15:00:00')
  const checkoutTime = toTimeISO(property.checkout_until, '11:00:00')

  // containsPlace — Accommodation + additionalType per Google VR spec example
  const containsPlace: Record<string, unknown> = {
    '@type': 'Accommodation',
    additionalType: 'EntirePlace',
    ...(property.bedrooms && { numberOfBedrooms: property.bedrooms }),
    ...(property.bathrooms && { numberOfBathroomsTotal: property.bathrooms }),
    ...(property.max_guests && {
      occupancy: { '@type': 'QuantitativeValue', value: property.max_guests },
    }),
  }

  // Offer — price/priceCurrency directly (priceSpecification subtypes rejected by validator)
  const mainOffer: Record<string, unknown> = { '@type': 'Offer' }
  if (property.base_price && property.base_price > 0) {
    mainOffer.price = property.base_price
    mainOffer.priceCurrency = currency
  }

  const pageUrl = property.slug ? `${APP_URL}/p/${property.slug}` : undefined
  const hasGeo = !!(property.latitude && property.longitude)

  // aggregateRating — recommended by Google VR spec (scale 1–10)
  const aggregateRating =
    property.reviewScore && property.reviewScore.totalCount > 0
      ? {
          '@type': 'AggregateRating',
          ratingValue: property.reviewScore.globalAvg,
          ratingCount: property.reviewScore.totalCount,
          bestRating: 10,
          worstRating: 1,
        }
      : undefined

  // review — recommended by Google VR spec; up to 3 featured, normalized to /10
  const reviewItems = property.featuredReviews
    ?.slice(0, 3)
    .filter(r => r.review_date)
    .map(r => {
      const nativeMax = SOURCE_MAX[r.source] ?? 10
      const ratingOn10 = Math.round((Number(r.rating) / nativeMax) * 100) / 10
      return {
        '@type': 'Review',
        ...(r.reviewer_name && { author: { '@type': 'Person', name: r.reviewer_name } }),
        datePublished: r.review_date,
        reviewRating: {
          '@type': 'Rating',
          ratingValue: ratingOn10,
          bestRating: 10,
          worstRating: 1,
        },
        ...(r.comment && { reviewBody: r.comment }),
      }
    })

  return {
    '@context': 'https://schema.org',
    '@type': 'VacationRental',
    name: property.name,
    // identifier as plain string (PropertyValue object rejected by Google VR validator)
    ...(property.slug && { identifier: property.slug }),
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
    // checkinTime/checkoutTime: ISO 8601 "HH:MM:SS" on VacationRental (LodgingBusiness)
    checkinTime,
    checkoutTime,
    // containsPlace — required by Google VR spec
    containsPlace,
    ...(amenityFeature.length > 0 && { amenityFeature }),
    // makesOffer — required by Google VR spec
    makesOffer: mainOffer,
    // aggregateRating + review — recommended by Google VR spec
    ...(aggregateRating && { aggregateRating }),
    ...(reviewItems && reviewItems.length > 0 && { review: reviewItems }),
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

/**
 * Generate LocalBusiness schema for property pages
 * Complement to VacationRental with business-focused info (reviews, contact)
 */
export function generateLocalBusinessJsonLd(property: PropertyData) {
  const currency = property.currency ?? 'EUR'
  const pageUrl = property.slug ? `${APP_URL}/p/${property.slug}` : APP_URL

  const postalAddress = {
    '@type': 'PostalAddress',
    ...(property.address && { streetAddress: property.address.trim() }),
    ...(property.city && { addressLocality: property.city.trim() }),
    ...(property.postal_code && { postalCode: property.postal_code.trim() }),
    ...(property.country && { addressCountry: toCountryCode(property.country) }),
  }

  const images = property.imageUrls?.length
    ? property.imageUrls
    : (property.photos?.filter(Boolean) ?? [])
  const imageField = images.length > 1 ? images : images[0] ?? undefined

  const aggregateRating =
    property.reviewScore && property.reviewScore.totalCount > 0
      ? {
          '@type': 'AggregateRating',
          ratingValue: property.reviewScore.globalAvg,
          ratingCount: property.reviewScore.totalCount,
          bestRating: 10,
          worstRating: 1,
        }
      : undefined

  const offer = {
    '@type': 'Offer',
    ...(property.base_price && property.base_price > 0 && {
      price: property.base_price,
      priceCurrency: currency,
    }),
    availability: 'https://schema.org/InStock',
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': pageUrl,
    name: property.name,
    ...(property.description && { description: property.description }),
    address: postalAddress,
    url: pageUrl,
    ...(imageField && {
      image: {
        '@type': 'ImageObject',
        url: typeof imageField === 'string' ? imageField : imageField[0],
        ...(typeof imageField === 'string' && { width: 800, height: 600 }),
      },
    }),
    ...(property.latitude &&
      property.longitude && {
        geo: {
          '@type': 'GeoCoordinates',
          latitude: property.latitude,
          longitude: property.longitude,
        },
      }),
    ...(aggregateRating && { aggregateRating }),
    offers: offer,
  }
}

/**
 * Generate BreadcrumbList schema for navigation pages
 */
interface BreadcrumbItem {
  position: number
  name: string
  item: string
}

export function generateBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map(item => ({
      '@type': 'ListItem',
      position: item.position,
      name: item.name,
      item: item.item,
    })),
  }
}

/**
 * Generate Organization schema for company/brand info
 */
interface OrganizationConfig {
  name?: string
  url?: string
  logo?: string
  description?: string
  sameAs?: string[]
  contactEmail?: string
  contactLanguages?: string[]
}

export function generateOrganizationJsonLd(config: OrganizationConfig = {}) {
  const {
    name = 'Lodgra',
    url = APP_URL,
    logo = `${APP_URL}/logo.png`,
    description = 'Software de gestão de alojamentos para Airbnb, Booking.com e outros OTAs',
    sameAs = [
      'https://facebook.com/lodgra',
      'https://twitter.com/lodgra',
      'https://linkedin.com/company/lodgra',
    ],
    contactEmail = 'suporte@lodgra.io',
    contactLanguages = ['pt', 'es', 'en'],
  } = config

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    url,
    logo,
    description,
    sameAs,
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Support',
      email: contactEmail,
      availableLanguage: contactLanguages,
    },
  }
}
