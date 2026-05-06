/**
 * JSON-LD structured data generators for SEO.
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.lodgra.pt'

interface PropertyData {
  name: string
  description?: string | null
  city?: string | null
  country?: string | null
  address?: string | null
  photos?: string[] | null
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
}

export function generatePropertyJsonLd(property: PropertyData) {
  const address = {
    '@type': 'PostalAddress' as const,
    ...(property.address && { streetAddress: property.address }),
    ...(property.city && { addressLocality: property.city }),
    ...(property.country && { addressCountry: property.country }),
  }

  const currency = property.currency ?? 'EUR'
  const minNights = property.min_nights ?? 1

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

  return {
    '@context': 'https://schema.org',
    '@type': 'VacationRental',
    name: property.name,
    ...(property.description && { description: property.description }),
    ...(property.photos?.[0] && { image: property.photos[0] }),
    ...(property.slug && { url: `${APP_URL}/p/${property.slug}` }),
    address,
    checkinTime: property.checkin_from ?? '15:00',
    checkoutTime: property.checkout_until ?? '11:00',
    ...(offers.length > 0 && { makesOffer: offers }),
    ...(property.max_guests && {
      amenityFeature: [
        { '@type': 'LocationFeatureSpecification', name: 'Max Guests', value: property.max_guests },
        ...(property.bedrooms ? [{ '@type': 'LocationFeatureSpecification', name: 'Bedrooms', value: property.bedrooms }] : []),
        ...(property.bathrooms ? [{ '@type': 'LocationFeatureSpecification', name: 'Bathrooms', value: property.bathrooms }] : []),
      ],
    }),
    ...(property.max_guests && { numberOfRooms: property.bedrooms || 1 }),
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
