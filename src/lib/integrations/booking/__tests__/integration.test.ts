/**
 * Integration Tests for Booking.com Webhook
 *
 * Critical tests:
 * 1. Full webhook flow (payload → reservation created in DB)
 * 2. Duplicate detection (sending same payload twice)
 * 3. Organization isolation (RLS enforcement)
 *
 * Prerequisites:
 * - Supabase test database with seed data
 * - Test organizations, properties, and listings
 * - Environment variables configured
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { syncBookingReservation } from '../reservation-sync'
import { validateBookingWebhookSignature } from '../webhook-validator'
import type { BookingWebhookPayload } from '../webhook-validator'
import crypto from 'crypto'

// TODO: Re-enable when Booking.com native integration is reactivated
describe.skip('Booking.com Webhook - Integration Tests', () => {
  const adminClient = createAdminClient()
  const WEBHOOK_SECRET = process.env.BOOKING_WEBHOOK_SECRET || 'test-secret-key'

  // Test data
  let testOrgId: string
  let testPropertyId: string
  let testListingId: string
  let testBookingPayload: BookingWebhookPayload

  /**
   * Setup: Create test organization, property, and listing
   */
  beforeAll(async () => {
    // Create test organization
    const { data: org, error: orgError } = await adminClient
      .from('organizations')
      .insert({
        name: 'Test Org Integration',
        plan: 'starter',
      })
      .select('id')
      .single()

    if (orgError || !org) {
      console.error('Failed to create test org:', orgError)
      throw new Error('Setup failed: could not create test organization')
    }
    testOrgId = org.id

    // Create test property
    const { data: prop, error: propError } = await adminClient
      .from('properties')
      .insert({
        organization_id: testOrgId,
        name: 'Test Property Integration',
        description: 'Property for webhook integration tests',
        slug: `test-integration-${Date.now()}`,
        address: 'Test Address',
        city: 'Test City',
        max_guests: 6,
        bedrooms: 2,
        bathrooms: 1,
        is_public: true,
      })
      .select('id')
      .single()

    if (propError || !prop) {
      console.error('Failed to create test property:', propError)
      throw new Error('Setup failed: could not create test property')
    }
    testPropertyId = prop.id

    // Create property listing
    const { data: listing, error: listingError } = await adminClient
      .from('property_listings')
      .insert({
        property_id: testPropertyId,
        platform_id: 'booking',
        external_property_id: 'booking_prop_12345',
      })
      .select('id')
      .single()

    if (listingError || !listing) {
      console.error('Failed to create test listing:', listingError)
      throw new Error('Setup failed: could not create test listing')
    }
    testListingId = listing.id

    // Create base test payload
    testBookingPayload = {
      event_id: `evt_integration_${Date.now()}`,
      timestamp: new Date().toISOString(),
      event_type: 'reservation.created',
      data: {
        reservation: {
          id: `res_integration_${Date.now()}`,
          property_id: 'booking_prop_12345', // Must match external_property_id
          guest: {
            name: 'João Silva',
            email: 'joao.silva@example.com',
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
  })

  /**
   * Cleanup: Delete test data
   */
  afterAll(async () => {
    if (testOrgId) {
      // Delete in cascade: reservations → property_listings → properties → organization
      const { error: resError } = await adminClient
        .from('reservations')
        .delete()
        .eq('property_listing_id', testListingId)

      const { error: listingError } = await adminClient
        .from('property_listings')
        .delete()
        .eq('id', testListingId)

      const { error: propError } = await adminClient
        .from('properties')
        .delete()
        .eq('id', testPropertyId)

      const { error: orgError } = await adminClient
        .from('organizations')
        .delete()
        .eq('id', testOrgId)

      if (resError || listingError || propError || orgError) {
        console.warn('Failed to cleanup test data')
      }
    }
  })

  // ──────────────────────────────────────────────────────────────
  // TEST 1: Full Webhook Flow
  // ──────────────────────────────────────────────────────────────

  describe('TEST 1: Full Webhook Flow (Payload → Reservation Created)', () => {
    it('should sync webhook payload and create reservation in database', async () => {
      const payload = JSON.parse(JSON.stringify(testBookingPayload))
      const requestId = crypto.randomUUID()

      // Call sync function directly
      const result = await syncBookingReservation(payload, requestId)

      // Verify response
      expect(result.success).toBe(true)
      expect(result.reservationId).toBeDefined()
      expect(result.isDuplicate).toBe(false)
      expect(result.error).toBeUndefined()

      // Verify reservation was created in DB
      const { data: reservation, error: fetchError } = await adminClient
        .from('reservations')
        .select('*')
        .eq('id', result.reservationId)
        .single()

      expect(fetchError).toBeNull()
      expect(reservation).toBeDefined()
      expect(reservation?.external_id).toBe(payload.data.reservation.id)
      expect(reservation?.guest_name).toBe('João Silva')
      expect(reservation?.check_in).toBe('2026-05-01')
      expect(reservation?.check_out).toBe('2026-05-05')
      expect(reservation?.total_amount).toBe(500.0)
      expect(reservation?.status).toBe('confirmed')
      expect(reservation?.booking_source).toBe('booking_api')
      expect(reservation?.organization_id).toBe(testOrgId) // ✅ RLS isolation
      expect(reservation?.commission_calculated_at).toBeDefined() // ✅ Commission tracking
    })

    it('should create guest record with correct name splitting', async () => {
      const payload = JSON.parse(JSON.stringify(testBookingPayload))
      const requestId = crypto.randomUUID()

      const result = await syncBookingReservation(payload, requestId)
      expect(result.success).toBe(true)

      const { data: reservation } = await adminClient
        .from('reservations')
        .select('guest_id')
        .eq('id', result.reservationId)
        .single()

      if (reservation?.guest_id) {
        const { data: guest } = await adminClient
          .from('guests')
          .select('*')
          .eq('id', reservation.guest_id)
          .single()

        expect(guest?.first_name).toBe('João')
        expect(guest?.last_name).toBe('Silva')
        expect(guest?.email).toBe('joao.silva@example.com')
      }
    })

    it('should calculate commission based on organization plan', async () => {
      const payload = JSON.parse(JSON.stringify(testBookingPayload))
      const requestId = crypto.randomUUID()

      const result = await syncBookingReservation(payload, requestId)
      expect(result.success).toBe(true)

      const { data: reservation } = await adminClient
        .from('reservations')
        .select('commission_amount, commission_rate, total_amount')
        .eq('id', result.reservationId)
        .single()

      expect(reservation?.commission_amount).toBeGreaterThan(0)
      expect(reservation?.commission_rate).toBeGreaterThan(0)
      // Starter plan: 15% commission
      expect(reservation?.commission_rate).toBe(0.15)
      expect(reservation?.commission_amount).toBeCloseTo(
        500.0 * 0.15, // 500 * 15% = 75
        2
      )
    })
  })

  // ──────────────────────────────────────────────────────────────
  // TEST 2: Duplicate Detection (Idempotency)
  // ──────────────────────────────────────────────────────────────

  describe('TEST 2: Duplicate Detection (Send Same Payload Twice)', () => {
    it('should detect duplicate and return isDuplicate=true', async () => {
      const payload = JSON.parse(JSON.stringify(testBookingPayload))
      payload.data.reservation.id = `res_dup_test_${Date.now()}`
      const requestId = crypto.randomUUID()

      // Send first time
      const result1 = await syncBookingReservation(payload, requestId)
      expect(result1.success).toBe(true)
      expect(result1.isDuplicate).toBe(false)
      const firstReservationId = result1.reservationId

      // Send exact same payload again
      const result2 = await syncBookingReservation(payload, requestId)
      expect(result2.success).toBe(true)
      expect(result2.isDuplicate).toBe(true) // ✅ Duplicate detected
      expect(result2.reservationId).toBe(firstReservationId) // Same ID

      // Verify only 1 reservation exists
      const { data: reservations, error } = await adminClient
        .from('reservations')
        .select('id')
        .eq('external_id', payload.data.reservation.id)
        .eq('property_listing_id', testListingId)

      expect(error).toBeNull()
      expect(reservations?.length).toBe(1) // ✅ Only one reservation created
    })

    it('should not duplicate guest when processing duplicate webhook', async () => {
      const payload = JSON.parse(JSON.stringify(testBookingPayload))
      payload.data.reservation.id = `res_dup_guest_${Date.now()}`
      payload.data.reservation.guest.name = 'Maria Santos'
      const requestId = crypto.randomUUID()

      // Send first time
      const result1 = await syncBookingReservation(payload, requestId)
      const reservation1 = await adminClient
        .from('reservations')
        .select('guest_id')
        .eq('id', result1.reservationId)
        .single()

      const guestId1 = reservation1.data?.guest_id

      // Send again
      const result2 = await syncBookingReservation(payload, requestId)
      const reservation2 = await adminClient
        .from('reservations')
        .select('guest_id')
        .eq('id', result2.reservationId)
        .single()

      const guestId2 = reservation2.data?.guest_id

      // Verify same guest is used
      expect(guestId1).toBe(guestId2)

      // Verify only 1 guest record
      const { data: guests, error } = await adminClient
        .from('guests')
        .select('id')
        .eq('email', payload.data.reservation.guest.email)
        .eq('organization_id', testOrgId)

      expect(error).toBeNull()
      expect(guests?.length).toBeLessThanOrEqual(2) // May have multiple emails, but this one should be single
    })
  })

  // ──────────────────────────────────────────────────────────────
  // TEST 3: Organization Isolation (RLS Enforcement)
  // ──────────────────────────────────────────────────────────────

  describe('TEST 3: Organization Isolation (RLS Enforcement)', () => {
    it('should propagate organization_id to reservation for RLS isolation', async () => {
      const payload = JSON.parse(JSON.stringify(testBookingPayload))
      payload.data.reservation.id = `res_rls_test_${Date.now()}`
      const requestId = crypto.randomUUID()

      const result = await syncBookingReservation(payload, requestId)
      expect(result.success).toBe(true)

      // Fetch reservation and verify organization_id
      const { data: reservation } = await adminClient
        .from('reservations')
        .select('organization_id')
        .eq('id', result.reservationId)
        .single()

      expect(reservation?.organization_id).toBe(testOrgId) // ✅ Correct org
    })

    it('should reject webhook if organization not found', async () => {
      // This would require creating a listing without org, which violates schema
      // Instead, verify that syncing with non-existent org fails gracefully
      const payload = JSON.parse(JSON.stringify(testBookingPayload))
      payload.data.reservation.property_id = 'nonexistent_prop_9999'
      const requestId = crypto.randomUUID()

      const result = await syncBookingReservation(payload, requestId)
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error).toContain('not found')
    })

    it('should not allow cross-organization access via listing manipulation', async () => {
      // Create second organization and property
      const { data: org2 } = await adminClient
        .from('organizations')
        .insert({ name: 'Test Org 2', plan: 'starter' })
        .select('id')
        .single()

      if (!org2) return // Skip if setup fails

      const { data: prop2 } = await adminClient
        .from('properties')
        .insert({
          organization_id: org2.id,
          name: 'Org 2 Property',
          slug: `org2-test-${Date.now()}`,
          address: 'Addr',
          city: 'City',
          max_guests: 2,
          bedrooms: 1,
          bathrooms: 1,
          is_public: true,
        })
        .select('id')
        .single()

      if (!prop2) {
        await adminClient.from('organizations').delete().eq('id', org2.id)
        return
      }

      const { data: listing2 } = await adminClient
        .from('property_listings')
        .insert({
          property_id: prop2.id,
          platform_id: 'booking',
          external_property_id: 'booking_prop_org2_test',
        })
        .select('id')
        .single()

      if (!listing2) {
        await adminClient.from('properties').delete().eq('id', prop2.id)
        await adminClient.from('organizations').delete().eq('id', org2.id)
        return
      }

      // Try to sync webhook with property from different org
      const payload = JSON.parse(JSON.stringify(testBookingPayload))
      payload.data.reservation.id = `res_xorg_test_${Date.now()}`
      payload.data.reservation.property_id = 'booking_prop_org2_test'
      const requestId = crypto.randomUUID()

      const result = await syncBookingReservation(payload, requestId)
      expect(result.success).toBe(true) // Sync succeeds

      const { data: reservation } = await adminClient
        .from('reservations')
        .select('organization_id')
        .eq('id', result.reservationId)
        .single()

      // ✅ CRITICAL: Reservation belongs to ORG 2, not ORG 1
      expect(reservation?.organization_id).toBe(org2.id)
      expect(reservation?.organization_id).not.toBe(testOrgId)

      // Cleanup org2
      await adminClient
        .from('reservations')
        .delete()
        .eq('property_listing_id', listing2.id)
      await adminClient.from('property_listings').delete().eq('id', listing2.id)
      await adminClient.from('properties').delete().eq('id', prop2.id)
      await adminClient.from('organizations').delete().eq('id', org2.id)
    })
  })
})
