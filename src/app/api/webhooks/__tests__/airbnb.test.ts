import { webhookManager } from '@/lib/webhooks/webhook-manager'
import { mapAirbnbEventToUpdate } from '@/lib/webhooks/event-mappers'
import crypto from 'crypto'

describe('Airbnb Webhook', () => {
  describe('Signature Validation', () => {
    it('should validate correct Airbnb signature', () => {
      const secret = 'test_secret'
      process.env.AIRBNB_WEBHOOK_SECRET = secret

      const payload = JSON.stringify({ id: 'evt_123', event_type: 'RESERVATION_ACCEPTED' })
      const signature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('base64')

      const isValid = webhookManager.validateAirbnbSignature(payload, signature)
      expect(isValid).toBe(true)
    })

    it('should reject invalid Airbnb signature', () => {
      process.env.AIRBNB_WEBHOOK_SECRET = 'test_secret'
      const payload = 'some payload'
      const invalidSignature = 'invalid_signature_base64'

      const isValid = webhookManager.validateAirbnbSignature(payload, invalidSignature)
      expect(isValid).toBe(false)
    })
  })

  describe('Event Mapping', () => {
    it('should map RESERVATION_ACCEPTED to status: confirmed', () => {
      const event = {
        event_type: 'RESERVATION_ACCEPTED',
        data: {
          reservation: {
            reservation_id: '87654321',
            check_in_date: '2026-07-15',
            check_out_date: '2026-07-18',
            number_of_guests: 2,
          },
        },
      }

      const updates = mapAirbnbEventToUpdate(event)
      expect(updates.status).toBe('confirmed')
      expect(updates.number_of_guests).toBe(2)
    })

    it('should map RESERVATION_CANCELLED to status: cancelled', () => {
      const event = {
        event_type: 'RESERVATION_CANCELLED',
        data: {
          reservation: { reservation_id: '87654321' },
        },
      }

      const updates = mapAirbnbEventToUpdate(event)
      expect(updates.status).toBe('cancelled')
    })

    it('should map RESERVATION_PREAPPROVED to status: pending', () => {
      const event = {
        event_type: 'RESERVATION_PREAPPROVED',
        data: {
          reservation: { reservation_id: '87654321' },
        },
      }

      const updates = mapAirbnbEventToUpdate(event)
      expect(updates.status).toBe('pending')
    })

    it('should include guest name and email in update', () => {
      const event = {
        event_type: 'RESERVATION_ACCEPTED',
        data: {
          reservation: {
            reservation_id: '87654321',
            guest: {
              first_name: 'Jane',
              last_name: 'Smith',
              email: 'jane@example.com',
              phone: '+1-555-9876',
            },
          },
        },
      }

      const updates = mapAirbnbEventToUpdate(event)
      expect(updates.guest_name).toBe('Jane Smith')
      expect(updates.guest_email).toBe('jane@example.com')
      expect(updates.guest_phone).toBe('+1-555-9876')
    })
  })
})
