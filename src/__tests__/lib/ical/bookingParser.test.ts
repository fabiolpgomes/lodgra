/**
 * Unit Tests for Booking iCal Parser
 * Tests parseBookingDescription() and detectSource() functions
 */

import { parseBookingDescription, detectSource } from '@/lib/ical/bookingParser'

describe('bookingParser', () => {
  describe('parseBookingDescription()', () => {
    // Test 1: Empty/undefined input
    it('should return empty object when description is undefined', () => {
      const result = parseBookingDescription(undefined)
      expect(result).toEqual({})
    })

    // Test 2: Empty string input
    it('should return empty object when description is empty string', () => {
      const result = parseBookingDescription('')
      expect(result).toEqual({})
    })

    // Test 3: Extract booking ID in standard format
    it('should extract booking ID with colon separator', () => {
      const description = 'BOOKING ID: 12345678'
      const result = parseBookingDescription(description)
      expect(result.bookingId).toBe('12345678')
    })

    // Test 4: Extract booking ID with dash separator
    it('should extract booking ID with dash separator', () => {
      const description = 'BOOKING ID- 87654321'
      const result = parseBookingDescription(description)
      expect(result.bookingId).toBe('87654321')
    })

    // Test 5: Extract booking ID without separator
    it('should extract booking ID without separator', () => {
      const description = 'BOOKING ID ABC123XYZ'
      const result = parseBookingDescription(description)
      expect(result.bookingId).toBe('ABC123XYZ')
    })

    // Test 6: Extract phone with international format
    it('should extract phone number in international format (+34 912345678)', () => {
      const description = 'PHONE: +34 912345678'
      const result = parseBookingDescription(description)
      expect(result.phone).toBe('+34 912345678')
    })

    // Test 7: Extract phone with hyphen format
    it('should extract phone number with hyphens (+34-912345678)', () => {
      const description = 'PHONE: +34-912345678'
      const result = parseBookingDescription(description)
      expect(result.phone).toBe('+34-912345678')
    })

    // Test 8: Extract phone with parentheses format
    it('should extract phone number with parentheses ((34) 912345678)', () => {
      const description = 'PHONE: (34) 912345678'
      const result = parseBookingDescription(description)
      expect(result.phone).toBe('(34) 912345678')
    })

    // Test 9: Extract multiple phone numbers (should get first one)
    it('should extract first phone number when multiple exist', () => {
      const description = 'PHONE: +34 912345678\nPhone: +34 987654321'
      const result = parseBookingDescription(description)
      expect(result.phone).toBe('+34 912345678')
    })

    // Test 10: Extract country name
    it('should extract country name', () => {
      const description = 'COUNTRY: Spain'
      const result = parseBookingDescription(description)
      expect(result.country).toBe('Spain')
    })

    // Test 11: Extract country with apostrophe
    it('should extract country name with apostrophe (Côte d\'Ivoire)', () => {
      const description = "COUNTRY: Côte d'Ivoire"
      const result = parseBookingDescription(description)
      expect(result.country).toBe("Côte d'Ivoire")
    })

    // Test 12: Extract country with multiple spaces
    it('should extract country name with multiple spaces (United Arab Emirates)', () => {
      const description = 'COUNTRY: United Arab Emirates'
      const result = parseBookingDescription(description)
      expect(result.country).toBe('United Arab Emirates')
    })

    // Test 13: Extract number of guests - simple format
    it('should extract guest count in simple format (GUESTS: 2)', () => {
      const description = 'GUESTS: 2'
      const result = parseBookingDescription(description)
      expect(result.numGuests).toBe(2)
    })

    // Test 14: Extract number of guests with plural form and text
    it('should extract guest count with descriptive text (GUESTS: 4 adults)', () => {
      const description = 'GUESTS: 4 adults'
      const result = parseBookingDescription(description)
      expect(result.numGuests).toBe(4)
    })

    // Test 15: Extract number of guests without separator
    it('should extract guest count without separator (GUEST 3)', () => {
      const description = 'GUEST 3'
      const result = parseBookingDescription(description)
      expect(result.numGuests).toBe(3)
    })

    // Test 16: Extract guest name
    it('should extract guest name from NAME field', () => {
      const description = 'NAME: John Smith'
      const result = parseBookingDescription(description)
      expect(result.guestName).toBe('John Smith')
    })

    // Test 17: Extract guest name from GUEST field
    it('should extract guest name from GUEST field', () => {
      const description = 'GUEST: Maria Garcia'
      const result = parseBookingDescription(description)
      expect(result.guestName).toBe('Maria Garcia')
    })

    // Test 18: Complex real-world scenario with all fields
    it('should extract all fields from real booking description', () => {
      const description = `BOOKING ID: 1234567890
PHONE: +34 912345678
COUNTRY: Spain
GUESTS: 2
NAME: John Smith`
      const result = parseBookingDescription(description)
      expect(result.bookingId).toBe('1234567890')
      expect(result.phone).toBe('+34 912345678')
      expect(result.country).toBe('Spain')
      expect(result.numGuests).toBe(2)
      expect(result.guestName).toBe('John Smith')
    })

    // Test 19: Case insensitivity
    it('should handle case insensitive field names (lowercase)', () => {
      const description = 'booking id: ABC123\nphone: +34 912345678\nguests: 3'
      const result = parseBookingDescription(description)
      expect(result.bookingId).toBe('ABC123')
      expect(result.phone).toBe('+34 912345678')
      expect(result.numGuests).toBe(3)
    })

    // Test 20: Zero guests edge case
    it('should handle zero guests', () => {
      const description = 'GUESTS: 0'
      const result = parseBookingDescription(description)
      expect(result.numGuests).toBe(0)
    })

    // Test 21: Large guest number
    it('should extract large guest count', () => {
      const description = 'GUESTS: 15'
      const result = parseBookingDescription(description)
      expect(result.numGuests).toBe(15)
    })
  })

  describe('detectSource()', () => {
    // Test 1: Detect Booking.com source
    it('should detect Booking.com source from summary', () => {
      const source = detectSource('Booking.com reservation', undefined)
      expect(source).toBe('booking')
    })

    // Test 2: Detect Booking.com source from description
    it('should detect Booking.com source from description', () => {
      const source = detectSource(undefined, 'This is a booking.com event')
      expect(source).toBe('booking')
    })

    // Test 3: Detect Booking.com source (both fields)
    it('should detect Booking.com source when in both summary and description', () => {
      const source = detectSource('Booking confirmation', 'booking.com details')
      expect(source).toBe('booking')
    })

    // Test 4: Detect Airbnb source
    it('should detect Airbnb source from summary', () => {
      const source = detectSource('Airbnb reservation', undefined)
      expect(source).toBe('airbnb')
    })

    // Test 5: Detect Airbnb source with abbreviation
    it('should detect Airbnb source using ABNB abbreviation', () => {
      const source = detectSource(undefined, 'ABNB event details')
      expect(source).toBe('airbnb')
    })

    // Test 6: Detect Airbnb source from description
    it('should detect Airbnb source from description', () => {
      const source = detectSource(undefined, 'Your Airbnb reservation')
      expect(source).toBe('airbnb')
    })

    // Test 7: Unknown source with empty fields
    it('should return unknown source for empty fields', () => {
      const source = detectSource(undefined, undefined)
      expect(source).toBe('unknown')
    })

    // Test 8: Unknown source with unrelated text
    it('should return unknown source for unrelated text', () => {
      const source = detectSource('Hotel reservation', 'Check-in details')
      expect(source).toBe('unknown')
    })

    // Test 9: Case insensitive detection
    it('should detect Booking source case-insensitively (BOOKING)', () => {
      const source = detectSource('BOOKING confirmation', undefined)
      expect(source).toBe('booking')
    })

    // Test 10: Case insensitive detection for Airbnb
    it('should detect Airbnb source case-insensitively (AIRBNB)', () => {
      const source = detectSource('AIRBNB event', undefined)
      expect(source).toBe('airbnb')
    })

    // Test 11: Booking takes precedence if both mentioned
    it('should return booking when both booking and airbnb mentioned', () => {
      const source = detectSource('Booking confirmation', 'Airbnb details')
      expect(source).toBe('booking')
    })

    // Test 12: Empty strings treated as no data
    it('should return unknown source for empty strings', () => {
      const source = detectSource('', '')
      expect(source).toBe('unknown')
    })
  })
})
