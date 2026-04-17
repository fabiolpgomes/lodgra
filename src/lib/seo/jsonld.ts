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
  max_guests?: number | null
  bedrooms?: number | null
  bathrooms?: number | null
  slug?: string | null
  property_type?: string | null
}

export function generatePropertyJsonLd(property: PropertyData) {
  const address = {
    '@type': 'PostalAddress' as const,
    ...(property.address && { streetAddress: property.address }),
    ...(property.city && { addressLocality: property.city }),
    ...(property.country && { addressCountry: property.country }),
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'LodgingBusiness',
    name: property.name,
    ...(property.description && { description: property.description }),
    ...(property.photos?.[0] && { image: property.photos[0] }),
    ...(property.slug && { url: `${APP_URL}/p/${property.slug}` }),
    address,
    ...(property.base_price && { priceRange: property.base_price < 50 ? '€' : property.base_price < 150 ? '€€' : '€€€' }),
    checkinTime: '15:00',
    checkoutTime: '11:00',
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
