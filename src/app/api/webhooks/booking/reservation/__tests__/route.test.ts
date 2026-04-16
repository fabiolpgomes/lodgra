/**
 * Unit tests for POST /api/webhooks/booking/reservation
 *
 * Tests:
 * - Signature validation
 * - Rate limiting
 * - Payload parsing
 * - Error handling
 * - Response codes
 *
 * REFACTORED (2026-04-05): Cleaned up mock structure
 * Uses jest.mock for rate limiting and signature validation
 */

import { NextRequest } from 'next/server'
import crypto from 'crypto'
import { POST } from '../route'

// Mock environment variables
process.env.BOOKING_WEBHOOK_SECRET = 'test-webhook-secret'

// Mock checkRateLimit
jest.mock('@/lib/rateLimit', () => ({
  checkRateLimit: jest.fn(async (key: string, limit: number, window: number) => {
    // Simulate rate limiting: allow first 5 requests, block 6th
    const callCount = (POST as unknown as { __callCount?: number }).__callCount || 0;
    (POST as unknown as { __callCount?: number }).__callCount = callCount + 1
    return callCount < 5
  }),
}))

// TODO: Re-enable when Booking.com native integration is reactivated
describe.skip('POST /api/webhooks/booking/reservation', () => {
  const SECRET = 'test-webhook-secret'

  const validPayload = {
    event_id: 'evt_123456',
    timestamp: '2026-03-30T12:00:00Z',
    event_type: 'reservation.created' as const,
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

  function createValidSignature(body: string): string {
    const hmac = crypto.createHmac('sha256', SECRET)
    hmac.update(body, 'utf-8')
    return hmac.digest('base64')
  }

  function createMockRequest(
    body: string,
    signature?: string,
    additionalHeaders?: Record<string, string>
  ): NextRequest {
    const headers = new Headers({
      'Content-Type': 'application/json',
      ...additionalHeaders,
    })

    if (signature) {
      headers.set('X-Booking-Signature', signature)
    }

    // Create a readable stream from body
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(body))
        controller.close()
      },
    })

    return new NextRequest(new Request('http://localhost/api/webhooks/booking/reservation', {
      method: 'POST',
      headers,
      body: stream,
    }))
  }

  // ──────────────────────────────────────────────────────────────
  // Signature Validation Tests
  // ──────────────────────────────────────────────────────────────

  it('should reject request with missing X-Booking-Signature header', async () => {
    const bodyStr = JSON.stringify(validPayload)
    const request = createMockRequest(bodyStr)

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('X-Booking-Signature')
  })

  it('should reject request with invalid signature', async () => {
    const bodyStr = JSON.stringify(validPayload)
    const invalidSignature = 'invalid-signature-base64=='
    const request = createMockRequest(bodyStr, invalidSignature)

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Invalid signature')
  })

  it('should reject request with tampered payload', async () => {
    const originalBody = JSON.stringify(validPayload)
    const signature = createValidSignature(originalBody)

    // Create request with original signature but tampered body
    const tamperedPayload = { ...validPayload, event_type: 'reservation.cancelled' }
    const tamperedBody = JSON.stringify(tamperedPayload)

    const request = createMockRequest(tamperedBody, signature)

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Invalid signature')
  })

  // ──────────────────────────────────────────────────────────────
  // Payload Validation Tests
  // ──────────────────────────────────────────────────────────────

  it('should reject empty request body', async () => {
    const bodyStr = ''
    const request = createMockRequest(bodyStr, createValidSignature(bodyStr))

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Empty body')
  })

  it('should reject invalid JSON payload', async () => {
    const bodyStr = 'invalid-json-{{'
    const signature = createValidSignature(bodyStr)
    const request = createMockRequest(bodyStr, signature)

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Invalid payload')
  })

  it('should reject payload with missing event_id', async () => {
    const invalidPayload = { ...validPayload, event_id: undefined }
    const bodyStr = JSON.stringify(invalidPayload)
    const signature = createValidSignature(bodyStr)
    const request = createMockRequest(bodyStr, signature)

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Invalid payload')
  })

  // ──────────────────────────────────────────────────────────────
  // Success Path Tests
  // ──────────────────────────────────────────────────────────────

  it('should return 200 OK for valid request', async () => {
    const bodyStr = JSON.stringify(validPayload)
    const signature = createValidSignature(bodyStr)
    const request = createMockRequest(bodyStr, signature)

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.request_id).toBeDefined()
  })

  it('should return request_id on success', async () => {
    const bodyStr = JSON.stringify(validPayload)
    const signature = createValidSignature(bodyStr)
    const request = createMockRequest(bodyStr, signature)

    const response = await POST(request)
    const data = await response.json()

    expect(data.request_id).toBeDefined()
    expect(typeof data.request_id).toBe('string')
    expect(data.request_id).toHaveLength(36) // UUID format
  })

  // ──────────────────────────────────────────────────────────────
  // Error Handling Tests
  // ──────────────────────────────────────────────────────────────

  it('should handle requests when BOOKING_WEBHOOK_SECRET not configured', async () => {
    const originalSecret = process.env.BOOKING_WEBHOOK_SECRET
    delete process.env.BOOKING_WEBHOOK_SECRET

    const bodyStr = JSON.stringify(validPayload)
    const signature = createValidSignature(bodyStr) // Using old secret
    const request = createMockRequest(bodyStr, signature)

    const response = await POST(request)
    expect(response.status).toBe(500)

    process.env.BOOKING_WEBHOOK_SECRET = originalSecret
  })
})
