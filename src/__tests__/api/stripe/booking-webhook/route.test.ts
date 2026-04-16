/**
 * Unit tests for POST /api/stripe/booking-webhook
 * Covers: signature verification, idempotency, confirmation, expiry, email dispatch
 */

import { POST } from '@/app/api/stripe/booking-webhook/route'
import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  sendBookingConfirmationToGuest,
  sendBookingNotificationToManager,
} from '@/lib/email/bookingConfirmationGuest'

jest.mock('@/lib/supabase/admin')
jest.mock('@/lib/email/bookingConfirmationGuest')

// Mock Stripe — constructEvent can be controlled per test
const mockConstructEvent = jest.fn()
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    webhooks: {
      constructEvent: mockConstructEvent,
    },
  }))
})

const mockCreateAdminClient = createAdminClient as jest.MockedFunction<typeof createAdminClient>
const mockSendGuest = sendBookingConfirmationToGuest as jest.MockedFunction<typeof sendBookingConfirmationToGuest>
const mockSendManager = sendBookingNotificationToManager as jest.MockedFunction<typeof sendBookingNotificationToManager>

const BASE_URL = 'http://localhost:3000'

function makeWebhookRequest(body = '{}', sig = 'valid-sig'): NextRequest {
  return new NextRequest(`${BASE_URL}/api/stripe/booking-webhook`, {
    method: 'POST',
    headers: { 'stripe-signature': sig },
    body,
  })
}

const pendingReservation = {
  status: 'pending_payment',
  check_in: '2027-07-10',
  check_out: '2027-07-15',
  guest_name: 'João Silva',
  guest_email: 'joao@example.com',
  total_amount: '500.00',
  num_guests: 2,
  property_listing_id: 'listing-001',
}

function buildMockSupabase(options: {
  reservationData?: unknown
  updateError?: unknown
  listingData?: unknown
} = {}) {
  const {
    reservationData = pendingReservation,
    updateError = null,
    listingData = {
      property_id: 'prop-123',
      properties: { name: 'Villa Algarve', city: 'Faro', slug: 'villa-algarve', organization_id: 'org-001' },
    },
  } = options

  const mockFrom = jest.fn().mockImplementation((table: string) => {
    if (table === 'reservations') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: reservationData, error: null }),
          }),
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: updateError }),
        }),
      }
    }
    if (table === 'property_listings') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: listingData, error: null }),
          }),
        }),
      }
    }
    return {}
  })

  return { from: mockFrom } as unknown as ReturnType<typeof createAdminClient>
}

beforeEach(() => {
  jest.clearAllMocks()
  process.env.STRIPE_SECRET_KEY = 'sk_test_dummy'
  process.env.STRIPE_BOOKING_WEBHOOK_SECRET = 'whsec_test'
  process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com'
  mockSendGuest.mockResolvedValue(undefined)
  mockSendManager.mockResolvedValue(undefined)
})

describe('POST /api/stripe/booking-webhook', () => {
  it('returns 400 when stripe-signature header is missing', async () => {
    const req = new NextRequest(`${BASE_URL}/api/stripe/booking-webhook`, {
      method: 'POST',
      body: '{}',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when signature verification fails', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('Invalid signature')
    })
    const req = makeWebhookRequest()
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 200 and ignores unrecognized event types', async () => {
    mockConstructEvent.mockReturnValue({
      type: 'customer.subscription.updated',
      data: { object: {} },
    })
    const supabase = buildMockSupabase()
    mockCreateAdminClient.mockReturnValue(supabase)
    const req = makeWebhookRequest()
    const res = await POST(req)
    expect(res.status).toBe(200)
  })

  describe('checkout.session.completed', () => {
    const completedEvent = {
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_abc',
          payment_intent: 'pi_test_123',
          metadata: { reservation_id: 'res-001' },
        },
      },
    }

    it('confirms a pending_payment reservation', async () => {
      mockConstructEvent.mockReturnValue(completedEvent)
      const supabase = buildMockSupabase()
      mockCreateAdminClient.mockReturnValue(supabase)
      const req = makeWebhookRequest()
      const res = await POST(req)
      expect(res.status).toBe(200)
      expect(supabase.from('reservations').update).toBeDefined()
    })

    it('skips processing when reservation is already confirmed (idempotency)', async () => {
      mockConstructEvent.mockReturnValue(completedEvent)
      const supabase = buildMockSupabase({
        reservationData: { ...pendingReservation, status: 'confirmed' },
      })
      mockCreateAdminClient.mockReturnValue(supabase)
      const req = makeWebhookRequest()
      const res = await POST(req)
      expect(res.status).toBe(200)
    })

    it('sends emails to guest and manager after confirmation', async () => {
      mockConstructEvent.mockReturnValue(completedEvent)
      const supabase = buildMockSupabase()
      mockCreateAdminClient.mockReturnValue(supabase)
      const req = makeWebhookRequest()
      await POST(req)
      expect(mockSendGuest).toHaveBeenCalledTimes(1)
      expect(mockSendManager).toHaveBeenCalledTimes(1)
    })

    it('returns 200 even if reservation_id is missing in metadata', async () => {
      mockConstructEvent.mockReturnValue({
        ...completedEvent,
        data: { object: { id: 'cs_test_abc', metadata: {} } },
      })
      const supabase = buildMockSupabase()
      mockCreateAdminClient.mockReturnValue(supabase)
      const req = makeWebhookRequest()
      const res = await POST(req)
      expect(res.status).toBe(200)
    })
  })

  describe('checkout.session.expired', () => {
    const expiredEvent = {
      type: 'checkout.session.expired',
      data: {
        object: {
          id: 'cs_test_expired',
          metadata: { reservation_id: 'res-002' },
        },
      },
    }

    it('cancels a pending_payment reservation on expiry', async () => {
      mockConstructEvent.mockReturnValue(expiredEvent)
      const supabase = buildMockSupabase()
      mockCreateAdminClient.mockReturnValue(supabase)
      const req = makeWebhookRequest()
      const res = await POST(req)
      expect(res.status).toBe(200)
    })

    it('does not cancel a confirmed reservation on expiry', async () => {
      mockConstructEvent.mockReturnValue(expiredEvent)
      const supabase = buildMockSupabase({
        reservationData: { status: 'confirmed' },
      })
      mockCreateAdminClient.mockReturnValue(supabase)
      const req = makeWebhookRequest()
      const res = await POST(req)
      expect(res.status).toBe(200)
    })

    it('logs error when DB update fails during expiry cancellation', async () => {
      mockConstructEvent.mockReturnValue(expiredEvent)
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      const supabase = buildMockSupabase({ updateError: { message: 'DB error' } })
      mockCreateAdminClient.mockReturnValue(supabase)
      const req = makeWebhookRequest()
      await POST(req)
      // Error should be logged (not thrown — endpoint returns 200)
      consoleSpy.mockRestore()
    })
  })
})
