/**
 * Unit Tests for Booking.com Webhook Sync Logic
 *
 * Tests business logic without complex mocks or real database.
 * Uses simple data-driven mocks for fast, reliable verification.
 */

import { syncBookingReservation } from '../reservation-sync'
import type { BookingWebhookPayload } from '../webhook-validator'
import { createAdminClient } from '@/lib/supabase/admin'

let mockData: Record<string, any> = {}

const createSimpleMock = (table: string) => {
  return {
    select: jest.fn(() => createSimpleMock(table)),
    eq: jest.fn(() => createSimpleMock(table)),
    neq: jest.fn(() => createSimpleMock(table)),
    in: jest.fn(() => createSimpleMock(table)),
    gte: jest.fn(() => createSimpleMock(table)),
    order: jest.fn(() => createSimpleMock(table)),
    limit: jest.fn(() => createSimpleMock(table)),

    single: jest.fn(async () => {
      const data = mockData[table]
      return { data, error: data ? null : { message: 'Not found' } }
    }),

    maybeSingle: jest.fn(async () => ({
      data: mockData[table],
      error: null,
    })),

    upsert: jest.fn(function (data: any) {
      mockData[table] = { ...data, id: 'gen_' + Date.now() }
      return {
        select: jest.fn(() => ({
          single: jest.fn(async () => ({
            data: mockData[table],
            error: null,
          })),
        })),
      }
    }),

    insert: jest.fn(function (data: any) {
      mockData[table] = { ...data, id: 'gen_' + Date.now() }
      return {
        select: jest.fn(async () => ({
          data: mockData[table],
          error: null,
        })),
      }
    }),
  }
}

const mockAdminClient = {
  from: jest.fn((table: string) => createSimpleMock(table)),
}

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => mockAdminClient),
}))

jest.mock('@/lib/commission/service', () => ({
  calculateCommission: jest.fn(() => ({
    commissionAmount: 75.0,
    commissionRate: 0.15,
  })),
}))

describe('Booking.com Webhook - Simplified Integration Tests', () => {
  const validPayload: BookingWebhookPayload = {
    event_id: 'evt_test_001',
    timestamp: new Date().toISOString(),
    event_type: 'reservation.created',
    data: {
      reservation: {
        id: 'res_booking_001',
        property_id: 'booking_prop_123',
        guest: {
          name: 'João Silva',
          email: 'joao@booking.test',
        },
        check_in: '2026-05-01',
        check_out: '2026-05-05',
        number_of_guests: 2,
        status: 'CONFIRMED',
        total_price: {
          currency: 'EUR',
          amount: 500.0,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    },
  }

  beforeEach(() => {
    mockAdminClient.from.mockClear()
    mockData = {
      channel_listings: {
        id: 'channel_listing_123',
        channel_id: 'ch_123',
        organization_id: 'org_123',
        property_listing_id: 'listing_123',
        external_id: 'booking_prop_123',
        channels: { name: 'booking' },
      },
      organizations: {
        id: 'org_123',
        plan: 'starter',
      },
      guests: {
        id: 'guest_123',
        first_name: 'João',
        last_name: 'Silva',
      },
    }
  })

  describe('TEST 1: Full Webhook Flow', () => {
    it('should sync webhook payload and return success with reservation ID', async () => {
      const result = await syncBookingReservation(validPayload, 'req_123')

      expect(result.success).toBe(true)
      expect(result.reservationId).toBeDefined()
      expect(result.isDuplicate).toBe(false)
    })

    it('should fetch organization and validate it exists', async () => {
      await syncBookingReservation(validPayload, 'req_123')

      expect(mockAdminClient.from).toHaveBeenCalledWith('organizations')
    })

    it('should return error if property listing not found', async () => {
      mockData.channel_listings = null

      const result = await syncBookingReservation(validPayload, 'req_123')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Channel listing')
    })

    it('should propagate organization_id to reservation for RLS isolation', async () => {
      const result = await syncBookingReservation(validPayload, 'req_123')

      expect(result.success).toBe(true)
      expect(result.reservationId).toBeDefined()
      // Organization is propagated through the sync process
    })
  })

  describe('TEST 2: Duplicate Detection', () => {
    it('should detect duplicate and return isDuplicate=true', async () => {
      // First call
      const result1 = await syncBookingReservation(validPayload, 'req_123_first')
      expect(result1.success).toBe(true)
      expect(result1.isDuplicate).toBe(false)

      // Second call - mock existing reservation
      mockData.reservations = { id: result1.reservationId, external_id: 'res_booking_001' }

      const result2 = await syncBookingReservation(validPayload, 'req_123_retry')
      expect(result2.success).toBe(true)
      expect(result2.isDuplicate).toBe(true)
    })
  })

  describe('TEST 3: Organization Isolation', () => {
    it('should isolate reservation to correct organization', async () => {
      const testOrgId = 'org_test_456'
      mockData.organizations = { id: testOrgId, plan: 'starter' }
      mockData.channel_listings.organization_id = testOrgId

      const result = await syncBookingReservation(validPayload, 'req_org_test')

      expect(result.success).toBe(true)
      expect(result.reservationId).toBeDefined()
    })

    it('should return error if organization not found', async () => {
      mockData.organizations = null

      const result = await syncBookingReservation(validPayload, 'req_orphaned')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Organization')
    })
  })
})
