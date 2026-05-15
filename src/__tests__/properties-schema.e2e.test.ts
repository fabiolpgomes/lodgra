import { describe, it, expect } from '@jest/globals';
import { generateLodgingBusinessSchema, validateSchema } from '../lib/schema-generators';

/**
 * E2E test simulating how the schema will be rendered in the property detail page
 * This validates the complete integration: database → schema generation → HTML output
 */
describe('Property Schema E2E Integration', () => {
  // Mock database data (simulating Supabase queries)
  const mockDatabaseProperty = {
    id: 'prop-algarve-001',
    name: 'Luxurious Beachfront Villa - Lagos, Algarve',
    description: 'Stunning 5-bedroom beachfront villa with private pool, sea views, and direct beach access. Perfect for family vacations or group getaways. Modern amenities include smart home automation, climate control, and premium WiFi.',
    slug: 'luxurious-beachfront-villa-lagos',
    address: 'Rua da Praia 42, Bloco A',
    city: 'Lagos',
    zipcode: '8600-001',
    country: 'PT',
    phone: '+351 289 000 000',
    email: 'bookings@beachvilla.pt',
  };

  const mockDatabaseImages = [
    { id: '1', url: 'https://images.lodgra.app/properties/algarve-001/beach-view.webp' },
    { id: '2', url: 'https://images.lodgra.app/properties/algarve-001/pool-sunset.webp' },
    { id: '3', url: 'https://images.lodgra.app/properties/algarve-001/bedroom-master.webp' },
    { id: '4', url: 'https://images.lodgra.app/properties/algarve-001/living-room.webp' },
  ];

  const mockDatabaseReviews = [
    { property_id: 'prop-algarve-001', rating: 5, source: 'Booking.com', review_text: 'Absolutely amazing!' },
    { property_id: 'prop-algarve-001', rating: 4, source: 'Airbnb', review_text: 'Great location' },
    { property_id: 'prop-algarve-001', rating: 5, source: 'Vrbo', review_text: 'Perfect for family' },
    { property_id: 'prop-algarve-001', rating: 5, source: 'TripAdvisor', review_text: 'Unforgettable' },
    { property_id: 'prop-algarve-001', rating: 4, source: 'Booking.com', review_text: 'Very nice' },
  ];

  it('should generate valid schema for complete property with reviews', () => {
    // Simulate data aggregation (as would happen in generateMetadata)
    const avgRating = mockDatabaseReviews.reduce((sum, r) => sum + r.rating, 0) / mockDatabaseReviews.length;

    const schema = generateLodgingBusinessSchema(
      mockDatabaseProperty,
      mockDatabaseImages,
      {
        rating: avgRating,
        reviewCount: mockDatabaseReviews.length,
      }
    );

    // Verify schema structure
    expect(validateSchema(schema)).toBe(true);

    // Verify all properties are populated
    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBe('LodgingBusiness');
    expect(schema.name).toBe('Luxurious Beachfront Villa - Lagos, Algarve');
    expect(schema.image).toHaveLength(4);
    expect(schema.telephone).toBe('+351 289 000 000');
    expect(schema.email).toBe('bookings@beachvilla.pt');
    expect(schema.aggregateRating?.ratingValue).toBe('4.6'); // (5+4+5+5+4)/5 = 4.6
    expect(schema.aggregateRating?.reviewCount).toBe(5);
  });

  it('should render correct JSON-LD in HTML', () => {
    const avgRating = mockDatabaseReviews.reduce((sum, r) => sum + r.rating, 0) / mockDatabaseReviews.length;

    const schema = generateLodgingBusinessSchema(
      mockDatabaseProperty,
      mockDatabaseImages,
      {
        rating: avgRating,
        reviewCount: mockDatabaseReviews.length,
      }
    );

    // Simulate rendering to HTML
    const jsonLD = JSON.stringify(schema);
    const htmlScript = `<script type="application/ld+json">${jsonLD}</script>`;

    // Verify HTML is valid
    expect(htmlScript).toContain('<script type="application/ld+json">');
    expect(htmlScript).toContain('</script>');

    // Parse back to verify JSON is valid
    const parsed = JSON.parse(jsonLD);
    expect(parsed['@context']).toBe('https://schema.org');
  });

  it('should handle multiple properties without data contamination', () => {
    const property1 = { ...mockDatabaseProperty, id: 'prop-1', name: 'Property 1' };
    const property2 = { ...mockDatabaseProperty, id: 'prop-2', name: 'Property 2' };

    const schema1 = generateLodgingBusinessSchema(property1, mockDatabaseImages);
    const schema2 = generateLodgingBusinessSchema(property2, mockDatabaseImages);

    expect(schema1.name).toBe('Property 1');
    expect(schema2.name).toBe('Property 2');
    expect(schema1).not.toBe(schema2);
  });

  it('should pass Google Rich Results validation criteria', () => {
    const avgRating = mockDatabaseReviews.reduce((sum, r) => sum + r.rating, 0) / mockDatabaseReviews.length;

    const schema = generateLodgingBusinessSchema(
      mockDatabaseProperty,
      mockDatabaseImages,
      {
        rating: avgRating,
        reviewCount: mockDatabaseReviews.length,
      }
    );

    // Google Rich Results requirements:
    // 1. Must have @context and @type
    expect(schema['@context']).toBeDefined();
    expect(schema['@type']).toBeDefined();

    // 2. Must have name, description, address
    expect(schema.name).toBeTruthy();
    expect(schema.description).toBeTruthy();
    expect(schema.address).toBeTruthy();

    // 3. Address must have required fields
    expect(schema.address.streetAddress).toBeTruthy();
    expect(schema.address.addressLocality).toBeTruthy();
    expect(schema.address.postalCode).toBeTruthy();
    expect(schema.address.addressCountry).toBeTruthy();

    // 4. Must have image(s)
    expect(schema.image).toBeDefined();
    expect(Array.isArray(schema.image)).toBe(true);
    expect(schema.image.length).toBeGreaterThan(0);

    // 5. Should have priceRange
    expect(schema.priceRange).toBeDefined();

    // 6. Should have aggregateRating if reviews exist
    expect(schema.aggregateRating).toBeDefined();
    expect(schema.aggregateRating?.ratingValue).toBeDefined();
    expect(schema.aggregateRating?.reviewCount).toBeGreaterThan(0);

    // 7. Should have openingHoursSpecification
    expect(schema.openingHoursSpecification).toBeDefined();
    expect(schema.openingHoursSpecification.opens).toBe('14:00');
    expect(schema.openingHoursSpecification.closes).toBe('11:00');
  });

  it('should work with minimal property data', () => {
    const minimalProperty = {
      id: 'prop-minimal',
      name: 'Simple Property',
      description: 'A nice place',
      slug: 'simple',
      address: 'Main St',
      city: 'City',
      zipcode: '12345',
      country: 'PT',
    };

    const schema = generateLodgingBusinessSchema(minimalProperty, []);

    expect(validateSchema(schema)).toBe(true);
    expect(schema.name).toBe('Simple Property');
    expect(schema.image).toHaveLength(1); // Default image
    expect(schema.telephone).toBeUndefined();
    expect(schema.aggregateRating).toBeUndefined();
  });

  it('should correctly escape special characters', () => {
    const propertyWithSpecialChars = {
      ...mockDatabaseProperty,
      name: 'Villa "O Paraíso" & Luxury Spa',
      description: 'Features <amazing> amenities & 5-star service with <strong>great</strong> views',
    };

    const schema = generateLodgingBusinessSchema(
      propertyWithSpecialChars,
      mockDatabaseImages
    );

    // Special characters should be preserved in JSON-LD
    expect(schema.name).toContain('O Paraíso');
    expect(schema.name).toContain('&');
    // HTML tags should be removed from description
    expect(schema.description).not.toContain('<');
    expect(schema.description).not.toContain('>');
    // Content outside HTML tags should be preserved
    expect(schema.description).toContain('amenities');
    expect(schema.description).toContain('5-star');
    expect(schema.description).toContain('views');
  });

  it('should performance test: handle large image arrays', () => {
    // Simulate 20 property images
    const manyImages = Array.from({ length: 20 }, (_, i) => ({
      url: `https://images.lodgra.app/properties/algarve-001/image-${i}.webp`,
    }));

    const startTime = performance.now();

    const schema = generateLodgingBusinessSchema(
      mockDatabaseProperty,
      manyImages
    );

    const endTime = performance.now();

    expect(schema.image.length).toBe(20);
    expect(endTime - startTime).toBeLessThan(10); // Should generate in < 10ms
  });

  it('should work with international address formats', () => {
    const internationalProperty = {
      ...mockDatabaseProperty,
      country: 'ES',
      city: 'Barcelona',
      zipcode: '08002',
      address: 'Passeig de Gràcia 123',
    };

    const schema = generateLodgingBusinessSchema(
      internationalProperty,
      mockDatabaseImages
    );

    expect(schema.address.addressCountry).toBe('ES');
    expect(schema.address.addressLocality).toBe('Barcelona');
    expect(validateSchema(schema)).toBe(true);
  });
});
