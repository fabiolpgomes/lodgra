import {
  generatePropertyJsonLd,
  generateLocalBusinessJsonLd,
  generateBreadcrumbJsonLd,
  generateOrganizationJsonLd,
  generateWebsiteJsonLd,
} from '@/lib/seo/jsonld'

describe('Schema.org Generators', () => {
  const mockProperty = {
    id: 'test-1',
    name: 'Beach House Algarve',
    description: 'Luxury beach house with private pool',
    city: 'Lagos',
    country: 'Portugal',
    country_code: 'PT',
    address: 'Rua da Praia 123',
    postal_code: '8600-001',
    slug: 'beach-house-algarve',
    latitude: 37.1644,
    longitude: -8.6734,
    base_price: 250,
    currency: 'EUR',
    photos: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'],
    bedrooms: 3,
    bathrooms: 2,
    max_guests: 6,
    property_type: 'House',
    amenities: 'wifi,pool,kitchen,ac',
    reviewScore: {
      globalAvg: 8.5,
      totalCount: 42,
    },
    featuredReviews: [
      {
        reviewer_name: 'John Doe',
        rating: 5,
        source: 'booking',
        comment: 'Amazing property!',
        review_date: '2026-05-20',
      },
    ],
  }

  describe('generatePropertyJsonLd (VacationRental)', () => {
    it('should generate valid VacationRental schema', () => {
      const schema = generatePropertyJsonLd(mockProperty)

      expect(schema['@context']).toBe('https://schema.org')
      expect(schema['@type']).toBe('VacationRental')
      expect(schema.name).toBe('Beach House Algarve')
      expect(schema.description).toBe('Luxury beach house with private pool')
      expect(schema.identifier).toBe('beach-house-algarve')
    })

    it('should include address with country code', () => {
      const schema = generatePropertyJsonLd(mockProperty)

      expect(schema.address['@type']).toBe('PostalAddress')
      expect(schema.address.streetAddress).toBe('Rua da Praia 123')
      expect(schema.address.addressLocality).toBe('Lagos')
      expect(schema.address.addressCountry).toBe('PT')
    })

    it('should include GeoCoordinates', () => {
      const schema = generatePropertyJsonLd(mockProperty)

      expect(schema.geo['@type']).toBe('GeoCoordinates')
      expect(schema.geo.latitude).toBe(37.1644)
      expect(schema.geo.longitude).toBe(-8.6734)
    })

    it('should include aggregateRating with ratingCount', () => {
      const schema = generatePropertyJsonLd(mockProperty)

      expect(schema.aggregateRating['@type']).toBe('AggregateRating')
      expect(schema.aggregateRating.ratingValue).toBe(8.5)
      expect(schema.aggregateRating.ratingCount).toBe(42)
      expect(schema.aggregateRating.bestRating).toBe(10)
      expect(schema.aggregateRating.worstRating).toBe(1)
    })

    it('should include containsPlace with accommodation details', () => {
      const schema = generatePropertyJsonLd(mockProperty)

      expect(schema.containsPlace['@type']).toBe('Accommodation')
      expect(schema.containsPlace.additionalType).toBe('EntirePlace')
      expect(schema.containsPlace.numberOfBedrooms).toBe(3)
      expect(schema.containsPlace.numberOfBathroomsTotal).toBe(2)
      expect(schema.containsPlace.occupancy.value).toBe(6)
    })

    it('should include makesOffer with price and currency', () => {
      const schema = generatePropertyJsonLd(mockProperty)

      expect(schema.makesOffer['@type']).toBe('Offer')
      expect(schema.makesOffer.price).toBe(250)
      expect(schema.makesOffer.priceCurrency).toBe('EUR')
    })

    it('should include amenityFeature array when structuredAmenities provided', () => {
      const propertyWithAmenities = {
        ...mockProperty,
        structuredAmenities: [
          { name: 'wifi', category: 'connectivity' },
          { name: 'pool', category: 'recreation' },
        ],
      }
      const schema = generatePropertyJsonLd(propertyWithAmenities)

      expect(Array.isArray(schema.amenityFeature)).toBe(true)
      expect(schema.amenityFeature.length).toBe(2)
      expect(schema.amenityFeature[0]['@type']).toBe('LocationFeatureSpecification')
    })

    it('should omit amenityFeature when no structuredAmenities', () => {
      const schema = generatePropertyJsonLd(mockProperty)

      // Should be empty array or undefined
      expect(schema.amenityFeature === undefined || schema.amenityFeature.length === 0).toBe(true)
    })
  })

  describe('generateLocalBusinessJsonLd', () => {
    it('should generate valid LocalBusiness schema', () => {
      const schema = generateLocalBusinessJsonLd(mockProperty)

      expect(schema['@context']).toBe('https://schema.org')
      expect(schema['@type']).toBe('LocalBusiness')
      expect(schema.name).toBe('Beach House Algarve')
    })

    it('should include address and geo', () => {
      const schema = generateLocalBusinessJsonLd(mockProperty)

      expect(schema.address['@type']).toBe('PostalAddress')
      expect(schema.geo['@type']).toBe('GeoCoordinates')
    })

    it('should include aggregateRating when rating exists', () => {
      const schema = generateLocalBusinessJsonLd(mockProperty)

      expect(schema.aggregateRating['@type']).toBe('AggregateRating')
      expect(schema.aggregateRating.ratingValue).toBe(8.5)
    })

    it('should not include aggregateRating when rating is null', () => {
      const propertyNoRating = { ...mockProperty, reviewScore: null }
      const schema = generateLocalBusinessJsonLd(propertyNoRating)

      expect(schema.aggregateRating).toBeUndefined()
    })

    it('should include makesOffer with availability', () => {
      const schema = generateLocalBusinessJsonLd(mockProperty)

      expect(schema.makesOffer['@type']).toBe('Offer')
      expect(schema.makesOffer.availability).toBe('https://schema.org/InStock')
      expect(schema.makesOffer.price).toBe(250)
    })
  })

  describe('generateBreadcrumbJsonLd', () => {
    it('should generate valid BreadcrumbList schema', () => {
      const items = [
        { position: 1, name: 'Home', item: 'https://lodgra.io' },
        { position: 2, name: 'Docs', item: 'https://lodgra.io/docs' },
        { position: 3, name: 'Getting Started', item: 'https://lodgra.io/docs/getting-started' },
      ]

      const schema = generateBreadcrumbJsonLd(items)

      expect(schema['@context']).toBe('https://schema.org')
      expect(schema['@type']).toBe('BreadcrumbList')
      expect(schema.itemListElement.length).toBe(3)
    })

    it('should include correct positions and names', () => {
      const items = [
        { position: 1, name: 'Home', item: 'https://example.com' },
        { position: 2, name: 'Products', item: 'https://example.com/products' },
      ]

      const schema = generateBreadcrumbJsonLd(items)
      const listItems = schema.itemListElement

      expect(listItems[0].position).toBe(1)
      expect(listItems[0].name).toBe('Home')
      expect(listItems[1].position).toBe(2)
      expect(listItems[1].name).toBe('Products')
    })
  })

  describe('generateOrganizationJsonLd', () => {
    it('should generate valid Organization schema with defaults', () => {
      const schema = generateOrganizationJsonLd()

      expect(schema['@context']).toBe('https://schema.org')
      expect(schema['@type']).toBe('Organization')
      expect(schema.name).toBe('Lodgra')
      expect(schema.url).toBeDefined()
      expect(schema.logo).toBeDefined()
    })

    it('should accept custom config', () => {
      const config = {
        name: 'Custom Company',
        url: 'https://custom.com',
        description: 'Custom description',
        contactEmail: 'custom@example.com',
      }

      const schema = generateOrganizationJsonLd(config)

      expect(schema.name).toBe('Custom Company')
      expect(schema.url).toBe('https://custom.com')
      expect(schema.description).toBe('Custom description')
      expect(schema.contactPoint.email).toBe('custom@example.com')
    })

    it('should include social media links', () => {
      const schema = generateOrganizationJsonLd()

      expect(Array.isArray(schema.sameAs)).toBe(true)
      expect(schema.sameAs.length).toBeGreaterThan(0)
      expect(schema.sameAs.some(url => url.includes('facebook'))).toBe(true)
    })

    it('should include ContactPoint with languages', () => {
      const schema = generateOrganizationJsonLd()

      expect(schema.contactPoint['@type']).toBe('ContactPoint')
      expect(schema.contactPoint.contactType).toBe('Customer Support')
      expect(Array.isArray(schema.contactPoint.availableLanguage)).toBe(true)
    })
  })

  describe('generateWebsiteJsonLd', () => {
    it('should generate valid WebSite schema', () => {
      const schema = generateWebsiteJsonLd()

      expect(schema['@context']).toBe('https://schema.org')
      expect(schema['@type']).toBe('WebSite')
      expect(schema.name).toBe('Lodgra')
      expect(schema.url).toBeDefined()
    })

    it('should include SearchAction with proper structure', () => {
      const schema = generateWebsiteJsonLd()

      expect(schema.potentialAction['@type']).toBe('SearchAction')
      expect(schema.potentialAction.target['@type']).toBe('EntryPoint')
      expect(schema.potentialAction.target.urlTemplate).toContain('{slug}')
    })
  })

  describe('Schema Validation', () => {
    it('should have valid @context for all schemas', () => {
      const schemas = [
        generatePropertyJsonLd(mockProperty),
        generateLocalBusinessJsonLd(mockProperty),
        generateBreadcrumbJsonLd([]),
        generateOrganizationJsonLd(),
        generateWebsiteJsonLd(),
      ]

      schemas.forEach(schema => {
        expect(schema['@context']).toBe('https://schema.org')
      })
    })

    it('should have valid @type for all schemas', () => {
      const schemas = {
        property: generatePropertyJsonLd(mockProperty),
        localBusiness: generateLocalBusinessJsonLd(mockProperty),
        organization: generateOrganizationJsonLd(),
        website: generateWebsiteJsonLd(),
      }

      const validTypes = ['VacationRental', 'LocalBusiness', 'Organization', 'WebSite']

      Object.values(schemas).forEach(schema => {
        expect(validTypes).toContain(schema['@type'])
      })
    })
  })
})
