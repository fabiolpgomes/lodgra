import { classifyICalEvent, isBlockedEvent } from '../icalService'

describe('isBlockedEvent - Platform-Specific Logic', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // BOOKING.COM TESTS
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Booking.com events', () => {
    it('returns false for Booking.com RESERVATION with BOOKING ID field', () => {
      expect(
        classifyICalEvent({
          uid: 'abc123@booking.com',
          summary: 'CLOSED - Not available',
          description: 'BOOKING ID: 12345678\nPHONE: +34 912345678\nCOUNTRY: Spain\nGUESTS: 2',
        })
      ).toBe('reservation')
      expect(
        isBlockedEvent({
          uid: 'abc123@booking.com',
          summary: 'CLOSED - Not available',
          description: 'BOOKING ID: 12345678\nPHONE: +34 912345678\nCOUNTRY: Spain\nGUESTS: 2',
        })
      ).toBe(false)  // Is reservation (has structured booking data)
    })

    it('returns true for Booking.com event without BOOKING ID, even with guest data', () => {
      expect(
        classifyICalEvent({
          uid: 'xyz789@booking.com',
          summary: 'CLOSED - Not available',
          description: 'PHONE: +34 912345678\nCOUNTRY: Spain\nGUESTS: 2',
        })
      ).toBe('block')
      expect(
        isBlockedEvent({
          uid: 'xyz789@booking.com',
          summary: 'CLOSED - Not available',
          description: 'PHONE: +34 912345678\nCOUNTRY: Spain\nGUESTS: 2',
        })
      ).toBe(true)  // Is block because no reservation number
    })

    it('returns true for Booking.com BLOCK with generic description', () => {
      expect(
        isBlockedEvent({
          uid: 'block123@booking.com',
          summary: 'CLOSED - Not available',
          description: 'Booking',
        })
      ).toBe(true)  // Is block
    })

    it('returns true for Booking.com BLOCK with empty description', () => {
      expect(
        isBlockedEvent({
          uid: 'block456@booking.com',
          summary: 'CLOSED - Not available',
          description: '',
        })
      ).toBe(true)  // Is block
    })

    it('returns true for Booking.com BLOCK with no description', () => {
      expect(
        isBlockedEvent({
          uid: 'block789@booking.com',
          summary: 'CLOSED - Not available',
        })
      ).toBe(true)  // Is block
    })

    it('returns reservation for Booking.com event identified by numeric uid', () => {
      expect(
        classifyICalEvent({
          uid: 'booking_5311280284@booking.com',
          summary: 'Reserved',
          description: '',
        })
      ).toBe('reservation')
      expect(
        isBlockedEvent({
          uid: 'booking_5311280284@booking.com',
          summary: 'Reserved',
          description: '',
        })
      ).toBe(false)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // AIRBNB TESTS
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Airbnb events', () => {
    it('returns false for Airbnb RESERVATION with "Reserved" summary', () => {
      expect(
        isBlockedEvent({
          uid: 'airbnb-abc@airbnb.com',
          summary: 'Reserved',
          description: 'Some guest details',
        })
      ).toBe(false)  // Is reservation
    })

    it('returns false for Airbnb RESERVATION with guest name', () => {
      expect(
        isBlockedEvent({
          uid: 'airbnb-xyz@airbnb.com',
          summary: 'João Silva',
          description: 'Guest information',
        })
      ).toBe(false)  // Is reservation
    })

    it('returns true for Airbnb BLOCK with "Not available"', () => {
      expect(
        isBlockedEvent({
          uid: 'airbnb-block1@airbnb.com',
          summary: 'Airbnb (Not available)',
          description: 'Airbnb',
        })
      ).toBe(true)  // Is block
    })

    it('returns true for Airbnb BLOCK with generic description', () => {
      expect(
        isBlockedEvent({
          uid: 'airbnb-block2@airbnb.com',
          summary: 'Not available',
          description: 'Airbnb',
        })
      ).toBe(true)  // Is block
    })

    it('returns true for Airbnb BLOCK with no description', () => {
      expect(
        isBlockedEvent({
          uid: 'airbnb-block3@airbnb.com',
          summary: 'Airbnb (Not available)',
          description: '',
        })
      ).toBe(true)  // Is block
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // FLATIO TESTS
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Flatio events', () => {
    it('returns false for Flatio RESERVATION with guest data', () => {
      expect(
        isBlockedEvent({
          uid: 'flatio-xyz@flatio.com',
          summary: 'CLOSED',
          description: 'GUEST: João Silva\nPHONE: +34 912345678',
        })
      ).toBe(false)  // Is reservation (has guest data)
    })

    it('returns true for Flatio BLOCK with generic description', () => {
      expect(
        isBlockedEvent({
          uid: 'flatio-block@flatio.com',
          summary: 'CLOSED',
          description: 'Flatio',
        })
      ).toBe(true)  // Is block
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // VRBO / EXPEDIA TESTS
  // ═══════════════════════════════════════════════════════════════════════════
  describe('VRBO/Expedia events', () => {
    it('returns false for VRBO "Reserved"', () => {
      expect(
        isBlockedEvent({
          uid: 'vrbo-xyz',
          summary: 'Reserved',
          description: 'Booking info',
        })
      ).toBe(false)  // Is reservation
    })

    it('returns true for VRBO "Not available"', () => {
      expect(
        isBlockedEvent({
          uid: 'vrbo-block',
          summary: 'Not available',
          description: 'Unavailable',
        })
      ).toBe(true)  // Is block
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // GENERIC TESTS (Unknown platforms)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Generic/Unknown platforms', () => {
    it('returns unknown for empty summary', () => {
      expect(classifyICalEvent({ summary: '' })).toBe('unknown')
      expect(isBlockedEvent({ summary: '' })).toBe(false)
    })

    it('returns unknown when summary is missing', () => {
      expect(classifyICalEvent({})).toBe('unknown')
      expect(isBlockedEvent({})).toBe(false)
    })

    it('returns unknown for numeric-only summary', () => {
      expect(classifyICalEvent({ summary: '12345' })).toBe('unknown')
      expect(isBlockedEvent({ summary: '12345' })).toBe(false)
    })

    it('returns true for TRANSP:TRANSPARENT', () => {
      const mockComponent = {
        getFirstPropertyValue: (prop: string) => prop === 'transp' ? 'TRANSPARENT' : null,
      }
      expect(isBlockedEvent({ summary: 'Some Event', component: mockComponent })).toBe(true)
    })

    it('returns reservation for TRANSP:OPAQUE with guest name', () => {
      const mockComponent = {
        getFirstPropertyValue: (prop: string) => prop === 'transp' ? 'OPAQUE' : null,
      }
      expect(classifyICalEvent({ summary: 'João Silva', component: mockComponent })).toBe('reservation')
      expect(isBlockedEvent({ summary: 'João Silva', component: mockComponent })).toBe(false)
    })

    it('returns true for "blocked" keyword', () => {
      expect(isBlockedEvent({ summary: 'Blocked', description: 'Owner block' })).toBe(true)
    })

    it('returns true for "fechado" keyword', () => {
      expect(isBlockedEvent({ summary: 'Fechado', description: 'Propriedade fechada' })).toBe(true)
    })

    it('returns true when maintenance keyword in description', () => {
      expect(isBlockedEvent({ summary: 'Unavailable', description: 'maintenance period' })).toBe(true)
    })

    it('returns reservation for valid guest name', () => {
      expect(classifyICalEvent({ summary: 'João Silva' })).toBe('reservation')
      expect(isBlockedEvent({ summary: 'João Silva' })).toBe(false)
    })
  })
})
