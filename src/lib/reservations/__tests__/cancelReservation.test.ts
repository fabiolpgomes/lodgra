import type { SupabaseClient } from '@supabase/supabase-js'
import type { UserAccess } from '@/lib/auth/getUserAccess'
import { cancelReservation } from '@/lib/reservations/cancelReservation'

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
      details: { event: 'reservation_cancelled', reason: 'Solicitado pelo hóspede' },
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
