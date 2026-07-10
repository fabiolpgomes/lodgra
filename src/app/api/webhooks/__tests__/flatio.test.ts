import { webhookManager } from '@/lib/webhooks/webhook-manager'
import { mapFlatioEventToUpdate } from '@/lib/webhooks/event-mappers'
import crypto from 'crypto'

describe('Flatio Webhook', () => {
  describe('Signature Validation', () => {
    it('should validate correct Flatio signature', () => {
      const secret = 'test_secret'
      process.env.FLATIO_WEBHOOK_SECRET = secret

      const payload = JSON.stringify({ id: 'evt_123', type: 'booking.confirmed' })
      const signature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex')

      const isValid = webhookManager.validateFlatioSignature(payload, signature)
      expect(isValid).toBe(true)
    })

    it('should reject when secret missing', () => {
      process.env.FLATIO_WEBHOOK_SECRET = ''
      const payload = 'some payload'
      const signature = 'any_signature'

      const isValid = webhookManager.validateFlatioSignature(payload, signature)
      expect(isValid).toBe(false)
    })
  })

  describe('Event Mapping', () => {
    it('should map booking.confirmed to status: confirmed', () => {
      const event = {
        type: 'booking.confirmed',
        booking: {
          id: 'flatio_booking_12345',
          startDate: '2026-07-15',
          endDate: '2026-07-18',
          numberOfGuests: 2,
        },
      }

      const updates = mapFlatioEventToUpdate(event)
      expect(updates.status).toBe('confirmed')
      expect(updates.number_of_guests).toBe(2)
    })

    it('should map booking.cancelled to status: cancelled', () => {
      const event = {
        type: 'booking.cancelled',
        booking: { id: 'flatio_booking_12345' },
      }

      const updates = mapFlatioEventToUpdate(event)
      expect(updates.status).toBe('cancelled')
    })

    it('should map booking.modified to status: confirmed', () => {
      const event = {
        type: 'booking.modified',
        booking: { id: 'flatio_booking_12345' },
      }

      const updates = mapFlatioEventToUpdate(event)
      expect(updates.status).toBe('confirmed')
    })

    it('should include guest name and email in update', () => {
      const event = {
        type: 'booking.confirmed',
        booking: {
          id: 'flatio_booking_12345',
          startDate: '2026-07-20',
          endDate: '2026-07-25',
          numberOfGuests: 3,
          guestName: 'Jane Smith',
          guestEmail: 'jane@example.com',
        },
      }

      const updates = mapFlatioEventToUpdate(event)
      expect(updates.check_in).toBe('2026-07-20')
      expect(updates.check_out).toBe('2026-07-25')
      expect(updates.number_of_guests).toBe(3)
      expect(updates.guest_name).toBe('Jane Smith')
      expect(updates.guest_email).toBe('jane@example.com')
    })
  })
})
