/**
 * Google Analytics ID validation utilities
 */

const GA_ID_REGEX = /^G-[A-Z0-9]{10}$/;

/**
 * Validates GA Measurement ID format
 * Valid format: G- followed by 10 uppercase letters or numbers
 *
 * @example
 * isValidGAId('G-1234567890') // true
 * isValidGAId('g-1234567890') // false (lowercase)
 * isValidGAId('GA-1234567890') // false (wrong prefix)
 */
export function isValidGAId(id: string): boolean {
  return GA_ID_REGEX.test(id);
}

/**
 * Masks a GA Measurement ID for display (security)
 * @example
 * maskGAId('G-1234567890') // 'G-●●●●●●●●●●'
 */
export function maskGAId(id: string): string {
  if (!id || id.length < 2) return '●●●●●●●●●●';
  return id.substring(0, 2) + '●●●●●●●●●●';
}
