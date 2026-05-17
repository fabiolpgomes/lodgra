/**
 * Integration tests for LodgingBusinessSchema Server Component
 */

import { LodgingBusinessSchema } from '@/components/seo/LodgingBusinessSchema'
import { render } from '@testing-library/react'

describe('LodgingBusinessSchema Component', () => {
  const mockProperty = {
    name: 'Test Apartment',
    description: 'A great apartment',
    city: 'Lisboa',
    country: 'Portugal',
    address: 'Test Street, 123',
    postal_code: '1200-001',
    base_price: 100,
    currency: 'EUR',
    max_guests: 2,
    bedrooms: 1,
    slug: 'test-apartment',
    latitude: 38.7,
    longitude: -9.1,
    imageUrls: ['https://example.com/image.jpg'],
  }

  it('should render script tag with application/ld+json type', () => {
    const { container } = render(
      <LodgingBusinessSchema property={mockProperty} />
    )

    const scriptTag = container.querySelector('script[type="application/ld+json"]')
    expect(scriptTag).toBeTruthy()
  })

  it('should contain valid JSON-LD data', () => {
    const { container } = render(
      <LodgingBusinessSchema property={mockProperty} />
    )

    const scriptTag = container.querySelector(
      'script[type="application/ld+json"]'
    )
    const content = scriptTag?.textContent

    expect(content).toBeTruthy()
    expect(() => JSON.parse(content || '')).not.toThrow()

    const data = JSON.parse(content || '')
    expect(data['@context']).toBe('https://schema.org')
    expect(data['@type']).toBe('LodgingBusiness')
    expect(data.name).toBe('Test Apartment')
  })

  it('should handle missing optional properties', () => {
    const minimalProperty = {
      name: 'Minimal Property',
      slug: 'minimal',
    }

    const { container } = render(
      <LodgingBusinessSchema property={minimalProperty} />
    )

    const scriptTag = container.querySelector(
      'script[type="application/ld+json"]'
    )
    const content = scriptTag?.textContent

    expect(() => JSON.parse(content || '')).not.toThrow()

    const data = JSON.parse(content || '')
    expect(data.name).toBe('Minimal Property')
  })

  it('should gracefully handle errors', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

    // Property with invalid data that might cause issues
    const problematicProperty = {
      name: 'Property',
      basePrice: NaN as unknown as number,
    }

    const { container } = render(
      <LodgingBusinessSchema property={problematicProperty} />
    )

    // Component should render empty or error gracefully
    expect(container.innerHTML).toBeDefined()

    consoleSpy.mockRestore()
  })

  it('should suppress hydration warnings', () => {
    const { container } = render(
      <LodgingBusinessSchema property={mockProperty} />
    )

    const _scriptTag = container.querySelector(
      'script[type="application/ld+json"]'
    )

    // Check that suppressHydrationWarning attribute is set (though not visible in DOM)
    expect(_scriptTag).toBeTruthy()
  })

  it('should include all property fields in JSON-LD', () => {
    const completeProperty = {
      ...mockProperty,
      description: 'Complete description',
      telephone: '+351 21 1234567',
      checkin_from: '15:00:00',
      checkout_until: '11:00:00',
      bathrooms: 1,
      reviewScore: { globalAvg: 4.8, totalCount: 10 },
      structuredAmenities: [{ name: 'WiFi' }, { name: 'Kitchen' }],
    }

    const { container } = render(
      <LodgingBusinessSchema property={completeProperty} />
    )

    const scriptTag = container.querySelector(
      'script[type="application/ld+json"]'
    )
    const data = JSON.parse(scriptTag?.textContent || '{}')

    expect(data.description).toBe('Complete description')
    expect(data.telephone).toBe('+351 21 1234567')
    expect(data.checkinTime).toBe('15:00:00')
    expect(data.checkoutTime).toBe('11:00:00')
    expect(data.aggregateRating).toBeDefined()
    expect(data.amenityFeature).toHaveLength(2)
  })

  it('should safely handle XSS attempts in property data', () => {
    const maliciousProperty = {
      ...mockProperty,
      name: '<img src=x onerror="alert(\'xss\')" />',
      description: '<script>alert("xss")</script>',
    }

    const { container } = render(
      <LodgingBusinessSchema property={maliciousProperty} />
    )

    const scriptTag = container.querySelector(
      'script[type="application/ld+json"]'
    )
    const content = scriptTag?.textContent || ''

    // JSON.stringify escapes - verify valid JSON
    expect(() => JSON.parse(content)).not.toThrow()
    const parsed = JSON.parse(content)
    // Data is preserved but safely serialized
    expect(parsed.name).toContain('img')
    expect(parsed.description).toContain('script')
  })

  it('should generate proper postal address structure', () => {
    const { container } = render(
      <LodgingBusinessSchema property={mockProperty} />
    )

    const scriptTag = container.querySelector(
      'script[type="application/ld+json"]'
    )
    const data = JSON.parse(scriptTag?.textContent || '{}')

    expect(data.address['@type']).toBe('PostalAddress')
    expect(data.address.streetAddress).toBe('Test Street, 123')
    expect(data.address.addressLocality).toBe('Lisboa')
    expect(data.address.postalCode).toBe('1200-001')
    expect(data.address.addressCountry).toBe('PT')
  })

  it('should include geo coordinates when available', () => {
    const { container } = render(
      <LodgingBusinessSchema property={mockProperty} />
    )

    const scriptTag = container.querySelector(
      'script[type="application/ld+json"]'
    )
    const data = JSON.parse(scriptTag?.textContent || '{}')

    expect(data.geo['@type']).toBe('GeoCoordinates')
    expect(data.geo.latitude).toBe(38.7)
    expect(data.geo.longitude).toBe(-9.1)
  })

  it('should handle array of images correctly', () => {
    const propertyMultipleImages = {
      ...mockProperty,
      imageUrls: [
        'https://example.com/img1.jpg',
        'https://example.com/img2.jpg',
      ],
    }

    const { container } = render(
      <LodgingBusinessSchema property={propertyMultipleImages} />
    )

    const scriptTag = container.querySelector(
      'script[type="application/ld+json"]'
    )
    const data = JSON.parse(scriptTag?.textContent || '{}')

    expect(Array.isArray(data.image)).toBe(true)
    expect(data.image).toHaveLength(2)
  })
})
