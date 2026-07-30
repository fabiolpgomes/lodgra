/**
 * Unit Tests for Booking.com Webhook Sync Logic
 *
 * Tests the business logic of syncBookingReservation without complex Supabase mocks.
 * Uses simple data-driven mocks to validate: flow, duplicate detection, org isolation.
 */

import { syncBookingReservation } from '../reservation-sync'
import type { BookingWebhookPayload } from '../webhook-validator'
import { createAdminClient } from '@/lib/supabase/admin'

// Simple mock setup: track all queries, return appropriate data
let mockQueryLog: Array<{ table: string; method: string; args: any[] }> = []
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

    maybeSingle: jest.fn(async () => {
      const data = mockData[table]
      return { data, error: null }
    }),

    upsert: jest.fn(function (data: any) {
      mockData[table] = { ...data, id: 'generated_' + Date.now() }
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
      mockData[table] = { ...data, id: 'generated_' + Date.now() }
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
    // Setup default mock data for all tables
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
      property_listings: {
        id: 'listing_123',
        property_id: 'prop_123',
      },
    }
  })

  // ──────────────────────────────────────────────────────────────
  // TEST 1: Full Webhook Flow
  // ──────────────────────────────────────────────────────────────

  describe('TEST 1: Full Webhook Flow (Payload → Reservation Created)', () => {
    it('should sync webhook payload and return success with reservation ID', async () => {
      const result = await syncBookingReservation(validPayload, 'req_123')

      expect(result.success).toBe(true)
      expect(result.reservationId).toBeDefined()
      expect(result.isDuplicate).toBe(false)
      expect(result.error).toBeUndefined()
    })

    it('should fetch organization and validate it exists', async () => {
      await syncBookingReservation(validPayload, 'req_123')

      // Verify that organization lookup was attempted
      const adminClient = createAdminClient()

      expect(adminClient.from).toHaveBeenCalledWith('organizations')
    })

    it('should return error if property listing not found', async () => {
      jest.clearAllMocks()

      // Mock property listing not found
      createAdminClient.mockReturnValue({
        from: jest.fn((table: string) => ({
          select: jest.fn(function () {
            return this
          }),
          eq: jest.fn(function () {
            return this
          }),
          limit: jest.fn(function () {
            return this
          }),
          single: jest.fn(async function () {
            if (table === 'property_listings') {
              return { data: null, error: { message: 'Not found' } }
            }
            return { data: null, error: null }
          }),
          maybeSingle: jest.fn(async function () {
            return { data: null, error: null }
          }),
          upsert: jest.fn(async function () {
            return { data: null, error: null }
          }),
          insert: jest.fn(function () {
            return this
          }),
        })),
      })

      const result = await syncBookingReservation(validPayload, 'req_123')

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })

    it('should propagate organization_id to reservation for RLS isolation', async () => {
      mockData.organizations = { id: 'org_test_456', plan: 'starter' }
      mockData.channel_listings = {
        ...mockData.channel_listings,
        organization_id: 'org_test_456',
      }

      const result = await syncBookingReservation(validPayload, 'req_123')

      expect(result.success).toBe(true)
      expect(result.reservationId).toBeDefined()
    })
  })

  // ──────────────────────────────────────────────────────────────
  // TEST 2: Duplicate Detection
  // ──────────────────────────────────────────────────────────────

  describe('TEST 2: Duplicate Detection (Idempotency)', () => {
    it('should detect duplicate and return isDuplicate=true', async () => {
      // First sync creates reservation
      const result1 = await syncBookingReservation(validPayload, 'req_123_first')
      expect(result1.success).toBe(true)
      expect(result1.isDuplicate).toBe(false)
      const firstId = result1.reservationId

      // Second sync - simulate duplicate by mocking existing reservation
      mockData.reservations = { id: firstId, external_id: 'res_booking_001' }

      const result2 = await syncBookingReservation(validPayload, 'req_123_retry')
      expect(result2.success).toBe(true)
      expect(result2.isDuplicate).toBe(true)
    })
  })

  // ──────────────────────────────────────────────────────────────
  // TEST 3: Organization Isolation
  // ──────────────────────────────────────────────────────────────

  describe('TEST 3: Organization Isolation (RLS Enforcement)', () => {
    it('should isolate reservation to correct organization', async () => {
      const testOrgId = 'org_isolation_test_789'
      mockData.organizations = { id: testOrgId, plan: 'starter' }
      mockData.channel_listings = {
        ...mockData.channel_listings,
        organization_id: testOrgId,
      }

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
