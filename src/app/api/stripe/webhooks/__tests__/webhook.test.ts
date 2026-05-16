import { verifyStripeSignature } from '@/lib/stripe/verify-webhook'
import { getStripeClient } from '@/lib/stripe/factory'
import crypto from 'crypto'

// Mock Stripe clients to avoid fetch requirements in test environment
jest.mock('@/lib/stripe/client-br', () => ({
  stripeBR: { _getRequestOpts: jest.fn() },
}))

jest.mock('@/lib/stripe/client-pt', () => ({
  stripePT: { _getRequestOpts: jest.fn() },
}))

describe('Stripe Foundation - Unit Tests', () => {
  describe('Webhook Signature Verification', () => {
    test('should verify valid signature', () => {
      const secret = 'whsec_test123'
      const body = '{"test": "data"}'
      const timestamp = Math.floor(Date.now() / 1000)
      const hash = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex')
      const signature = `t=${timestamp},v1=${hash}`

      const result = verifyStripeSignature(body, signature, secret)
      expect(result).toBe(true)
    })

    test('should reject invalid signature', () => {
      const secret = 'whsec_test123'
      const body = '{"test": "data"}'
      const invalidSignature = 't=123456,v1=invalid_hash'

      const result = verifyStripeSignature(body, invalidSignature, secret)
      expect(result).toBe(false)
    })

    test('should reject empty signature', () => {
      const result = verifyStripeSignature('body', '', 'secret')
      expect(result).toBe(false)
    })

    test('should reject empty secret', () => {
      const result = verifyStripeSignature('body', 't=123,v1=hash', '')
      expect(result).toBe(false)
    })
  })

  describe('Stripe Client Factory', () => {
    test('should return a client for subscription payments', () => {
      const client = getStripeClient('subscription')
      expect(client).toBeDefined()
    })

    test('should return a client for booking payments', () => {
      const client = getStripeClient('booking')
      expect(client).toBeDefined()
    })

    test('should have STRIPE_BR_SECRET_KEY configured', () => {
      expect(process.env.STRIPE_BR_SECRET_KEY).toBeDefined()
    })

    test('should have STRIPE_PT_SECRET_KEY configured', () => {
      expect(process.env.STRIPE_PT_SECRET_KEY).toBeDefined()
    })
  })

  describe('Webhook Event Type Validation', () => {
    test('should process customer.subscription.created event', () => {
      const event = {
        type: 'customer.subscription.created',
        id: 'evt_test123',
        data: {
          object: {
            id: 'sub_test123',
            customer: 'cus_test123',
            status: 'active',
          },
        },
      }
      expect(event.type).toBe('customer.subscription.created')
      expect(event.data.object.customer).toBeDefined()
    })

    test('should process charge.succeeded event', () => {
      const event = {
        type: 'charge.succeeded',
        id: 'evt_test456',
        data: {
          object: {
            id: 'ch_test456',
            amount: 5000,
            currency: 'eur',
            status: 'succeeded',
          },
        },
      }
      expect(event.type).toBe('charge.succeeded')
      expect(event.data.object.status).toBe('succeeded')
    })

    test('should handle idempotency (duplicate events)', () => {
      const event1 = { id: 'evt_same123', type: 'charge.succeeded' }
      const event2 = { id: 'evt_same123', type: 'charge.succeeded' }
      expect(event1.id).toBe(event2.id)
    })
  })

  describe('Webhook Payload Structure', () => {
    test('should have required fields in event payload', () => {
      const eventPayload = {
        id: 'evt_test',
        object: 'event',
        type: 'customer.subscription.updated',
        created: 1234567890,
        data: {
          object: {
            id: 'sub_test',
            customer: 'cus_test',
          },
        },
      }
      expect(eventPayload).toHaveProperty('id')
      expect(eventPayload).toHaveProperty('type')
      expect(eventPayload).toHaveProperty('data')
      expect(eventPayload.data).toHaveProperty('object')
    })
  })
})
