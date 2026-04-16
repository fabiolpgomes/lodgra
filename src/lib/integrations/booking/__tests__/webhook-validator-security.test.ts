/**
 * Security tests for webhook validator
 *
 * Tests:
 * - Input validation (dates, amounts, string lengths)
 * - Email format validation
 * - Date format and logic validation
 * - Amount range validation
 * - Number of guests validation
 * - Currency validation
 * - DoS prevention (max string lengths)
 */

import { parseBookingWebhookPayload } from '../webhook-validator'
import type { BookingWebhookPayload } from '../webhook-validator'

describe('Webhook Validator - Security Tests', () => {
  const validPayload: BookingWebhookPayload = {
    event_id: 'evt_123456',
    timestamp: '2026-03-31T12:00:00Z',
    event_type: 'reservation.created',
    data: {
      reservation: {
        id: 'res_987654',
        property_id: 'prop_12345',
        guest: {
          name: 'João Silva',
          email: 'joao@booking.local',
        },
        check_in: '2026-04-01',
        check_out: '2026-04-05',
        number_of_guests: 2,
        status: 'CONFIRMED',
        total_price: {
          currency: 'EUR',
          amount: 500.0,
        },
        created_at: '2026-03-31T12:00:00Z',
        updated_at: '2026-03-31T12:00:00Z',
      },
    },
  }

  describe('Date Validation', () => {
    it('should reject invalid check_in date format', () => {
      const payload = JSON.parse(JSON.stringify(validPayload))
      payload.data.reservation.check_in = '2026-4-1' // Missing leading zero
      expect(() => parseBookingWebhookPayload(payload)).toThrow('check_in not in YYYY-MM-DD format')
    })

    it('should reject invalid check_out date format', () => {
      const payload = JSON.parse(JSON.stringify(validPayload))
      payload.data.reservation.check_out = '01-04-2026' // Wrong format
      expect(() => parseBookingWebhookPayload(payload)).toThrow('check_out not in YYYY-MM-DD format')
    })

    it('should reject check_out before check_in', () => {
      const payload = JSON.parse(JSON.stringify(validPayload))
      payload.data.reservation.check_in = '2026-04-05'
      payload.data.reservation.check_out = '2026-04-01'
      expect(() => parseBookingWebhookPayload(payload)).toThrow('check_out must be after check_in')
    })

    it('should reject check_out equal to check_in', () => {
      const payload = JSON.parse(JSON.stringify(validPayload))
      payload.data.reservation.check_in = '2026-04-01'
      payload.data.reservation.check_out = '2026-04-01'
      expect(() => parseBookingWebhookPayload(payload)).toThrow('check_out must be after check_in')
    })

    it('should accept valid date format', () => {
      const payload = JSON.parse(JSON.stringify(validPayload))
      expect(() => parseBookingWebhookPayload(payload)).not.toThrow()
    })
  })

  describe('Amount Validation', () => {
    it('should reject negative amount', () => {
      const payload = JSON.parse(JSON.stringify(validPayload))
      payload.data.reservation.total_price.amount = -100
      expect(() => parseBookingWebhookPayload(payload)).toThrow('must be between 0.01 and 999,999.99')
    })

    it('should reject zero amount', () => {
      const payload = JSON.parse(JSON.stringify(validPayload))
      payload.data.reservation.total_price.amount = 0
      expect(() => parseBookingWebhookPayload(payload)).toThrow('must be between 0.01 and 999,999.99')
    })

    it('should reject excessive amount', () => {
      const payload = JSON.parse(JSON.stringify(validPayload))
      payload.data.reservation.total_price.amount = 1_000_001
      expect(() => parseBookingWebhookPayload(payload)).toThrow('must be between 0.01 and 999,999.99')
    })

    it('should accept valid amount', () => {
      const payload = JSON.parse(JSON.stringify(validPayload))
      payload.data.reservation.total_price.amount = 99.99
      expect(() => parseBookingWebhookPayload(payload)).not.toThrow()
    })
  })

  describe('Number of Guests Validation', () => {
    it('should reject zero guests', () => {
      const payload = JSON.parse(JSON.stringify(validPayload))
      payload.data.reservation.number_of_guests = 0
      expect(() => parseBookingWebhookPayload(payload)).toThrow('must be between 1 and 100')
    })

    it('should reject negative guests', () => {
      const payload = JSON.parse(JSON.stringify(validPayload))
      payload.data.reservation.number_of_guests = -1
      expect(() => parseBookingWebhookPayload(payload)).toThrow('must be between 1 and 100')
    })

    it('should reject excessive guests', () => {
      const payload = JSON.parse(JSON.stringify(validPayload))
      payload.data.reservation.number_of_guests = 101
      expect(() => parseBookingWebhookPayload(payload)).toThrow('must be between 1 and 100')
    })

    it('should reject fractional guests', () => {
      const payload = JSON.parse(JSON.stringify(validPayload))
      payload.data.reservation.number_of_guests = 2.5
      expect(() => parseBookingWebhookPayload(payload)).toThrow('must be between 1 and 100')
    })

    it('should accept valid guest count', () => {
      const payload = JSON.parse(JSON.stringify(validPayload))
      payload.data.reservation.number_of_guests = 5
      expect(() => parseBookingWebhookPayload(payload)).not.toThrow()
    })
  })

  describe('Email Validation', () => {
    it('should reject invalid email format', () => {
      const payload = JSON.parse(JSON.stringify(validPayload))
      payload.data.reservation.guest.email = 'not-an-email'
      expect(() => parseBookingWebhookPayload(payload)).toThrow('guest.email format invalid')
    })

    it('should reject email without domain', () => {
      const payload = JSON.parse(JSON.stringify(validPayload))
      payload.data.reservation.guest.email = 'joao@'
      expect(() => parseBookingWebhookPayload(payload)).toThrow('guest.email format invalid')
    })

    it('should accept valid email', () => {
      const payload = JSON.parse(JSON.stringify(validPayload))
      payload.data.reservation.guest.email = 'valid.email+tag@booking.com'
      expect(() => parseBookingWebhookPayload(payload)).not.toThrow()
    })

    it('should accept missing email (optional)', () => {
      const payload = JSON.parse(JSON.stringify(validPayload))
      delete payload.data.reservation.guest.email
      expect(() => parseBookingWebhookPayload(payload)).not.toThrow()
    })
  })

  describe('Guest Name Validation', () => {
    it('should reject empty guest name', () => {
      const payload = JSON.parse(JSON.stringify(validPayload))
      payload.data.reservation.guest.name = ''
      // Empty string is caught by falsy check, not length check
      expect(() => parseBookingWebhookPayload(payload)).toThrow('missing guest.name')
    })

    it('should reject guest name exceeding 255 chars', () => {
      const payload = JSON.parse(JSON.stringify(validPayload))
      payload.data.reservation.guest.name = 'a'.repeat(256)
      expect(() => parseBookingWebhookPayload(payload)).toThrow('guest.name must be 1-255 characters')
    })

    it('should accept valid guest name', () => {
      const payload = JSON.parse(JSON.stringify(validPayload))
      payload.data.reservation.guest.name = 'Joãozinho Silva Santos'
      expect(() => parseBookingWebhookPayload(payload)).not.toThrow()
    })
  })

  describe('Currency Validation', () => {
    it('should reject invalid currency code', () => {
      const payload = JSON.parse(JSON.stringify(validPayload))
      payload.data.reservation.total_price.currency = 'EURO'
      expect(() => parseBookingWebhookPayload(payload)).toThrow('currency must be 3-letter ISO code')
    })

    it('should reject lowercase currency', () => {
      const payload = JSON.parse(JSON.stringify(validPayload))
      payload.data.reservation.total_price.currency = 'eur'
      expect(() => parseBookingWebhookPayload(payload)).toThrow('currency must be 3-letter ISO code')
    })

    it('should accept valid currency code', () => {
      const payload = JSON.parse(JSON.stringify(validPayload))
      payload.data.reservation.total_price.currency = 'USD'
      expect(() => parseBookingWebhookPayload(payload)).not.toThrow()
    })
  })

  describe('DoS Prevention - String Lengths', () => {
    it('should reject excessively long property_id', () => {
      const payload = JSON.parse(JSON.stringify(validPayload))
      payload.data.reservation.property_id = 'p'.repeat(101)
      expect(() => parseBookingWebhookPayload(payload)).toThrow('property_id must be 1-100 characters')
    })

    it('should reject empty property_id', () => {
      const payload = JSON.parse(JSON.stringify(validPayload))
      payload.data.reservation.property_id = ''
      expect(() => parseBookingWebhookPayload(payload)).toThrow('property_id must be 1-100 characters')
    })

    it('should reject excessively long reservation_id', () => {
      const payload = JSON.parse(JSON.stringify(validPayload))
      payload.data.reservation.id = 'r'.repeat(101)
      expect(() => parseBookingWebhookPayload(payload)).toThrow('reservation.id must be 1-100 characters')
    })

    it('should accept valid length IDs', () => {
      const payload = JSON.parse(JSON.stringify(validPayload))
      payload.data.reservation.id = 'res_' + 'x'.repeat(50)
      payload.data.reservation.property_id = 'prop_' + 'y'.repeat(50)
      expect(() => parseBookingWebhookPayload(payload)).not.toThrow()
    })
  })
})
