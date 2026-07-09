/**
 * Parser for Booking.com iCal events
 * Extracts guest info, phone, country, and guest count from DESCRIPTION field
 */

export interface BookingDescription {
  bookingId?: string
  phone?: string
  country?: string
  numGuests?: number
  guestName?: string
}

/**
 * Parse Booking.com DESCRIPTION field to extract guest details
 * Booking.com iCal format typically includes:
 * - BOOKING ID: 12345678
 * - PHONE: +34 912345678
 * - COUNTRY: Spain
 * - GUESTS: 2
 */
export function parseBookingDescription(description?: string): BookingDescription {
  if (!description) return {}

  const result: BookingDescription = {}

  // Extract BOOKING ID
  const bookingMatch = description.match(/BOOKING\s*ID\s*[:\-]?\s*([A-Z0-9]+)/i)
  if (bookingMatch) {
    result.bookingId = bookingMatch[1].trim()
  }

  // Extract PHONE - various formats
  // Handles: +34 912345678, +34-912345678, +34912345678, (34) 912345678 etc.
  const phoneMatch = description.match(/PHONE\s*[:\-]?\s*([\d\s\-\+\(\)]+?)(?:\n|$)/i)
  if (phoneMatch) {
    result.phone = phoneMatch[1].trim()
  }

  // Extract COUNTRY
  const countryMatch = description.match(/COUNTRY\s*[:\-]?\s*([^\n]+?)(?:\n|$)/i)
  if (countryMatch) {
    result.country = countryMatch[1].trim()
  }

  // Extract number of GUESTS
  // Handles: GUESTS: 2, GUESTS: 2 adults, GUESTS: 2 guests, etc.
  const guestsMatch = description.match(/GUESTS?\s*[:\-]?\s*(\d+)/i)
  if (guestsMatch) {
    result.numGuests = parseInt(guestsMatch[1], 10)
  }

  // Try to extract guest name from the first line or a "NAME:" field
  // Some Booking.com exports include the guest name at the start
  const nameMatch = description.match(/(?:NAME|GUEST)\s*[:\-]?\s*([A-Za-z\s]+?)(?:\n|$)/i)
  if (nameMatch) {
    result.guestName = nameMatch[1].trim()
  }

  return result
}

/**
 * Determine the source platform from iCal summary/description
 */
export function detectSource(summary?: string, description?: string): 'booking' | 'airbnb' | 'unknown' {
  const text = `${summary || ''} ${description || ''}`.toLowerCase()

  if (text.includes('booking')) return 'booking'
  if (text.includes('airbnb') || text.includes('abnb')) return 'airbnb'

  return 'unknown'
}

/**
 * Construir external_id estável a partir de UID e dados de plataforma
 * Formato: 'plataforma_numero' (ex: 'booking_6816972454', 'airbnb_12345')
 * Usado para evitar duplicação na sincronização iCal
 */
export function buildStableExternalId(
  uid: string | undefined,
  description: string | undefined,
  source: 'booking' | 'airbnb' | 'unknown'
): string {
  if (!uid) return 'unknown'

  // Booking.com: extrair booking_id da description
  if (source === 'booking') {
    const bookingData = parseBookingDescription(description)
    if (bookingData.bookingId) {
      return `booking_${bookingData.bookingId}`
    }
  }

  // Airbnb: UID é {numero}@airbnb.com
  if (source === 'airbnb' && uid.includes('@airbnb.com')) {
    const airbnbId = uid.replace('@airbnb.com', '')
    return `airbnb_${airbnbId}`
  }

  // VRBO/Expedia: detectar pelo UID
  if (uid.includes('vrbo')) {
    const vrboId = uid.replace(/[@\.].*/, '').split(':').pop() || uid
    return `vrbo_${vrboId}`
  }

  // Flatio: detectar pelo UID
  if (uid.includes('flatio')) {
    const flatioId = uid.replace(/[@\.].*/, '').split(':').pop() || uid
    return `flatio_${flatioId}`
  }

  // Fallback: usar UID genérico
  return uid
}

/**
 * CRITICAL: Determine if Booking.com event is a block or reservation
 *
 * Booking exports BOTH reservations and blocks with CLOSED summary!
 * Differentiator: Description contains guest details for reservations
 */
export function isBookingBlocked(event: { summary?: string; description?: string; uid?: string }): boolean {
  const summary = (event.summary || '').toLowerCase().trim()
  const description = (event.description || '').toLowerCase().trim()

  // If description has BOOKING ID field = DEFINITELY A RESERVATION
  // Booking exports structured data for real bookings
  if (/booking\s*id\s*[:\-]?/i.test(description)) {
    return false  // Is reservation
  }

  // If description has guest details (PHONE, COUNTRY, GUESTS) = RESERVATION
  if (/phone\s*[:\-]?|country\s*[:\-]?|guests?\s*[:\-]?/i.test(description)) {
    return false  // Is reservation
  }

  // If description is EMPTY or GENERIC ("booking", "closed") = BLOCK
  if (!description || description === 'booking' || description === 'closed - not available') {
    return true  // Is block
  }

  // If description starts with platform name only = BLOCK
  if (/^booking[\s\W]*$|^closed[\s\W]*$/i.test(description)) {
    return true  // Is block
  }

  // If summary explicitly says "closed" without structured data = BLOCK
  if (summary === 'closed - not available' && !description) {
    return true  // Is block
  }

  return false  // Default: treat as reservation (has some description)
}

/**
 * CRITICAL: Determine if Airbnb event is a block or reservation
 *
 * Airbnb is clearer but still needs careful parsing:
 *   "Reserved" or "{Guest Name}" = Reservation
 *   "Airbnb (Not available)" = Block
 */
export function isAirbnbBlocked(event: { summary?: string; description?: string; uid?: string }): boolean {
  const summary = (event.summary || '').toLowerCase().trim()
  const description = (event.description || '').toLowerCase().trim()

  // Explicit "Reserved" = RESERVATION
  if (summary === 'reserved') {
    return false  // Is reservation
  }

  // Airbnb explicitly marks blocks
  if (summary.includes('not available') || summary.includes('(not available)')) {
    return true  // Is block
  }

  // If description is generic Airbnb only = BLOCK
  if (!description || description === 'airbnb' || /^airbnb[\s\W]*$/i.test(description)) {
    return true  // Is block
  }

  // Anything else with some data = RESERVATION
  if (description && description !== 'airbnb') {
    return false  // Is reservation
  }

  return false  // Default: not blocked (treat as reservation)
}

/**
 * Flatio follows Booking.com pattern
 */
export function isFlatioBlocked(event: { summary?: string; description?: string; uid?: string }): boolean {
  const description = (event.description || '').toLowerCase().trim()

  // Similar to Booking: structured data = reservation
  if (/booking\s*id\s*[:\-]?|guest|phone|country/i.test(description)) {
    return false  // Is reservation
  }

  // Generic Flatio or empty = block
  if (!description || description === 'flatio' || /^flatio[\s\W]*$/i.test(description)) {
    return true  // Is block
  }

  return false
}
