/**
 * Schema.org LodgingBusiness JSON-LD Generator
 * Generates structured data for properties to appear in Google Vacation Rentals
 *
 * Spec: https://schema.org/LodgingBusiness
 * Google VR: https://support.google.com/business/answer/10417212
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
  telephone?: string | null
  locale?: string
}

// Amenity mapping to Schema.org standard terms
const AMENITY_MAP: Record<string, string> = {
  'wi-fi': 'wifi', 'wifi': 'wifi', 'internet': 'wifi',
  'piscina': 'pool', 'pool': 'pool', 'swimming pool': 'pool',
  'ar condicionado': 'ac', 'air conditioning': 'ac', 'ac': 'ac',
  'elevador': 'elevator', 'elevator': 'elevator',
  'máquina de lavar': 'washer', 'washing machine': 'washer',
  'estacionamento': 'parking', 'parking': 'parking', 'garagem': 'parking',
  'cozinha': 'kitchen', 'kitchen': 'kitchen',
  'televisão': 'tv', 'tv': 'tv', 'television': 'tv',
  'ginásio': 'gym', 'gym': 'gym', 'fitness': 'gym',
  'varanda': 'balcony', 'balcony': 'balcony',
  'terraço': 'terrace', 'terrace': 'terrace',
  'churrasqueira': 'bbq', 'bbq': 'bbq', 'barbecue': 'bbq',
  'praia': 'beachfront', 'beach': 'beachfront',
  'animais domésticos': 'petfriendly', 'pet friendly': 'petfriendly',
  'sauna': 'sauna',
  'jacuzzi': 'hottub', 'hot tub': 'hottub', 'spa': 'hottub',
  'lareira': 'fireplace', 'fireplace': 'fireplace',
  'acessível': 'accessible', 'wheelchair': 'accessible',
}

function escapeJsonString(str: string | null | undefined): string {
  if (!str) return ''
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
}

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

function toTimeISO(t: string | null | undefined, fallback: string): string {
  const val = t ?? fallback
  const stripped = val.replace(/^T/, '').replace(/([+-]\d{2}:\d{2}|Z)$/, '')
  const parts = stripped.split(':')
  return `${parts[0] ?? '00'}:${parts[1] ?? '00'}:${parts[2] ?? '00'}`
}

function toGoogleAmenityName(name: string): string {
  return AMENITY_MAP[name.toLowerCase().trim()] ?? name
}

function generatePriceRange(basePrice: number | null | undefined): string | undefined {
  if (!basePrice || basePrice <= 0) return undefined
  const min = Math.max(basePrice * 0.8, 10)
  const max = basePrice * 1.2
  return `${Math.round(min)}-${Math.round(max)}`
}


export function generateLodgingBusinessJsonLd(
  property: PropertyData
): Record<string, unknown> {
  const currency = property.currency ?? 'EUR'

  // Resolve images
  const images = property.imageUrls?.length
    ? property.imageUrls
    : (property.photos?.filter(Boolean) ?? [])
  const imageField = images.length > 1 ? images : images[0] ?? undefined

  // Postal address
  const postalAddress: Record<string, unknown> = {
    '@type': 'PostalAddress',
  }
  if (property.address?.trim()) postalAddress.streetAddress = escapeJsonString(property.address.trim())
  if (property.city?.trim()) postalAddress.addressLocality = escapeJsonString(property.city.trim())
  if (property.postal_code?.trim()) postalAddress.postalCode = escapeJsonString(property.postal_code.trim())
  if (property.country) {
    const countryCode = toCountryCode(property.country)
    if (countryCode) postalAddress.addressCountry = countryCode
  }

  // Amenities
  const amenityFeature: Record<string, unknown>[] = property.structuredAmenities
    ?.map((a) => ({
      '@type': 'LocationFeatureSpecification',
      name: toGoogleAmenityName(a.name),
      value: true,
    })) ?? []

  // Checkin/Checkout times
  const checkinTime = toTimeISO(property.checkin_from, '15:00:00')
  const checkoutTime = toTimeISO(property.checkout_until, '11:00:00')

  // Price range
  const priceRange = generatePriceRange(property.base_price)

  // Offer
  const offers: Record<string, unknown> = { '@type': 'Offer' }
  if (property.base_price && property.base_price > 0) {
    offers.price = property.base_price
    offers.priceCurrency = currency
  }

  // Aggregate rating
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

  // Reviews (normalized to 1-10 scale) — only if reviewScore exists
  const reviews =
    property.reviewScore && property.reviewScore.totalCount > 0
      ? property.featuredReviews
          ?.slice(0, 5)
          .filter((r) => r.review_date)
          .map((r) => {
            const sourceMax: Record<string, number> = {
              booking: 10,
              airbnb: 5,
              google: 5,
              tripadvisor: 5,
              direct: 10,
              other: 10,
            }
            const nativeMax = sourceMax[r.source] ?? 10
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
              ...(r.comment && { reviewBody: escapeJsonString(r.comment) }),
            }
          })
      : undefined

  // Build main schema
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LodgingBusiness',
    name: escapeJsonString(property.name),
    ...(property.description && {
      description: escapeJsonString(property.description),
    }),
    url: property.slug ? `${APP_URL}/p/${property.slug}` : undefined,
    ...(property.telephone && { telephone: property.telephone }),
    address: postalAddress,
    ...(imageField && { image: imageField }),
    ...(property.latitude && property.longitude && {
      geo: {
        '@type': 'GeoCoordinates',
        latitude: property.latitude,
        longitude: property.longitude,
      },
    }),
    checkinTime,
    checkoutTime,
    ...(priceRange && { priceRange }),
    ...(property.max_guests && {
      numberOfRooms: property.bedrooms ?? 1,
      occupancy: {
        '@type': 'QuantitativeValue',
        value: property.max_guests,
      },
    }),
    ...(amenityFeature.length > 0 && { amenityFeature }),
    makesOffer: offers,
    ...(aggregateRating && { aggregateRating }),
    ...(reviews && reviews.length > 0 && { review: reviews }),
  }

  // Remove undefined values
  return JSON.parse(JSON.stringify(schema))
}

export function generateLodgingBusinessJsonLdString(
  property: PropertyData
): string {
  const schema = generateLodgingBusinessJsonLd(property)
  return JSON.stringify(schema)
}
