import { webhookManager } from '@/lib/webhooks/webhook-manager'
import { mapVrboEventToUpdate } from '@/lib/webhooks/event-mappers'
import crypto from 'crypto'

describe('VRBO Webhook', () => {
  describe('Signature Validation', () => {
    it('should validate correct VRBO signature', () => {
      const secret = 'test_secret'
      process.env.VRBO_WEBHOOK_SECRET = secret

      const payload = JSON.stringify({ id: 'evt_123', eventType: 'RESERVATION_CREATE' })
      const signature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex')

      const isValid = webhookManager.validateVrboSignature(payload, signature)
      expect(isValid).toBe(true)
    })

    it('should reject when secret missing', () => {
      process.env.VRBO_WEBHOOK_SECRET = ''
      const payload = 'some payload'
      const signature = 'any_signature'

      const isValid = webhookManager.validateVrboSignature(payload, signature)
      expect(isValid).toBe(false)
    })
  })

  describe('Event Mapping', () => {
    it('should map RESERVATION_CREATE to status: confirmed', () => {
      const event = {
        eventType: 'RESERVATION_CREATE',
        reservation: {
          id: 'exp_res_987654',
          checkInDate: '2026-07-15',
          checkOutDate: '2026-07-18',
          numberOfGuests: 2,
        },
      }

      const updates = mapVrboEventToUpdate(event)
      expect(updates.status).toBe('confirmed')
      expect(updates.number_of_guests).toBe(2)
    })

    it('should map RESERVATION_CANCEL to status: cancelled', () => {
      const event = {
        eventType: 'RESERVATION_CANCEL',
        reservation: { id: 'exp_res_987654' },
      }

      const updates = mapVrboEventToUpdate(event)
      expect(updates.status).toBe('cancelled')
    })

    it('should map RESERVATION_MODIFY to status: confirmed', () => {
      const event = {
        eventType: 'RESERVATION_MODIFY',
        reservation: { id: 'exp_res_987654' },
      }

      const updates = mapVrboEventToUpdate(event)
      expect(updates.status).toBe('confirmed')
    })

    it('should include check-in/check-out dates in update', () => {
      const event = {
        eventType: 'RESERVATION_CREATE',
        reservation: {
          id: 'exp_res_987654',
          checkInDate: '2026-07-20',
          checkOutDate: '2026-07-25',
          numberOfGuests: 3,
          guestName: 'John Doe',
          guestPhone: '+1-555-0123',
        },
      }

      const updates = mapVrboEventToUpdate(event)
      expect(updates.check_in).toBe('2026-07-20')
      expect(updates.check_out).toBe('2026-07-25')
      expect(updates.number_of_guests).toBe(3)
      expect(updates.guest_name).toBe('John Doe')
      expect(updates.guest_phone).toBe('+1-555-0123')
    })
  })
})
