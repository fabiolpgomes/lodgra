import { webhookManager } from '@/lib/webhooks/webhook-manager'
import { mapBookingEventToUpdate } from '@/lib/webhooks/event-mappers'
import crypto from 'crypto'

describe('Booking Webhook', () => {
  describe('Signature Validation', () => {
    it('should validate correct HMAC signature', () => {
      const secret = 'test_secret'
      process.env.BOOKING_WEBHOOK_SECRET = secret

      const payload = JSON.stringify({ id: '123', event_type: 'reservation_confirmed' })
      const signature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex')

      const isValid = webhookManager.validateBookingSignature(payload, signature)
      expect(isValid).toBe(true)
    })

    it('should reject signature when secret missing', () => {
      process.env.BOOKING_WEBHOOK_SECRET = ''
      const payload = 'some payload'
      const signature = 'any_signature'

      const isValid = webhookManager.validateBookingSignature(payload, signature)
      expect(isValid).toBe(false)
    })
  })

  describe('Event Mapping', () => {
    it('should map reservation_confirmed to status: confirmed', () => {
      const event = {
        event_type: 'reservation_confirmed',
        reservation: {
          id: '6816972454',
          check_in: '2026-07-15',
          check_out: '2026-07-18',
          guests: 2,
        },
      }

      const updates = mapBookingEventToUpdate(event)
      expect(updates.status).toBe('confirmed')
      expect(updates.number_of_guests).toBe(2)
    })

    it('should map reservation_cancelled to status: cancelled', () => {
      const event = {
        event_type: 'reservation_cancelled',
        reservation: { id: '6816972454' },
      }

      const updates = mapBookingEventToUpdate(event)
      expect(updates.status).toBe('cancelled')
    })

    it('should map reservation_completed to status: completed', () => {
      const event = {
        event_type: 'reservation_completed',
        reservation: { id: '6816972454' },
      }

      const updates = mapBookingEventToUpdate(event)
      expect(updates.status).toBe('completed')
    })

    it('should include check-in/check-out dates in update', () => {
      const event = {
        event_type: 'reservation_changed',
        reservation: {
          id: '6816972454',
          check_in: '2026-07-20',
          check_out: '2026-07-25',
          guests: 3,
        },
      }

      const updates = mapBookingEventToUpdate(event)
      expect(updates.check_in).toBe('2026-07-20')
      expect(updates.check_out).toBe('2026-07-25')
      expect(updates.number_of_guests).toBe(3)
    })
  })
})
