/**
 * Schema.org JSON-LD generators for SEO and Rich Results
 * Used for Google Vacation Rentals integration (Epic 27)
 */

export interface Property {
  id: string;
  name: string;
  description: string;
  slug: string;
  address: string;
  city: string;
  zipcode: string;
  country: string;
  phone?: string;
  email?: string;
}

export interface PropertyImage {
  url: string;
  alt?: string;
}

export interface PropertyReview {
  rating: number;
  reviewCount: number;
  source?: string;
}

export interface LodgingBusinessSchema {
  '@context': string;
  '@type': string;
  name: string;
  description: string;
  image: string[];
  address: {
    '@type': string;
    streetAddress: string;
    addressLocality: string;
    postalCode: string;
    addressCountry: string;
  };
  telephone?: string;
  email?: string;
  priceRange: string;
  aggregateRating?: {
    '@type': string;
    ratingValue: string;
    reviewCount: number;
  };
  openingHoursSpecification: {
    '@type': string;
    dayOfWeek: string[];
    opens: string;
    closes: string;
  };
}

/**
 * Generate JSON-LD schema for LodgingBusiness
 * Complies with schema.org and Google Rich Results requirements
 */
export function generateLodgingBusinessSchema(
  property: Property,
  images: PropertyImage[],
  review?: PropertyReview,
  priceRange: string = '€50-€200'
): LodgingBusinessSchema {
  // Validate required fields
  if (!property.name || !property.description || !property.address) {
    throw new Error('Property must have name, description, and address');
  }

  // Build image array with fallback
  const imageUrls = images && images.length > 0
    ? images.map(img => img.url)
    : [`https://cdn.lodgra.app/properties/${property.id}/default.webp`];

  // Build address - require city and country for valid address
  if (!property.city || !property.country) {
    throw new Error('Property must have city and country for valid address');
  }

  const address = {
    '@type': 'PostalAddress' as const,
    streetAddress: property.address,
    addressLocality: property.city,
    postalCode: property.zipcode || '',
    addressCountry: property.country,
  };

  // Build schema object
  const schema: LodgingBusinessSchema = {
    '@context': 'https://schema.org',
    '@type': 'LodgingBusiness',
    name: sanitizeText(property.name),
    description: sanitizeText(property.description.substring(0, 500)), // Google truncates at 500 chars
    image: imageUrls,
    address,
    priceRange,
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: '14:00',
      closes: '11:00',
    },
  };

  // Add phone if available (validate format)
  if (property.phone && isValidPhoneNumber(property.phone)) {
    schema.telephone = property.phone;
  }

  // Add email if available (no PII validation here, defer to caller)
  if (property.email && isValidEmail(property.email)) {
    schema.email = property.email;
  }

  // Add aggregate rating if reviews available
  if (review && review.rating > 0 && review.reviewCount > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: review.rating.toFixed(1),
      reviewCount: review.reviewCount,
    };
  }

  return schema;
}

/**
 * Sanitize text for safe inclusion in JSON-LD
 * Removes HTML, escapes special chars
 */
function sanitizeText(text: string): string {
  return text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

/**
 * Basic phone number validation (international formats)
 * Accepts: +X XXX XXX XXXX, (XXX) XXX-XXXX, XXXXXXX, etc.
 * Requires at least 7 digits, + prefix is optional
 */
function isValidPhoneNumber(phone: string): boolean {
  // Remove spaces, dashes, parentheses, and dots to count digits
  const digitsOnly = phone.replace(/[\s\-().]/g, '');
  // Allow optional + prefix and require at least 7 digits
  const hasValidFormat = /^[+]?[0-9]{7,}$/.test(digitsOnly);
  return hasValidFormat;
}

/**
 * Basic email validation
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate schema structure (JSON-LD compliance check)
 */
export function validateSchema(schema: unknown): boolean {
  if (!schema || typeof schema !== 'object') return false;

  const s = schema as Record<string, unknown>;

  // Required fields
  const required = ['@context', '@type', 'name', 'description', 'address', 'image'];
  for (const field of required) {
    if (!s[field]) return false;
  }

  // Type check
  if (s['@type'] !== 'LodgingBusiness') return false;
  if (s['@context'] !== 'https://schema.org') return false;

  // Address validation
  const address = s.address as Record<string, unknown>;
  if (!address || address['@type'] !== 'PostalAddress') return false;

  return true;
}
