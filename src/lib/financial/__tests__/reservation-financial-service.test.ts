jest.mock('server-only', () => ({}))
jest.mock('@/lib/auth/getUserAccess', () => ({ getUserAccess: jest.fn() }))
jest.mock('@/lib/financial/payout-service.server', () => {
  class PayoutServiceError extends Error {
    constructor(readonly status: number, readonly code: string, message: string) { super(message) }
  }
  return { PayoutServiceError }
})

import type { SupabaseClient } from '@supabase/supabase-js'
import { getUserAccess } from '@/lib/auth/getUserAccess'
import { getReservationFinancialFacts, replaceReservationFinancialFacts } from '@/lib/financial/reservation-financial-service.server'

const organizationId = '00000000-0000-0000-0000-000000000001'
const reservationId = '08229632-dd7a-44eb-8150-ba2a0d4825c4'
const propertyId = '00000000-0000-0000-0000-000000000002'

function client(snapshots: unknown[] = []) {
  const filters: Array<[string, string, unknown]> = []
  const from = jest.fn((table: string) => {
    const result = { data: table === 'reservations'
      ? { id: reservationId, organization_id: organizationId, property_id: propertyId, booking_source: 'ical', currency: 'EUR', external_reservation_id: null, external_id: null, total_amount: null }
      : table === 'reservation_financial_snapshots' ? snapshots : null, error: null }
    const query = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn((column: string, value: unknown) => { filters.push([table, column, value]); return query }),
      is: jest.fn().mockReturnThis(), order: jest.fn().mockReturnThis(),
      maybeSingle: async () => result, limit: async () => result,
    }
    return query
  })
  return { supabase: { auth: { getUser: async () => ({ data: { user: { id: 'user' } } }) }, from } as unknown as SupabaseClient, filters, from }
}

describe('financial facts DAL with legacy PostgreSQL UUIDs', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getUserAccess as jest.Mock).mockResolvedValue({ profile: { organization_id: organizationId, role: 'gestor' }, propertyIds: [propertyId] })
  })

  it('loads authorized legacy organization/property ids and retains tenant filters on every query', async () => {
    const { supabase, filters } = client()
    const result = await getReservationFinancialFacts(supabase, reservationId, 'request')
    expect(result.reservation).toMatchObject({ id: reservationId, propertyId, source: 'ical' })
    expect(result.currentSnapshot).toBeNull()
    for (const table of ['reservations', 'reservation_financial_snapshots', 'regras_repasse', 'property_financial_parameters']) {
      expect(filters).toContainEqual([table, 'organization_id', organizationId])
    }
  })

  it('still rejects an inaccessible property before loading financial rows', async () => {
    ;(getUserAccess as jest.Mock).mockResolvedValue({ profile: { organization_id: organizationId, role: 'gestor' }, propertyIds: [] })
    const { supabase, from } = client()
    await expect(getReservationFinancialFacts(supabase, reservationId, 'request')).rejects.toMatchObject({ status: 404 })
    expect(from).toHaveBeenCalledTimes(1)
  })

  it('returns an actionable validation error if opt-in was revoked before the RPC', async () => {
    const { supabase, from } = client()
    supabase.rpc = jest.fn().mockResolvedValue({ error: { code: '22023', message: 'DECLARED_OWNER_BASE_NOT_ALLOWED' } })
    await expect(replaceReservationFinancialFacts(supabase, reservationId, {
      factMode: 'declared_owner_base', currency: 'EUR', expectedCurrentVersion: null,
      declaredOwnerBaseAmount: '410.00',
    }, 'request')).rejects.toMatchObject({ status: 422, code: 'DECLARED_OWNER_BASE_NOT_ALLOWED' })
    expect(from).toHaveBeenCalledTimes(1)
  })

  it('reads a persisted snapshot timestamp with PostgreSQL offset and microseconds', async () => {
    const capturedAt = '2026-09-12T08:47:53.456123+00:00'
    const { supabase } = client([{
      id: '7948dbe9-08be-4743-98af-1a45402bb73f', reservation_id: reservationId,
      version: 1, status: 'complete', fact_mode: 'declared_owner_base', currency: 'EUR',
      declared_owner_base_amount: 410, accommodation_amount: null, cleaning_fee_amount: null,
      municipal_tax_amount: null, other_guest_fees_amount: null, discount_amount: null,
      platform_adjustment_amount: null, guest_total_amount: null, ota_commission_base_amount: null,
      ota_commission_amount: null, payment_processing_fee_amount: null, manager_cleaning_cost_amount: null,
      channel_net_payout_amount: null, ota_commission_settlement: 'unknown', payment_processing_settlement: 'unknown',
      source_kind: 'manual', provider: 'ical', external_reference: null, captured_at: capturedAt,
      source_mapping_version: 'manual-v1', source_metadata: {}, created_by: null,
    }])
    const result = await getReservationFinancialFacts(supabase, reservationId, 'request')
    expect(result.currentSnapshot).toMatchObject({ capturedAt, declaredOwnerBaseAmount: '410' })
  })

  it('maps native serialization failures to a refreshable conflict', async () => {
    const { supabase } = client()
    supabase.rpc = jest.fn().mockResolvedValue({ error: { code: '40001', message: 'could not serialize access due to concurrent update' } })
    await expect(replaceReservationFinancialFacts(supabase, reservationId, {
      factMode: 'declared_owner_base', currency: 'EUR', expectedCurrentVersion: 1,
      declaredOwnerBaseAmount: '410.00',
    }, 'request')).rejects.toMatchObject({ status: 409, code: 'FINANCIAL_FACTS_CONFLICT' })
  })
})
