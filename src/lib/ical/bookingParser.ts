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
