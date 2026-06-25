// Map platform to their rating range
export const PLATFORM_RANGES = {
  'Reserva Direta': { min: 0, max: 5 },
  'Airbnb': { min: 0, max: 5 },
  'TripAdvisor': { min: 0, max: 5 },
  'Flatio': { min: 0, max: 5 },
  'VRBO': { min: 0, max: 5 },
  'Expedia': { min: 0, max: 5 },
  'Booking': { min: 0, max: 10 },
  'Google': { min: 0, max: 10 },
}

export type Platform = keyof typeof PLATFORM_RANGES

// Map lowercase source names from DB to Platform keys
const SOURCE_TO_PLATFORM: Record<string, Platform> = {
  'airbnb': 'Airbnb',
  'booking': 'Booking',
  'google': 'Google',
  'tripadvisor': 'TripAdvisor',
  'flatio': 'Flatio',
  'vrbo': 'VRBO',
  'expedia': 'Expedia',
  'direct': 'Reserva Direta',
}

export function normalizeRating(platform: string, rating: number): number {
  const range = PLATFORM_RANGES[platform as Platform]
  if (!range) return rating

  // Normalize to 5-star scale
  return (rating / range.max) * 5
}

export function denormalizeRating(platform: string, normalizedRating: number): number {
  const range = PLATFORM_RANGES[platform as Platform]
  if (!range) return normalizedRating

  // Convert from 5-star scale back to platform's scale
  return (normalizedRating / 5) * range.max
}

export function getRatingStars(rating: number, maxStars: number = 5): number {
  // Return number of full stars (0-5)
  return Math.round((rating / maxStars) * 5)
}

export function generateStarRating(stars: number): string {
  // Generate visual star representation (★ and ☆)
  const fullStars = Math.floor(stars)
  const hasHalfStar = stars % 1 >= 0.5

  let starString = '★'.repeat(fullStars)
  if (hasHalfStar && fullStars < 5) starString += '½'
  starString += '☆'.repeat(5 - Math.ceil(stars))

  return starString
}

export function calculateAverageRating(ratings: Array<{ platform: string; rating: number }>): {
  average: number
  normalized: number
  starCount: number
  starString: string
} {
  if (ratings.length === 0) return { average: 0, normalized: 0, starCount: 0, starString: '' }

  // Normalize all ratings to 5-star scale
  const normalizedRatings = ratings.map(r => normalizeRating(r.platform, r.rating))
  const average = normalizedRatings.reduce((a, b) => a + b, 0) / normalizedRatings.length
  const starCount = getRatingStars(average, 5)
  const starString = generateStarRating(average)

  return {
    average: Math.round(average * 10) / 10, // Round to 1 decimal
    normalized: average,
    starCount,
    starString,
  }
}

export function getScaleMaxForSource(source: string): number {
  // Look up platform key from source name
  const platformKey = SOURCE_TO_PLATFORM[source.toLowerCase()] || (source as Platform)
  const range = PLATFORM_RANGES[platformKey]
  return range ? range.max : 10
}

export function normalizeToScale10(platform: string, rating: number): number {
  // Look up platform key from source name
  const platformKey = SOURCE_TO_PLATFORM[platform.toLowerCase()] || (platform as Platform)
  const range = PLATFORM_RANGES[platformKey]
  if (!range) return rating

  // Normalize platform-specific scale to 0-10
  return (rating / range.max) * 10
}
