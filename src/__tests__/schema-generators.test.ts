import { describe, it, expect } from '@jest/globals';
import {
  generateLodgingBusinessSchema,
  validateSchema,
  Property,
  PropertyImage,
  PropertyReview,
} from '../lib/schema-generators';

describe('Schema Generators', () => {
  const mockProperty: Property = {
    id: 'prop-123',
    name: 'Cozy Beach Villa',
    description: 'A beautiful beachfront property with stunning sea views and modern amenities.',
    slug: 'cozy-beach-villa',
    address: 'Rua da Praia 42',
    city: 'Lagos',
    zipcode: '8600-001',
    country: 'PT',
    phone: '+351 300 000 000',
    email: 'contact@beachvilla.pt',
  };

  const mockImages: PropertyImage[] = [
    { url: 'https://cdn.example.com/photo1.webp', alt: 'Beach view' },
    { url: 'https://cdn.example.com/photo2.webp', alt: 'Interior' },
  ];

  const mockReview: PropertyReview = {
    rating: 4.7,
    reviewCount: 23,
    source: 'Booking.com',
  };

  describe('generateLodgingBusinessSchema', () => {
    it('should generate valid schema with all fields', () => {
      const schema = generateLodgingBusinessSchema(
        mockProperty,
        mockImages,
        mockReview
      );

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('LodgingBusiness');
      expect(schema.name).toBe('Cozy Beach Villa');
      expect(schema.telephone).toBe('+351 300 000 000');
      expect(schema.email).toBe('contact@beachvilla.pt');
      expect(schema.aggregateRating?.ratingValue).toBe('4.7');
      expect(schema.aggregateRating?.reviewCount).toBe(23);
    });

    it('should generate schema without reviews', () => {
      const schema = generateLodgingBusinessSchema(mockProperty, mockImages);

      expect(schema.aggregateRating).toBeUndefined();
    });

    it('should generate schema without phone/email', () => {
      const propertyNoContact: Property = {
        ...mockProperty,
        phone: undefined,
        email: undefined,
      };

      const schema = generateLodgingBusinessSchema(
        propertyNoContact,
        mockImages,
        mockReview
      );

      expect(schema.telephone).toBeUndefined();
      expect(schema.email).toBeUndefined();
    });

    it('should generate schema with default images if none provided', () => {
      const schema = generateLodgingBusinessSchema(
        mockProperty,
        [],
        mockReview
      );

      expect(schema.image).toHaveLength(1);
      expect(schema.image[0]).toContain('default.webp');
    });

    it('should include opening hours specification', () => {
      const schema = generateLodgingBusinessSchema(
        mockProperty,
        mockImages,
        mockReview
      );

      expect(schema.openingHoursSpecification).toBeDefined();
      expect(schema.openingHoursSpecification.opens).toBe('14:00');
      expect(schema.openingHoursSpecification.closes).toBe('11:00');
      expect(schema.openingHoursSpecification.dayOfWeek).toHaveLength(7);
    });

    it('should sanitize description (remove HTML)', () => {
      const propertyWithHtml: Property = {
        ...mockProperty,
        description: '<p>Beautiful place</p> with <strong>great</strong> views',
      };

      const schema = generateLodgingBusinessSchema(
        propertyWithHtml,
        mockImages
      );

      expect(schema.description).not.toContain('<p>');
      expect(schema.description).not.toContain('<strong>');
      expect(schema.description).toContain('Beautiful place');
    });

    it('should throw error if required fields missing', () => {
      const incompleteProperty: Property = {
        ...mockProperty,
        name: '', // Missing name
      };

      expect(() => {
        generateLodgingBusinessSchema(incompleteProperty, mockImages);
      }).toThrow('Property must have name, description, and address');
    });

    it('should include address with correct fields', () => {
      const schema = generateLodgingBusinessSchema(
        mockProperty,
        mockImages,
        mockReview
      );

      expect(schema.address['@type']).toBe('PostalAddress');
      expect(schema.address.streetAddress).toBe('Rua da Praia 42');
      expect(schema.address.addressLocality).toBe('Lagos');
      expect(schema.address.postalCode).toBe('8600-001');
      expect(schema.address.addressCountry).toBe('PT');
    });

    it('should support custom price range', () => {
      const schema = generateLodgingBusinessSchema(
        mockProperty,
        mockImages,
        mockReview,
        '€100-€300'
      );

      expect(schema.priceRange).toBe('€100-€300');
    });

    it('should truncate long descriptions', () => {
      const longDescription = 'A'.repeat(600);
      const propertyWithLongDesc: Property = {
        ...mockProperty,
        description: longDescription,
      };

      const schema = generateLodgingBusinessSchema(
        propertyWithLongDesc,
        mockImages
      );

      expect(schema.description.length).toBeLessThanOrEqual(500);
    });
  });

  describe('validateSchema', () => {
    it('should validate correct schema', () => {
      const schema = generateLodgingBusinessSchema(
        mockProperty,
        mockImages,
        mockReview
      );

      expect(validateSchema(schema)).toBe(true);
    });

    it('should reject invalid @context', () => {
      const invalidSchema = {
        '@context': 'https://wrong.org',
        '@type': 'LodgingBusiness',
        name: 'Test',
        description: 'Test',
        address: { '@type': 'PostalAddress' },
        image: [],
      };

      expect(validateSchema(invalidSchema)).toBe(false);
    });

    it('should reject invalid @type', () => {
      const invalidSchema = {
        '@context': 'https://schema.org',
        '@type': 'Hotel', // Wrong type
        name: 'Test',
        description: 'Test',
        address: { '@type': 'PostalAddress' },
        image: [],
      };

      expect(validateSchema(invalidSchema)).toBe(false);
    });

    it('should reject missing required fields', () => {
      const incompleteSchema = {
        '@context': 'https://schema.org',
        '@type': 'LodgingBusiness',
        name: 'Test',
        // Missing description, address, image
      };

      expect(validateSchema(incompleteSchema)).toBe(false);
    });

    it('should reject null input', () => {
      expect(validateSchema(null)).toBe(false);
      expect(validateSchema(undefined)).toBe(false);
    });

    it('should reject non-object input', () => {
      expect(validateSchema('not an object')).toBe(false);
      expect(validateSchema(123)).toBe(false);
      expect(validateSchema([])).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle property with no reviews gracefully', () => {
      const schema = generateLodgingBusinessSchema(
        mockProperty,
        mockImages,
        undefined
      );

      expect(schema.aggregateRating).toBeUndefined();
      expect(validateSchema(schema)).toBe(true);
    });

    it('should handle property with zero rating', () => {
      const zeroReview: PropertyReview = {
        rating: 0,
        reviewCount: 0,
      };

      const schema = generateLodgingBusinessSchema(
        mockProperty,
        mockImages,
        zeroReview
      );

      expect(schema.aggregateRating).toBeUndefined();
    });

    it('should handle special characters in property name', () => {
      const specialProperty: Property = {
        ...mockProperty,
        name: 'Villa "O Paraíso" & Spa',
      };

      const schema = generateLodgingBusinessSchema(
        specialProperty,
        mockImages
      );

      expect(schema.name).toBe('Villa "O Paraíso" & Spa');
    });

    it('should validate international phone numbers', () => {
      const propertiesWithPhones = [
        { ...mockProperty, phone: '+1 (555) 123-4567' }, // US
        { ...mockProperty, phone: '+44 20 7946 0958' }, // UK
        { ...mockProperty, phone: '+351 300 000 000' }, // PT
        { ...mockProperty, phone: '123' }, // Invalid
      ];

      const validPhones = propertiesWithPhones
        .slice(0, 3)
        .map(p => generateLodgingBusinessSchema(p, mockImages))
        .every(s => !!s.telephone);

      expect(validPhones).toBe(true);

      const invalidSchema = generateLodgingBusinessSchema(
        propertiesWithPhones[3],
        mockImages
      );
      expect(invalidSchema.telephone).toBeUndefined();
    });
  });
});
