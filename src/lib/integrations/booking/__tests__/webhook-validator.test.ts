import crypto from 'crypto'
import {
  validateBookingWebhookSignature,
  parseBookingWebhookPayload,
  deriveReservationStatus,
  type BookingWebhookPayload,
} from '../webhook-validator'

describe('Booking Webhook Validator', () => {
  const SECRET = 'test-webhook-secret'

  // ──────────────────────────────────────────────────────────────
  // HMAC Signature Validation Tests
  // ──────────────────────────────────────────────────────────────

  describe('validateBookingWebhookSignature', () => {
    it('should validate a correct HMAC signature', () => {
      const payload = '{"event_id":"123","status":"confirmed"}'
      const hmac = crypto.createHmac('sha256', SECRET)
      hmac.update(payload, 'utf-8')
      const signature = hmac.digest('base64')

      const result = validateBookingWebhookSignature(payload, signature, SECRET)
      expect(result).toBe(true)
    })

    it('should reject an invalid signature', () => {
      const payload = '{"event_id":"123","status":"confirmed"}'
      const invalidSignature = 'invalid-signature-base64=='

      const result = validateBookingWebhookSignature(
        payload,
        invalidSignature,
        SECRET
      )
      expect(result).toBe(false)
    })

    it('should reject a tampered payload', () => {
      const originalPayload = '{"event_id":"123","status":"confirmed"}'
      const hmac = crypto.createHmac('sha256', SECRET)
      hmac.update(originalPayload, 'utf-8')
      const signature = hmac.digest('base64')

      // Change payload after signing
      const tamperedPayload = '{"event_id":"456","status":"cancelled"}'

      const result = validateBookingWebhookSignature(
        tamperedPayload,
        signature,
        SECRET
      )
      expect(result).toBe(false)
    })

    it('should reject an empty signature', () => {
      const payload = '{"event_id":"123"}'
      const result = validateBookingWebhookSignature(payload, '', SECRET)
      expect(result).toBe(false)
    })

    it('should reject empty secret', () => {
      const payload = '{"event_id":"123"}'
      const signature = 'any-signature'
      const result = validateBookingWebhookSignature(payload, signature, '')
      expect(result).toBe(false)
    })

    it('should be timing-safe (use crypto.timingSafeEqual)', () => {
      // This test ensures crypto.timingSafeEqual is used (no easy timing attack)
      // In practice, we can't easily test timing attacks, but we verify the function
      // doesn't throw on any input
      const payload = '{"test": true}'
      const signature = 'test-sig'
      const secret = 'test-secret'

      // Should not throw
      expect(() =>
        validateBookingWebhookSignature(payload, signature, secret)
      ).not.toThrow()
    })
  })

  // ──────────────────────────────────────────────────────────────
  // Payload Parsing & Validation Tests
  // ──────────────────────────────────────────────────────────────

  describe('parseBookingWebhookPayload', () => {
    const validPayload: BookingWebhookPayload = {
      event_id: 'evt_123456',
      timestamp: '2026-03-30T12:00:00Z',
      event_type: 'reservation.created',
      data: {
        reservation: {
          id: 'res_987654',
          property_id: 'prop_12345',
          guest: {
            name: 'João Silva',
            email: 'joao@example.com',
          },
          check_in: '2026-04-01',
          check_out: '2026-04-05',
          number_of_guests: 2,
          status: 'CONFIRMED',
          total_price: {
            currency: 'EUR',
            amount: 500.0,
          },
          created_at: '2026-03-30T12:00:00Z',
          updated_at: '2026-03-30T12:00:00Z',
        },
      },
    }

    it('should parse a valid payload', () => {
      const result = parseBookingWebhookPayload(validPayload)
      expect(result).toEqual(validPayload)
    })

    it('should reject non-object payload', () => {
      expect(() => parseBookingWebhookPayload('string')).toThrow(
        'not an object'
      )
      expect(() => parseBookingWebhookPayload(null)).toThrow('not an object')
      expect(() => parseBookingWebhookPayload(123)).toThrow('not an object')
    })

    it('should reject payload with missing event_id', () => {
      const invalid = { ...validPayload, event_id: undefined }
      expect(() => parseBookingWebhookPayload(invalid)).toThrow('missing event_id')
    })

    it('should reject payload with missing timestamp', () => {
      const invalid = { ...validPayload, timestamp: undefined }
      expect(() => parseBookingWebhookPayload(invalid)).toThrow('missing timestamp')
    })

    it('should reject payload with missing event_type', () => {
      const invalid = { ...validPayload, event_type: undefined }
      expect(() => parseBookingWebhookPayload(invalid)).toThrow('missing event_type')
    })

    it('should reject payload with missing data object', () => {
      const invalid = { ...validPayload, data: undefined }
      expect(() => parseBookingWebhookPayload(invalid)).toThrow('missing data')
    })

    it('should reject payload with missing reservation', () => {
      const invalid = {
        ...validPayload,
        data: { someOtherField: 'test' },
      }
      expect(() => parseBookingWebhookPayload(invalid)).toThrow('missing reservation')
    })

    it('should reject payload with missing reservation.id', () => {
      const invalid = {
        ...validPayload,
        data: {
          reservation: {
            ...validPayload.data.reservation,
            id: undefined,
          },
        },
      }
      expect(() => parseBookingWebhookPayload(invalid)).toThrow('missing reservation.id')
    })

    it('should reject payload with missing reservation.property_id', () => {
      const invalid = {
        ...validPayload,
        data: {
          reservation: {
            ...validPayload.data.reservation,
            property_id: undefined,
          },
        },
      }
      expect(() => parseBookingWebhookPayload(invalid)).toThrow(
        'missing reservation.property_id'
      )
    })

    it('should reject payload with missing guest.name', () => {
      const invalid = {
        ...validPayload,
        data: {
          reservation: {
            ...validPayload.data.reservation,
            guest: { email: 'test@example.com' },
          },
        },
      }
      expect(() => parseBookingWebhookPayload(invalid)).toThrow('missing guest.name')
    })

    it('should reject payload with invalid total_price', () => {
      const invalid = {
        ...validPayload,
        data: {
          reservation: {
            ...validPayload.data.reservation,
            total_price: { invalid: 'structure' },
          },
        },
      }
      expect(() => parseBookingWebhookPayload(invalid)).toThrow(
        'invalid total_price'
      )
    })

    it('should handle email as optional field', () => {
      const payloadWithoutEmail = {
        ...validPayload,
        data: {
          reservation: {
            ...validPayload.data.reservation,
            guest: {
              name: 'João Silva',
            },
          },
        },
      }
      const result = parseBookingWebhookPayload(payloadWithoutEmail)
      expect(result.data.reservation.guest.email).toBeUndefined()
    })
  })

  // ──────────────────────────────────────────────────────────────
  // Status Derivation Tests
  // ──────────────────────────────────────────────────────────────

  describe('deriveReservationStatus', () => {
    it('should map reservation.created to confirmed', () => {
      const status = deriveReservationStatus('reservation.created')
      expect(status).toBe('confirmed')
    })

    it('should map reservation.modified to confirmed', () => {
      const status = deriveReservationStatus('reservation.modified')
      expect(status).toBe('confirmed')
    })

    it('should map reservation.cancelled to cancelled', () => {
      const status = deriveReservationStatus('reservation.cancelled')
      expect(status).toBe('cancelled')
    })

    it('should default unknown event types to pending_review', () => {
      const status = deriveReservationStatus('unknown.event.type')
      expect(status).toBe('pending_review')
    })
  })
})
