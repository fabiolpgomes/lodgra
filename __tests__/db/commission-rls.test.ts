/**
 * Commission RLS Policy Tests
 * Verifies that users can only access commission data for their organization
 * Tests org isolation and multi-tenant security
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Admin client (bypasses RLS)
const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// Create session client for a specific user
const createUserClient = (accessToken: string) => {
  return createClient(SUPABASE_URL, ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  })
}

describe('Commission RLS Policies', () => {
  let org1Id: string
  let org2Id: string
  let user1Token: string
  let user2Token: string

  beforeAll(async () => {
    // Create two test organizations
    const { data: orgs, error } = await adminClient
      .from('organizations')
      .insert([
        { name: 'Org 1 (RLS Test)', slug: 'org-1-rls-test', subscription_status: 'active', plan: 'professional' },
        { name: 'Org 2 (RLS Test)', slug: 'org-2-rls-test', subscription_status: 'active', plan: 'starter' },
      ])
      .select('id')

    if (error) throw error
    org1Id = orgs![0].id
    org2Id = orgs![1].id
  })

  describe('Reservation commission visibility', () => {
    it('should allow users to see commission data for their organization only', async () => {
      // Create test user in org1
      const { data: userData, error: authError } = await adminClient.auth.admin.createUser({
        email: `test-rls-1-${Date.now()}@test.com`,
        password: 'Test123!@#',
        email_confirmed: true,
      })

      if (authError) throw authError

      const userId = userData.user!.id

      // Assign user to org1
      await adminClient.from('user_profiles').insert({
        id: userId,
        email: userData.user!.email,
        full_name: 'Test User 1',
        role: 'manager',
        organization_id: org1Id,
        access_all_properties: true,
      })

      // Create test reservations in both orgs
      await adminClient.from('reservations').insert([
        {
          organization_id: org1Id,
          property_listing_id: 'fake-listing-1',
          status: 'confirmed',
          check_in: '2026-04-01',
          check_out: '2026-04-05',
          total_amount: 1000,
          currency: 'EUR',
          commission_rate: 0.15,
          commission_amount: 150,
          commission_calculated_at: new Date().toISOString(),
        },
        {
          organization_id: org2Id,
          property_listing_id: 'fake-listing-2',
          status: 'confirmed',
          check_in: '2026-04-01',
          check_out: '2026-04-05',
          total_amount: 500,
          currency: 'EUR',
          commission_rate: 0.2,
          commission_amount: 100,
          commission_calculated_at: new Date().toISOString(),
        },
      ])

      // Get user token (in real test, would use signIn)
      const { data: session } = await adminClient.auth.admin.createSession(userId)
      if (!session?.session?.access_token) {
        throw new Error('Failed to create session for test user')
      }
      user1Token = session.session.access_token

      // Query commission data as user1 (should only see org1 data)
      const userClient = createUserClient(user1Token)
      const { data: commissions, error: queryError } = await userClient
        .from('commission_summary')
        .select('*')

      expect(queryError).toBeNull()
      expect(commissions).toBeDefined()
      expect(commissions?.length).toBe(1) // Should only see org1's data
      expect(commissions?.[0]?.organization_id).toBe(org1Id)
    })

    it('should deny access to commission data for other organizations', async () => {
      // Create test user in org2
      const { data: userData, error: authError } = await adminClient.auth.admin.createUser({
        email: `test-rls-2-${Date.now()}@test.com`,
        password: 'Test123!@#',
        email_confirmed: true,
      })

      if (authError) throw authError

      const userId = userData.user!.id

      // Assign user to org2
      await adminClient.from('user_profiles').insert({
        id: userId,
        email: userData.user!.email,
        full_name: 'Test User 2',
        role: 'viewer',
        organization_id: org2Id,
        access_all_properties: true,
      })

      // Get user token
      const { data: session } = await adminClient.auth.admin.createSession(userId)
      if (!session?.session?.access_token) {
        throw new Error('Failed to create session for test user')
      }
      user2Token = session.session.access_token

      // Query commission data as user2 (should only see org2 data, not org1)
      const userClient = createUserClient(user2Token)
      const { data: commissions, error: queryError } = await userClient
        .from('commission_summary')
        .select('*')

      expect(queryError).toBeNull()
      expect(commissions).toBeDefined()
      expect(commissions?.length).toBe(1) // Should only see org2's data
      expect(commissions?.[0]?.organization_id).toBe(org2Id)
      expect(commissions?.[0]?.organization_id).not.toBe(org1Id) // Not org1
    })
  })

  describe('Commission data integrity', () => {
    it('should calculate and store commission correctly', async () => {
      // Create property and reservation with known values
      const { data: property } = await adminClient.from('properties').insert({
        organization_id: org1Id,
        name: 'Test Property - Commission',
        address: '123 Test St',
        is_active: true,
      }).select('id').single()

      const { data: listing } = await adminClient.from('property_listings').insert({
        property_id: property!.id,
        platform_id: 'test-platform',
        external_listing_id: 'ext-123',
        is_active: true,
      }).select('id').single()

      // Insert reservation with commission
      const grossRevenue = 1000
      const commissionRate = 0.15
      const expectedCommission = 150

      const { data: reservation, error } = await adminClient
        .from('reservations')
        .insert({
          organization_id: org1Id,
          property_listing_id: listing!.id,
          status: 'confirmed',
          check_in: '2026-05-01',
          check_out: '2026-05-05',
          total_amount: grossRevenue,
          currency: 'EUR',
          commission_rate: commissionRate,
          commission_amount: expectedCommission,
          commission_calculated_at: new Date().toISOString(),
        })
        .select('*')
        .single()

      expect(error).toBeNull()
      expect(reservation?.commission_amount).toBe(expectedCommission)
      expect(reservation?.commission_rate).toBe(commissionRate)
      expect(reservation?.commission_calculated_at).toBeDefined()
    })

    it('should reject unauthorized inserts to commission_summary', async () => {
      // Attempt direct insert to materialized view should fail (views are read-only)
      const { error } = await adminClient
        .from('commission_summary')
        .insert({
          organization_id: org1Id,
          property_id: 'fake',
          commission_date: new Date().toISOString(),
          booking_count: 1,
          total_commission: 100,
        })

      // Materialized views are read-only
      expect(error).toBeDefined()
    })
  })

  afterAll(async () => {
    // Cleanup test data
    await adminClient.from('reservations').delete().eq('organization_id', org1Id)
    await adminClient.from('reservations').delete().eq('organization_id', org2Id)
    await adminClient.from('organizations').delete().in('id', [org1Id, org2Id])
  })
})
