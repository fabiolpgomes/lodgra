/**
 * JSON-LD structured data generators for SEO / Google Vacation Rentals.
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
  structuredAmenities?: AmenityItem[]
}

export function generatePropertyJsonLd(property: PropertyData) {
  const address = {
    '@type': 'PostalAddress' as const,
    ...(property.address && { streetAddress: property.address }),
    ...(property.city && { addressLocality: property.city }),
    ...(property.postal_code && { postalCode: property.postal_code }),
    ...(property.country && { addressCountry: property.country }),
  }

  const currency = property.currency ?? 'EUR'
  const minNights = property.min_nights ?? 1

  // Resolve images: prefer optimised WebP gallery, fall back to legacy photos[]
  const images = property.imageUrls?.length
    ? property.imageUrls
    : (property.photos?.filter(Boolean) ?? [])
  const imageField = images.length > 1 ? images : images[0] ?? undefined

  const offers: object[] = []

  if (property.base_price && property.base_price > 0) {
    offers.push({
      '@type': 'Offer',
      name: 'Preço por noite',
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
    })
  }

  if (property.cleaning_fee && property.cleaning_fee > 0) {
    offers.push({
      '@type': 'Offer',
      name: 'Taxa de limpeza',
      price: property.cleaning_fee,
      priceCurrency: currency,
      description: property.cleaning_fee_type === 'per_night' ? 'por noite' : 'por estadia',
    })
  }

  if (property.pet_fee && property.pet_fee > 0) {
    offers.push({
      '@type': 'Offer',
      name: 'Taxa de animais de estimação',
      price: property.pet_fee,
      priceCurrency: currency,
      description: property.pet_fee_type === 'per_night' ? 'por noite' : 'por estadia',
    })
  }

  // Build amenityFeature: capacity specs + catalog amenities
  const amenityFeature: object[] = [
    ...(property.max_guests ? [{ '@type': 'LocationFeatureSpecification', name: 'Max Guests', value: property.max_guests }] : []),
    ...(property.bedrooms ? [{ '@type': 'LocationFeatureSpecification', name: 'Bedrooms', value: property.bedrooms }] : []),
    ...(property.bathrooms ? [{ '@type': 'LocationFeatureSpecification', name: 'Bathrooms', value: property.bathrooms }] : []),
    ...(property.structuredAmenities?.map(a => ({
      '@type': 'LocationFeatureSpecification',
      name: a.name,
      value: true,
    })) ?? []),
  ]

  const pageUrl = property.slug ? `${APP_URL}/p/${property.slug}` : undefined

  return {
    '@context': 'https://schema.org',
    '@type': 'VacationRental',
    ...(pageUrl && { '@id': pageUrl, url: pageUrl }),
    name: property.name,
    ...(property.description && { description: property.description }),
    ...(imageField && { image: imageField }),
    address,
    checkinTime: `T${property.checkin_from ?? '15:00'}`,
    checkoutTime: `T${property.checkout_until ?? '11:00'}`,
    ...(property.max_guests && {
      occupancy: { '@type': 'QuantitativeValue', maxValue: property.max_guests },
    }),
    ...(property.bedrooms && { numberOfRooms: property.bedrooms }),
    ...(property.bathrooms && { numberOfBathroomsTotal: property.bathrooms }),
    ...(offers.length > 0 && { makesOffer: offers }),
    ...(amenityFeature.length > 0 && { amenityFeature }),
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
