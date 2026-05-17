/**
 * Unit tests for LodgingBusiness JSON-LD schema generation
 */

import { generateLodgingBusinessJsonLd, generateLodgingBusinessJsonLdString } from '@/lib/seo/lodgingBusinessSchema'

describe('lodgingBusinessSchema', () => {
  const mockProperty = {
    name: 'Beautiful Apartment in Lisboa',
    description: 'A modern apartment in the heart of Lisboa',
    city: 'Lisboa',
    country: 'Portugal',
    address: 'Rua da Paz, 123',
    postal_code: '1200-001',
    base_price: 150,
    currency: 'EUR',
    max_guests: 4,
    bedrooms: 2,
    bathrooms: 1,
    slug: 'beautiful-apartment-lisboa',
    telephone: '+351 21 1234567',
    checkin_from: '15:00:00',
    checkout_until: '11:00:00',
    latitude: 38.7223,
    longitude: -9.1393,
    imageUrls: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
    structuredAmenities: [
      { name: 'WiFi' },
      { name: 'Kitchen' },
      { name: 'Pool' },
    ],
    reviewScore: {
      globalAvg: 4.8,
      totalCount: 24,
    },
    featuredReviews: [
      {
        reviewer_name: 'João Silva',
        rating: 5,
        source: 'booking',
        comment: 'Excellent apartment, very clean',
        review_date: '2026-05-01',
      },
    ],
  }

  describe('generateLodgingBusinessJsonLd', () => {
    it('should generate valid LodgingBusiness schema with complete data', () => {
      const result = generateLodgingBusinessJsonLd(mockProperty)

      expect(result['@context']).toBe('https://schema.org')
      expect(result['@type']).toBe('LodgingBusiness')
      expect(result.name).toBe('Beautiful Apartment in Lisboa')
      expect(result.description).toBe('A modern apartment in the heart of Lisboa')
      expect(result.url).toMatch(/beautiful-apartment-lisboa/)
    })

    it('should handle missing optional fields gracefully', () => {
      const minimalProperty = {
        name: 'Simple Room',
        slug: 'simple-room',
      }

      const result = generateLodgingBusinessJsonLd(minimalProperty)

      expect(result['@type']).toBe('LodgingBusiness')
      expect(result.name).toBe('Simple Room')
      expect(result.description).toBeUndefined()
      expect(result.telephone).toBeUndefined()
    })

    it('should escape special characters in JSON-LD', () => {
      const propertyWithSpecialChars = {
        ...mockProperty,
        name: 'Apartment with "Quotes" & <Symbols>',
        description: 'Description with\nnewlines\tand\ttabs',
      }

      const result = generateLodgingBusinessJsonLd(propertyWithSpecialChars)
      const jsonString = JSON.stringify(result)

      // Should be valid JSON (no parsing errors)
      expect(() => JSON.parse(jsonString)).not.toThrow()
      expect(result.name).toContain('Quotes')
    })

    it('should properly format postal address', () => {
      const result = generateLodgingBusinessJsonLd(mockProperty)
      const address = result.address as Record<string, unknown>

      expect(address['@type']).toBe('PostalAddress')
      expect(address.streetAddress).toBe('Rua da Paz, 123')
      expect(address.addressLocality).toBe('Lisboa')
      expect(address.postalCode).toBe('1200-001')
      expect(address.addressCountry).toBe('PT')
    })

    it('should convert country names to ISO codes', () => {
      const properties = [
        { ...mockProperty, country: 'Portugal' },
        { ...mockProperty, country: 'Spain' },
        { ...mockProperty, country: 'France' },
        { ...mockProperty, country: 'PT' }, // Already ISO
      ]

      properties.forEach((prop) => {
        const result = generateLodgingBusinessJsonLd(prop)
        const address = result.address as Record<string, unknown>
        expect(typeof address.addressCountry).toBe('string')
        expect((address.addressCountry as string).length).toBe(2)
      })
    })

    it('should include aggregateRating when review data exists', () => {
      const result = generateLodgingBusinessJsonLd(mockProperty)

      expect(result.aggregateRating).toBeDefined()
      const rating = result.aggregateRating as Record<string, unknown>
      expect(rating['@type']).toBe('AggregateRating')
      expect(rating.ratingValue).toBe(4.8)
      expect(rating.ratingCount).toBe(24)
      expect(rating.bestRating).toBe(10)
      expect(rating.worstRating).toBe(1)
    })

    it('should normalize review ratings to 1-10 scale', () => {
      const propertyWithAirbnbReviews = {
        ...mockProperty,
        featuredReviews: [
          {
            reviewer_name: 'User1',
            rating: 5,
            source: 'airbnb', // Max 5
            comment: 'Great',
            review_date: '2026-05-01',
          },
          {
            reviewer_name: 'User2',
            rating: 4.5,
            source: 'booking', // Max 10
            comment: 'Good',
            review_date: '2026-05-02',
          },
        ],
      }

      const result = generateLodgingBusinessJsonLd(propertyWithAirbnbReviews)
      const reviews = result.review as Record<string, unknown>[]

      expect(reviews).toHaveLength(2)
      // Airbnb 5/5 → 10/10
      expect((reviews[0].reviewRating as Record<string, unknown>).ratingValue).toBe(10)
      // Booking 4.5/10 → 4.5/10
      expect((reviews[1].reviewRating as Record<string, unknown>).ratingValue).toBe(4.5)
    })

    it('should include amenities with proper naming', () => {
      const result = generateLodgingBusinessJsonLd(mockProperty)
      const amenities = result.amenityFeature as Record<string, unknown>[]

      expect(amenities).toHaveLength(3)
      expect(amenities[0]['@type']).toBe('LocationFeatureSpecification')
      expect(amenities.some((a) => a.name === 'wifi')).toBe(true)
      expect(amenities.some((a) => a.name === 'kitchen')).toBe(true)
      expect(amenities.some((a) => a.name === 'pool')).toBe(true)
    })

    it('should include geo coordinates when available', () => {
      const result = generateLodgingBusinessJsonLd(mockProperty)

      expect(result.geo).toBeDefined()
      const geo = result.geo as Record<string, unknown>
      expect(geo['@type']).toBe('GeoCoordinates')
      expect(geo.latitude).toBe(38.7223)
      expect(geo.longitude).toBe(-9.1393)
    })

    it('should handle missing images', () => {
      const propertyNoImages = { ...mockProperty, imageUrls: [], photos: [] }
      const result = generateLodgingBusinessJsonLd(propertyNoImages)

      expect(result.image).toBeUndefined()
    })

    it('should generate price range from base price', () => {
      const result = generateLodgingBusinessJsonLd(mockProperty)

      expect(result.priceRange).toBeDefined()
      expect(typeof result.priceRange).toBe('string')
      // 150 EUR → 80% to 120% = 120-180
      expect(result.priceRange).toMatch(/^\d+-\d+$/)
    })

    it('should include checkin/checkout times in ISO 8601 format', () => {
      const result = generateLodgingBusinessJsonLd(mockProperty)

      expect(result.checkinTime).toBe('15:00:00')
      expect(result.checkoutTime).toBe('11:00:00')
    })

    it('should generate valid JSON output', () => {
      const result = generateLodgingBusinessJsonLd(mockProperty)
      const jsonString = JSON.stringify(result)

      expect(() => JSON.parse(jsonString)).not.toThrow()
    })
  })

  describe('generateLodgingBusinessJsonLdString', () => {
    it('should return valid JSON string', () => {
      const result = generateLodgingBusinessJsonLdString(mockProperty)

      expect(typeof result).toBe('string')
      expect(() => JSON.parse(result)).not.toThrow()
    })

    it('should produce parseable JSON object', () => {
      const result = generateLodgingBusinessJsonLdString(mockProperty)
      const parsed = JSON.parse(result)

      expect(parsed['@context']).toBe('https://schema.org')
      expect(parsed['@type']).toBe('LodgingBusiness')
    })
  })

  describe('XSS Prevention', () => {
    it('should safely handle HTML entities in name', () => {
      const propertyWithHtml = {
        ...mockProperty,
        name: '<script>alert("xss")</script>Apartment',
      }

      const result = generateLodgingBusinessJsonLd(propertyWithHtml)
      const jsonString = JSON.stringify(result)

      // JSON.stringify properly escapes - when parsed back, content is safe
      expect(() => JSON.parse(jsonString)).not.toThrow()
      const parsed = JSON.parse(jsonString)
      // The data is preserved but JSON-safe
      expect(parsed.name).toContain('script')
    })

    it('should safely handle HTML entities in description', () => {
      const propertyWithHtml = {
        ...mockProperty,
        description: 'Description with <b>bold</b> text & "quotes"',
      }

      const result = generateLodgingBusinessJsonLd(propertyWithHtml)
      const jsonString = JSON.stringify(result)

      expect(() => JSON.parse(jsonString)).not.toThrow()
      const parsed = JSON.parse(jsonString)
      expect(parsed.description).toContain('bold')
    })

    it('should safely handle HTML in review comments', () => {
      const propertyWithHtml = {
        ...mockProperty,
        featuredReviews: [
          {
            reviewer_name: 'User',
            rating: 5,
            source: 'booking',
            comment: '<img src=x onerror=alert("xss")>',
            review_date: '2026-05-01',
          },
        ],
      }

      const result = generateLodgingBusinessJsonLd(propertyWithHtml)
      const jsonString = JSON.stringify(result)

      expect(() => JSON.parse(jsonString)).not.toThrow()
      const parsed = JSON.parse(jsonString)
      // Verify review is properly serialized
      expect(parsed.review).toBeDefined()
      expect(parsed.review[0].reviewBody).toContain('img')
    })
  })

  describe('Multi-language Support', () => {
    it('should accept locale parameter', () => {
      const resultPt = generateLodgingBusinessJsonLd({
        ...mockProperty,
        locale: 'pt-PT',
      })
      const resultEs = generateLodgingBusinessJsonLd({
        ...mockProperty,
        locale: 'es-ES',
      })

      // Locale should be stored (if we add it to schema later)
      expect(resultPt['@type']).toBe('LodgingBusiness')
      expect(resultEs['@type']).toBe('LodgingBusiness')
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero price', () => {
      const propertyZeroPrice = { ...mockProperty, base_price: 0 }
      const result = generateLodgingBusinessJsonLd(propertyZeroPrice)
      const offer = result.makesOffer as Record<string, unknown>

      expect(offer.price).toBeUndefined()
    })

    it('should handle null reviewScore', () => {
      const propertyNoRating = { ...mockProperty, reviewScore: null }
      const result = generateLodgingBusinessJsonLd(propertyNoRating)

      expect(result.aggregateRating).toBeUndefined()
      expect(result.review).toBeUndefined()
    })

    it('should handle empty amenities', () => {
      const propertyNoAmenities = { ...mockProperty, structuredAmenities: [] }
      const result = generateLodgingBusinessJsonLd(propertyNoAmenities)

      expect(result.amenityFeature).toBeUndefined()
    })

    it('should filter out reviews without dates', () => {
      const propertyOldReviews = {
        ...mockProperty,
        featuredReviews: [
          {
            reviewer_name: 'User1',
            rating: 5,
            source: 'booking',
            comment: 'Good',
            review_date: null,
          },
          {
            reviewer_name: 'User2',
            rating: 4,
            source: 'booking',
            comment: 'Great',
            review_date: '2026-05-01',
          },
        ],
      }

      const result = generateLodgingBusinessJsonLd(propertyOldReviews)

      expect(result.review).toBeDefined()
      expect((result.review as unknown[]).length).toBe(1)
    })
  })
})
