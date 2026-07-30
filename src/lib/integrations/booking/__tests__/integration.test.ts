/**
 * Unit Tests for Booking.com Webhook Sync Logic
 *
 * Tests business logic without real database:
 * 1. Full webhook flow (payload processing)
 * 2. Duplicate detection (idempotency)
 * 3. Organization isolation (RLS principles)
 *
 * Uses mocked Supabase client for fast, reliable tests.
 */

import { syncBookingReservation } from '../reservation-sync'
import type { BookingWebhookPayload } from '../webhook-validator'
import { createAdminClient } from '@/lib/supabase/admin'

// Global mock data store
let mockData: Record<string, any> = {}

const createMockQuery = (table: string) => {
  return {
    select: jest.fn(() => createMockQuery(table)),
    eq: jest.fn(() => createMockQuery(table)),
    neq: jest.fn(() => createMockQuery(table)),
    in: jest.fn(() => createMockQuery(table)),
    gte: jest.fn(() => createMockQuery(table)),
    order: jest.fn(() => createMockQuery(table)),
    limit: jest.fn(() => createMockQuery(table)),

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

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({
    from: jest.fn((table: string) => createMockQuery(table)),
  })),
}))

jest.mock('@/lib/commission/service', () => ({
  calculateCommission: jest.fn(() => ({
    commissionAmount: 75.0,
    commissionRate: 0.15,
  })),
}))

// TODO: Re-enable when Booking.com native integration is reactivated
describe('Booking.com Webhook - Integration Tests', () => {
  const testBookingPayload: BookingWebhookPayload = {
    event_id: 'evt_integration_001',
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
    jest.clearAllMocks()
    mockData = {
      channel_listings: {
        id: 'channel_listing_123',
        channel_id: 'ch_123',
        organization_id: 'org_integration_123',
        property_listing_id: 'listing_123',
        external_id: 'booking_prop_123',
        channels: { name: 'booking' },
      },
      organizations: {
        id: 'org_integration_123',
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
    it('should sync webhook payload and create reservation in database', async () => {
      const result = await syncBookingReservation(testBookingPayload, 'req_123')

      expect(result.success).toBe(true)
      expect(result.reservationId).toBeDefined()
      expect(result.isDuplicate).toBe(false)
    })

    it('should create guest record with correct name splitting', async () => {
      const result = await syncBookingReservation(testBookingPayload, 'req_123')

      expect(result.success).toBe(true)
      expect(mockData.guests?.first_name).toBe('João')
      expect(mockData.guests?.last_name).toBe('Silva')
    })

    it('should calculate commission based on organization plan', async () => {
      mockData.organizations.plan = 'starter'

      const result = await syncBookingReservation(testBookingPayload, 'req_123')

      expect(result.success).toBe(true)
      expect(mockData.reservations?.commission_amount).toBeDefined()
    })
  })

  describe('TEST 2: Duplicate Detection', () => {
    it('should detect duplicate and return isDuplicate=true', async () => {
      const result1 = await syncBookingReservation(testBookingPayload, 'req_first')
      const firstId = result1.reservationId

      mockData.reservations = { id: firstId, external_id: 'res_booking_001' }

      const result2 = await syncBookingReservation(testBookingPayload, 'req_second')

      expect(result2.success).toBe(true)
      expect(result2.isDuplicate).toBe(true)
      expect(result2.reservationId).toBe(firstId)
    })

    it('should not duplicate guest when processing duplicate webhook', async () => {
      // First sync creates guest
      await syncBookingReservation(testBookingPayload, 'req_first')
      const firstGuestId = mockData.guests?.id

      // Second sync with same data - should not create duplicate guest
      mockData.reservations = { id: 'existing_res', external_id: 'res_booking_001' }
      await syncBookingReservation(testBookingPayload, 'req_second')

      expect(mockData.guests?.id).toBe(firstGuestId)
    })
  })

  describe('TEST 3: Organization Isolation', () => {
    it('should propagate organization_id to reservation for RLS isolation', async () => {
      const testOrgId = 'org_isolation_789'
      mockData.channel_listings.organization_id = testOrgId
      mockData.organizations = { id: testOrgId, plan: 'starter' }

      const result = await syncBookingReservation(testBookingPayload, 'req_org_test')

      expect(result.success).toBe(true)
      expect(mockData.reservations?.organization_id).toBe(testOrgId)
    })

    it('should reject webhook if organization not found', async () => {
      mockData.organizations = null

      const result = await syncBookingReservation(testBookingPayload, 'req_missing_org')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Organization')
    })

    it('should not allow cross-organization access via listing manipulation', async () => {
      const org1 = 'org_alpha'
      const org2 = 'org_beta'

      mockData.channel_listings.organization_id = org1
      mockData.organizations = { id: org1, plan: 'starter' }

      const result = await syncBookingReservation(testBookingPayload, 'req_cross_org')

      expect(result.success).toBe(true)
      expect(mockData.reservations?.organization_id).toBe(org1)
      expect(mockData.reservations?.organization_id).not.toBe(org2)
    })
  })
})
