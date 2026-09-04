import type { SupabaseClient } from '@supabase/supabase-js'
import type { UserAccess } from '@/lib/auth/getUserAccess'
import { cancelReservation } from '@/lib/reservations/cancelReservation'
import { stripePT } from '@/lib/stripe/client-pt'

jest.mock('@/lib/stripe/client-pt', () => ({
  stripePT: {
    refunds: {
      create: jest.fn(),
    },
  },
}))

function access(overrides: Partial<UserAccess['profile']> = {}): UserAccess {
  return {
    profile: {
      id: 'user-1',
      email: 'admin@example.com',
      full_name: 'Admin',
      role: 'admin',
      avatar_url: null,
      access_all_properties: true,
      organization_id: 'org-1',
      ...overrides,
    },
    propertyIds: null,
  }
}

function query(result: { data: unknown; error: unknown }) {
  const builder = {
    select: jest.fn(),
    eq: jest.fn(),
    in: jest.fn(),
    neq: jest.fn(),
    update: jest.fn(),
    maybeSingle: jest.fn().mockResolvedValue(result),
  }
  builder.select.mockReturnValue(builder)
  builder.eq.mockReturnValue(builder)
  builder.in.mockReturnValue(builder)
  builder.neq.mockReturnValue(builder)
  builder.update.mockReturnValue(builder)
  return builder
}

describe('cancelReservation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('updates the canonical status and writes an audit entry', async () => {
    const fetchQuery = query({
      data: { id: 'reservation-1', property_id: 'property-1', reservation_status: 'confirmed' },
      error: null,
    })
    const updateQuery = query({ data: { id: 'reservation-1' }, error: null })
    const auditInsert = jest.fn().mockResolvedValue({ error: null })
    const from = jest.fn()
      .mockReturnValueOnce(fetchQuery)
      .mockReturnValueOnce(updateQuery)
      .mockReturnValueOnce({ insert: auditInsert })

    const result = await cancelReservation(
      { from } as unknown as SupabaseClient,
      access(),
      'reservation-1',
      'Solicitado pelo hóspede',
    )

    expect(result).toEqual({ ok: true, alreadyCancelled: false, reservationId: 'reservation-1' })
    expect(updateQuery.update).toHaveBeenCalledWith(expect.objectContaining({
      reservation_status: 'cancelled',
      cancelled_at: expect.any(String),
      deleted_at: null,
      updated_at: expect.any(String),
    }))
    expect(auditInsert).toHaveBeenCalledWith(expect.objectContaining({
      action: 'update',
      resource_id: 'reservation-1',
      details: expect.objectContaining({
        event: 'reservation_cancelled',
        reason: 'Solicitado pelo hóspede',
        refund_amount: 0,
        refund_processed: false,
      }),
    }))
  })

  it('calculates and stores refund information when policy data is available', async () => {
    const fetchQuery = query({
      data: {
        id: 'reservation-1',
        property_id: 'property-1',
        reservation_status: 'confirmed',
        deleted_at: null,
        check_in: '2026-08-30',
        check_out: '2026-09-02',
        total_amount: 900,
        cancellation_policy_id: 'policy-1',
        cancellation_policy_snapshot: {
          policy_type: 'flexible',
          is_long_stay: false,
          full_refund_days: 1,
          partial_refund_days: null,
          partial_refund_percent: null,
          non_refundable_discount_percent: 0,
          captured_at: '2026-08-01T00:00:00Z',
        },
        stripe_payment_intent_id: 'pi_123',
      },
      error: null,
    })
    const updateQuery = query({ data: { id: 'reservation-1' }, error: null })
    const auditInsert = jest.fn().mockResolvedValue({ error: null })
    const from = jest.fn()
      .mockReturnValueOnce(fetchQuery)
      .mockReturnValueOnce(updateQuery)
      .mockReturnValueOnce({ insert: auditInsert })

    ;(stripePT.refunds.create as jest.Mock).mockResolvedValue({
      id: 're_123',
    })

    const result = await cancelReservation(
      { from } as unknown as SupabaseClient,
      access(),
      'reservation-1',
      'Cancelamento solicitado',
    )

    expect(stripePT.refunds.create).toHaveBeenCalledWith({
      payment_intent: 'pi_123',
      amount: 45000,
      reason: 'requested_by_customer',
    })
    expect(result).toEqual(expect.objectContaining({
      ok: true,
      alreadyCancelled: false,
      reservationId: 'reservation-1',
      refundInfo: expect.objectContaining({
        refund_amount: 450,
        refund_percentage: 50,
        stripe_refund_id: 're_123',
        processed_at: expect.any(String),
      }),
    }))
    expect(updateQuery.update).toHaveBeenCalledWith(expect.objectContaining({
      refund_amount: 450,
      stripe_refund_id: 're_123',
      refund_processed_at: expect.any(String),
    }))
    expect(auditInsert).toHaveBeenCalledWith(expect.objectContaining({
      details: expect.objectContaining({
        event: 'reservation_cancelled',
        refund_amount: 450,
        refund_processed: true,
      }),
    }))
  })

  it('is idempotent when the reservation is already cancelled', async () => {
    const fetchQuery = query({
      data: { id: 'reservation-1', property_id: 'property-1', reservation_status: 'cancelled', deleted_at: null },
      error: null,
    })
    const from = jest.fn().mockReturnValue(fetchQuery)

    const result = await cancelReservation(
      { from } as unknown as SupabaseClient,
      access(),
      'reservation-1',
      null,
    )

    expect(result).toEqual({ ok: true, alreadyCancelled: true, reservationId: 'reservation-1' })
    expect(fetchQuery.update).not.toHaveBeenCalled()
  })

  it('denies viewers before querying reservations', async () => {
    const from = jest.fn()
    const result = await cancelReservation(
      { from } as unknown as SupabaseClient,
      access({ role: 'viewer' }),
      'reservation-1',
      null,
    )

    expect(result).toEqual({ ok: false, status: 403, error: 'Sem permissão para cancelar reservas' })
    expect(from).not.toHaveBeenCalled()
  })

  it('returns idempotent success when another request cancels concurrently', async () => {
    const fetchQuery = query({
      data: { id: 'reservation-1', property_id: 'property-1', reservation_status: 'confirmed' },
      error: null,
    })
    const updateQuery = query({ data: null, error: null })
    const concurrentQuery = query({
      data: { id: 'reservation-1', reservation_status: 'cancelled' },
      error: null,
    })
    const from = jest.fn()
      .mockReturnValueOnce(fetchQuery)
      .mockReturnValueOnce(updateQuery)
      .mockReturnValueOnce(concurrentQuery)

    const result = await cancelReservation(
      { from } as unknown as SupabaseClient,
      access(),
      'reservation-1',
      null,
    )

    expect(result).toEqual({ ok: true, alreadyCancelled: true, reservationId: 'reservation-1' })
  })

  it('scopes restricted users to their assigned properties', async () => {
    const fetchQuery = query({ data: null, error: null })
    const from = jest.fn().mockReturnValue(fetchQuery)
    const restrictedAccess = access({ role: 'owner', access_all_properties: false })
    restrictedAccess.propertyIds = ['property-1']

    const result = await cancelReservation(
      { from } as unknown as SupabaseClient,
      restrictedAccess,
      'reservation-1',
      null,
    )

    expect(result).toEqual({ ok: false, status: 404, error: 'Reserva não encontrada' })
    expect(fetchQuery.eq).toHaveBeenCalledWith('organization_id', 'org-1')
    expect(fetchQuery.in).toHaveBeenCalledWith('property_id', ['property-1'])
  })
})
