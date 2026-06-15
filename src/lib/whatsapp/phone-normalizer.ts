/**
 * Phone number normalization to E.164 format
 * Accepts: +55 (Brazil), +351 (Portugal), +34 (Spain), etc.
 * Returns: +{country_code}{number}
 */

interface NormalizeResult {
  isValid: boolean;
  normalized?: string;
  error?: string;
}

// Country code mappings
const COUNTRY_CODES: Record<string, string> = {
  '55': '55',   // Brazil
  '351': '351', // Portugal
  '34': '34',   // Spain
  '1': '1',     // USA/Canada
};

export function normalizePhoneNumber(phone: string): NormalizeResult {
  if (!phone || typeof phone !== 'string') {
    return { isValid: false, error: 'Phone number required' };
  }

  // Remove whitespace and dashes
  let cleaned = phone.trim().replace(/[\s-()]/g, '');

  // Handle common formats
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.slice(1);
  } else if (cleaned.startsWith('00')) {
    cleaned = cleaned.slice(2);
  }

  // Extract country code and number
  let countryCode = '';
  let number = '';

  for (const code of Object.keys(COUNTRY_CODES).sort((a, b) => b.length - a.length)) {
    if (cleaned.startsWith(code)) {
      countryCode = code;
      number = cleaned.slice(code.length);
      break;
    }
  }

  if (!countryCode) {
    return { isValid: false, error: 'Unknown country code' };
  }

  // Validate number length (9-15 digits)
  if (number.length < 9 || number.length > 15) {
    return { isValid: false, error: 'Invalid phone number length' };
  }

  // Validate only digits
  if (!/^\d+$/.test(number)) {
    return { isValid: false, error: 'Phone number contains invalid characters' };
  }

  const normalized = `+${countryCode}${number}`;

  return {
    isValid: true,
    normalized,
  };
}

/**
 * Validate E.164 format
 */
export function isValidE164(phone: string): boolean {
  const result = normalizePhoneNumber(phone);
  return result.isValid;
}
