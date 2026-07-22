/**
 * URL validation and extraction for competitor monitoring
 */

export type Platform = 'airbnb' | 'booking.com' | 'vrbo' | 'other';

export interface ValidatedUrl {
  isValid: boolean;
  platform: Platform;
  propertyName: string;
  propertyId?: string;
  error?: string;
}

/**
 * Validate competitor URL and extract platform + property ID
 */
export function validateCompetitorUrl(url: string): ValidatedUrl {
  if (!url || typeof url !== 'string') {
    return {
      isValid: false,
      platform: 'other',
      propertyName: '',
      error: 'Invalid URL format',
    };
  }

  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.toLowerCase();

    // Airbnb
    if (domain.includes('airbnb')) {
      const match = url.match(/rooms?\/(\d+)/i);
      if (match) {
        const propertyId = match[1];
        const propertyName = extractAirbnbPropertyName(url);
        return {
          isValid: true,
          platform: 'airbnb',
          propertyName,
          propertyId,
        };
      }
      return {
        isValid: false,
        platform: 'airbnb',
        propertyName: '',
        error: 'Could not extract Airbnb property ID. Ensure URL contains room ID.',
      };
    }

    // Booking.com
    if (domain.includes('booking.com')) {
      const match = url.match(/hotel\/([a-z]{2})\/([a-z0-9_-]+)\.html/i);
      if (match) {
        const propertyId = match[2];
        const propertyName = extractBookingPropertyName(url);
        return {
          isValid: true,
          platform: 'booking.com',
          propertyName,
          propertyId,
        };
      }
      return {
        isValid: false,
        platform: 'booking.com',
        propertyName: '',
        error: 'Could not extract Booking.com property ID. Ensure URL is a property page.',
      };
    }

    // VRBO
    if (domain.includes('vrbo.com') || domain.includes('homeaway.com')) {
      const match = url.match(/\/(\d+)(?:\/|$)/);
      if (match) {
        const propertyId = match[1];
        const propertyName = extractVrboPropertyName(url);
        return {
          isValid: true,
          platform: 'vrbo',
          propertyName,
          propertyId,
        };
      }
      return {
        isValid: false,
        platform: 'vrbo',
        propertyName: '',
        error: 'Could not extract VRBO property ID. Ensure URL is a property listing.',
      };
    }

    // Unknown platform
    return {
      isValid: false,
      platform: 'other',
      propertyName: '',
      error: 'URL platform not supported. Use Airbnb, Booking.com, or VRBO.',
    };
  } catch (error) {
    return {
      isValid: false,
      platform: 'other',
      propertyName: '',
      error: 'Invalid URL format',
    };
  }
}

/**
 * Extract property name from Airbnb URL
 * Format: https://www.airbnb.com/rooms/123456789?title=Property+Name
 */
function extractAirbnbPropertyName(url: string): string {
  try {
    const urlObj = new URL(url);
    const title = urlObj.searchParams.get('title');
    if (title) {
      return decodeURIComponent(title).replace(/\+/g, ' ');
    }

    // Fallback: use URL path
    const match = url.match(/rooms?\/(\d+)(?:\/([^?]+))?/i);
    if (match && match[2]) {
      return decodeURIComponent(match[2]).replace(/-/g, ' ');
    }

    return `Airbnb Property ${url.match(/rooms?\/(\d+)/i)?.[1]}`;
  } catch {
    return 'Airbnb Property';
  }
}

/**
 * Extract property name from Booking.com URL
 * Format: https://www.booking.com/hotel/pt/property-name.html
 */
function extractBookingPropertyName(url: string): string {
  try {
    const match = url.match(/hotel\/[a-z]{2}\/([a-z0-9_-]+)\.html/i);
    if (match && match[1]) {
      return decodeURIComponent(match[1])
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, char => char.toUpperCase());
    }
    return 'Booking.com Property';
  } catch {
    return 'Booking.com Property';
  }
}

/**
 * Extract property name from VRBO URL
 * Format: https://www.vrbo.com/123456
 */
function extractVrboPropertyName(url: string): string {
  try {
    const match = url.match(/\/(\d+)/);
    if (match) {
      return `VRBO Property ${match[1]}`;
    }
    return 'VRBO Property';
  } catch {
    return 'VRBO Property';
  }
}

/**
 * Normalize URL for storage (remove tracking params, https ensure, etc)
 */
export function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.toLowerCase();

    // Keep only essential params

    if (domain.includes('airbnb')) {
      const roomId = urlObj.pathname.match(/rooms?\/(\d+)/i)?.[1];
      if (roomId) {
        return `https://www.airbnb.com/rooms/${roomId}`;
      }
    }

    if (domain.includes('booking.com')) {
      const hotelId = urlObj.pathname.match(/hotel\/[a-z]{2}\/([a-z0-9_-]+)\.html/i)?.[1];
      if (hotelId) {
        return `https://www.booking.com/hotel/pt/${hotelId}.html`;
      }
    }

    if (domain.includes('vrbo.com') || domain.includes('homeaway.com')) {
      const propertyId = urlObj.pathname.match(/\/(\d+)/)?.[1];
      if (propertyId) {
        return `https://www.vrbo.com/${propertyId}`;
      }
    }

    // Return URL with protocol normalized to https
    return `https://${urlObj.host}${urlObj.pathname}`;
  } catch {
    return url;
  }
}

/**
 * Extract platform from URL
 */
export function getPlatformFromUrl(url: string): Platform {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.toLowerCase();

    if (domain.includes('airbnb')) return 'airbnb';
    if (domain.includes('booking.com')) return 'booking.com';
    if (domain.includes('vrbo.com') || domain.includes('homeaway.com')) return 'vrbo';

    return 'other';
  } catch {
    return 'other';
  }
}

/**
 * Check if URL is valid for monitoring
 */
export function isUrlMonitorable(url: string): boolean {
  const validation = validateCompetitorUrl(url);
  return validation.isValid;
}

/**
 * Get platform display name
 */
export function getPlatformDisplayName(platform: Platform): string {
  switch (platform) {
    case 'airbnb':
      return 'Airbnb';
    case 'booking.com':
      return 'Booking.com';
    case 'vrbo':
      return 'VRBO';
    default:
      return 'Other';
  }
}
