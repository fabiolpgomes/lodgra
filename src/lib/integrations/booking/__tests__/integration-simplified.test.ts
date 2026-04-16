/**
 * Simplified Integration Tests for Booking.com Webhook
 *
 * These tests validate the LOGIC of the sync function without requiring
 * real database writes. They test:
 * 1. Full webhook flow (mocked database)
 * 2. Duplicate detection (idempotency)
 * 3. Organization isolation (RLS enforcement)
 *
 * In a real scenario, these would be run against a dedicated test database.
 */

import { syncBookingReservation } from '../reservation-sync'
import type { BookingWebhookPayload } from '../webhook-validator'

// Mock the admin client to avoid real database writes
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({
    from: jest.fn((table: string) => ({
      select: jest.fn(function () {
        return this
      }),
      eq: jest.fn(function () {
        return this
      }),
      order: jest.fn(function () {
        return this
      }),
      limit: jest.fn(function () {
        return this
      }),
      single: jest.fn(async function () {
        // Return appropriate mock data based on table
        if (table === 'property_listings') {
          return {
            data: {
              id: 'listing_123',
              property_id: 'prop_123',
              properties: {
                id: 'prop_123',
                organization_id: 'org_123',
              },
            },
            error: null,
          }
        }
        if (table === 'reservations') {
          // First call returns null (no duplicate), subsequent calls return the created one
          return { data: null, error: null }
        }
        if (table === 'organizations') {
          return {
            data: { id: 'org_123', plan: 'starter' },
            error: null,
          }
        }
        return { data: null, error: null }
      }),
      maybeSingle: jest.fn(async function () {
        return { data: null, error: null }
      }),
      upsert: jest.fn(async function (data: unknown) {
        // Mock successful upsert
        return {
          data: { ...data, id: 'generated_id_' + Date.now() },
          error: null,
        }
      }),
      insert: jest.fn(function () {
        return this
      }),
      delete: jest.fn(function () {
        return this
      }),
    })),
  })),
}))

jest.mock('@/lib/commission/service', () => ({
  calculateCommission: jest.fn(() => ({
    commissionAmount: 75.0,
    commissionRate: 0.15,
  })),
}))

// TODO: Re-enable when Booking.com native integration is reactivated
describe.skip('Booking.com Webhook - Simplified Integration Tests', () => {
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
    jest.clearAllMocks()
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
      const fromCall = adminClient.from('organizations')

      expect(fromCall).toHaveBeenCalled()
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

      let upsertedReservationData: unknown = null

      createAdminClient.mockReturnValue({
        from: jest.fn((table: string) => ({
          select: jest.fn(function () {
            return this
          }),
          eq: jest.fn(function () {
            return this
          }),
          order: jest.fn(function () {
            return this
          }),
          limit: jest.fn(function () {
            return this
          }),
          single: jest.fn(async function () {
            if (table === 'property_listings') {
              return {
                data: {
                  id: 'listing_123',
                  property_id: 'prop_123',
                  properties: { id: 'prop_123', organization_id: 'org_test_456' },
                },
                error: null,
              }
            }
            if (table === 'reservations') {
              return { data: null, error: null }
            }
            if (table === 'organizations') {
              return { data: { id: 'org_test_456', plan: 'starter' }, error: null }
            }
            return { data: null, error: null }
          }),
          maybeSingle: jest.fn(async function () {
            return { data: null, error: null }
          }),
          upsert: jest.fn(async function (data: unknown) {
            if (table === 'reservations') {
              upsertedReservationData = data
            }
            return { data: { ...data, id: 'res_' + Date.now() }, error: null }
          }),
          insert: jest.fn(function () {
            return this
          }),
        })),
      })

      const result = await syncBookingReservation(validPayload, 'req_123')

      expect(result.success).toBe(true)
      expect(upsertedReservationData?.organization_id).toBe('org_test_456') // ✅ RLS isolation
    })
  })

  // ──────────────────────────────────────────────────────────────
  // TEST 2: Duplicate Detection
  // ──────────────────────────────────────────────────────────────

  describe('TEST 2: Duplicate Detection (Idempotency)', () => {
    it('should detect duplicate and return isDuplicate=true', async () => {

      // First call returns no duplicate, second call returns the existing reservation
      let callCount = 0
      createAdminClient.mockReturnValue({
        from: jest.fn((table: string) => ({
          select: jest.fn(function () {
            return this
          }),
          eq: jest.fn(function () {
            return this
          }),
          order: jest.fn(function () {
            return this
          }),
          limit: jest.fn(function () {
            return this
          }),
          single: jest.fn(async function () {
            if (table === 'property_listings') {
              return {
                data: {
                  id: 'listing_123',
                  property_id: 'prop_123',
                  properties: { id: 'prop_123', organization_id: 'org_123' },
                },
                error: null,
              }
            }
            if (table === 'organizations') {
              return { data: { id: 'org_123', plan: 'starter' }, error: null }
            }
            return { data: null, error: null }
          }),
          maybeSingle: jest.fn(async function () {
            // Simulate duplicate detection
            if (table === 'reservations') {
              callCount++
              if (callCount === 1) {
                return { data: null, error: null } // First sync - no duplicate
              }
              return {
                data: { id: 'res_existing_123', status: 'confirmed' },
                error: null,
              } // Second sync - duplicate detected
            }
            return { data: null, error: null }
          }),
          upsert: jest.fn(async function (data: unknown) {
            return { data: { ...data, id: 'res_existing_123' }, error: null }
          }),
          insert: jest.fn(function () {
            return this
          }),
        })),
      })

      // Send first time
      const result1 = await syncBookingReservation(validPayload, 'req_123_first')
      expect(result1.success).toBe(true)
      expect(result1.isDuplicate).toBe(false)
      const firstId = result1.reservationId

      // Send again (simulating webhook retry)
      const result2 = await syncBookingReservation(validPayload, 'req_123_retry')
      expect(result2.success).toBe(true)
      expect(result2.isDuplicate).toBe(true) // ✅ Duplicate detected
      expect(result2.reservationId).toBe(firstId) // Same ID
    })
  })

  // ──────────────────────────────────────────────────────────────
  // TEST 3: Organization Isolation
  // ──────────────────────────────────────────────────────────────

  describe('TEST 3: Organization Isolation (RLS Enforcement)', () => {
    it('should isolate reservation to correct organization', async () => {

      const testOrgId = 'org_isolation_test_789'
      let capturedOrgId: string | null = null

      createAdminClient.mockReturnValue({
        from: jest.fn((table: string) => ({
          select: jest.fn(function () {
            return this
          }),
          eq: jest.fn(function (field: string, value: unknown) {
            if (field === 'id' && table === 'organizations') {
              capturedOrgId = value // Capture organization ID being queried
            }
            return this
          }),
          order: jest.fn(function () {
            return this
          }),
          limit: jest.fn(function () {
            return this
          }),
          single: jest.fn(async function () {
            if (table === 'property_listings') {
              return {
                data: {
                  id: 'listing_test',
                  property_id: 'prop_test',
                  properties: { id: 'prop_test', organization_id: testOrgId },
                },
                error: null,
              }
            }
            if (table === 'organizations' && capturedOrgId === testOrgId) {
              return { data: { id: testOrgId, plan: 'starter' }, error: null }
            }
            return { data: null, error: null }
          }),
          maybeSingle: jest.fn(async function () {
            return { data: null, error: null }
          }),
          upsert: jest.fn(async function (data: unknown) {
            // Verify organization_id is set on upsert
            if (table === 'reservations') {
              expect(data.organization_id).toBe(testOrgId) // ✅ Correct org ID
            }
            return { data: { ...data, id: 'res_test_' + Date.now() }, error: null }
          }),
          insert: jest.fn(function () {
            return this
          }),
        })),
      })

      const result = await syncBookingReservation(validPayload, 'req_org_test')

      expect(result.success).toBe(true)
      expect(capturedOrgId).toBe(testOrgId) // ✅ Organization was queried
    })

    it('should return error if organization not found', async () => {

      createAdminClient.mockReturnValue({
        from: jest.fn((table: string) => ({
          select: jest.fn(function () {
            return this
          }),
          eq: jest.fn(function () {
            return this
          }),
          order: jest.fn(function () {
            return this
          }),
          limit: jest.fn(function () {
            return this
          }),
          single: jest.fn(async function () {
            if (table === 'property_listings') {
              return {
                data: {
                  id: 'listing_orphaned',
                  property_id: 'prop_orphaned',
                  properties: { id: 'prop_orphaned', organization_id: null }, // ❌ No org
                },
                error: null,
              }
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

      const result = await syncBookingReservation(validPayload, 'req_orphaned')

      expect(result.success).toBe(false) // ✅ Rejected orphaned data
      expect(result.error).toContain('Organization')
    })
  })
})
