import { syncExtractedDataToReservation } from '../sync-to-reservations'
import { createAdminClient } from '@/lib/supabase/admin'

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

function buildReservationQuery(candidates: any[]) {
  return {
    select: () => ({
      eq: () => ({
        eq: () => ({
          eq: () => Promise.resolve({ data: candidates, error: null }),
        }),
      }),
    }),
  }
}

describe('syncExtractedDataToReservation', () => {
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()
    mockSupabase = { from: jest.fn() }
    ;(createAdminClient as jest.Mock).mockResolvedValue(mockSupabase)
  })

  function mockExtraction(overrides: Record<string, unknown> = {}) {
    return {
      id: 'ext-1',
      organization_id: 'org-1',
      match_status: 'pending',
      guest_name: 'Ana Santos',
      phone: '+351911111111',
      total_value: 500,
      check_in: '2026-08-01',
      check_out: '2026-08-10',
      property_name: null,
      ...overrides,
    }
  }

  it('syncs directly when only one reservation matches the exact dates', async () => {
    const extraction = mockExtraction()
    const updateMock = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'email_extractions') {
        return {
          select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: extraction, error: null }) }) }),
          update: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }),
        }
      }
      if (table === 'reservations') {
        return {
          ...buildReservationQuery([{ id: 'res-1', property_id: 'p-1', property_listing_id: 'pl-1', properties: null }]),
          update: updateMock,
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    })

    const result = await syncExtractedDataToReservation('ext-1')

    expect(result.success).toBe(true)
    expect(updateMock).toHaveBeenCalled()
    const eqCall = updateMock.mock.results[0].value.eq as jest.Mock
    expect(eqCall).toHaveBeenCalledWith('id', 'res-1')
  })

  it('disambiguates via property_name when two reservations share the exact same dates', async () => {
    const extraction = mockExtraction({ property_name: 'Villa Azul' })
    const updateMock = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) })

    const candidates = [
      { id: 'res-WRONG', property_id: 'p-1', property_listing_id: 'pl-1', properties: [{ name: 'Apartamento Centro' }] },
      { id: 'res-CORRECT', property_id: 'p-2', property_listing_id: 'pl-2', properties: [{ name: 'Villa Azul' }] },
    ]

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'email_extractions') {
        return {
          select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: extraction, error: null }) }) }),
          update: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }),
        }
      }
      if (table === 'reservations') {
        return { ...buildReservationQuery(candidates), update: updateMock }
      }
      throw new Error(`Unexpected table: ${table}`)
    })

    const result = await syncExtractedDataToReservation('ext-1')

    expect(result.success).toBe(true)
    const eqCall = updateMock.mock.results[0].value.eq as jest.Mock
    expect(eqCall).toHaveBeenCalledWith('id', 'res-CORRECT')
  })

  it('flags needs_review instead of guessing when dates collide and there is no property_name', async () => {
    const extraction = mockExtraction({ property_name: null })
    const extractionUpdateMock = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) })
    const reservationUpdateMock = jest.fn()

    const candidates = [
      { id: 'res-A', property_id: 'p-1', property_listing_id: 'pl-1', properties: [{ name: 'Apartamento Centro' }] },
      { id: 'res-B', property_id: 'p-2', property_listing_id: 'pl-2', properties: [{ name: 'Villa Azul' }] },
    ]

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'email_extractions') {
        return {
          select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: extraction, error: null }) }) }),
          update: extractionUpdateMock,
        }
      }
      if (table === 'reservations') {
        return { ...buildReservationQuery(candidates), update: reservationUpdateMock }
      }
      throw new Error(`Unexpected table: ${table}`)
    })

    const result = await syncExtractedDataToReservation('ext-1')

    expect(result.success).toBe(true)
    expect(reservationUpdateMock).not.toHaveBeenCalled()
    expect(extractionUpdateMock).toHaveBeenCalledWith({ match_status: 'needs_review' })
  })

  it('flags needs_review instead of guessing when property_name does not clearly match any candidate', async () => {
    const extraction = mockExtraction({ property_name: 'Totalmente Diferente' })
    const extractionUpdateMock = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) })
    const reservationUpdateMock = jest.fn()

    const candidates = [
      { id: 'res-A', property_id: 'p-1', property_listing_id: 'pl-1', properties: [{ name: 'Apartamento Centro' }] },
      { id: 'res-B', property_id: 'p-2', property_listing_id: 'pl-2', properties: [{ name: 'Villa Azul' }] },
    ]

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'email_extractions') {
        return {
          select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: extraction, error: null }) }) }),
          update: extractionUpdateMock,
        }
      }
      if (table === 'reservations') {
        return { ...buildReservationQuery(candidates), update: reservationUpdateMock }
      }
      throw new Error(`Unexpected table: ${table}`)
    })

    const result = await syncExtractedDataToReservation('ext-1')

    expect(result.success).toBe(true)
    expect(reservationUpdateMock).not.toHaveBeenCalled()
    expect(extractionUpdateMock).toHaveBeenCalledWith({ match_status: 'needs_review' })
  })

  it('handles extraction not found', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'email_extractions') {
        return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: { message: 'Not found' } }) }) }) }
      }
      throw new Error(`Unexpected table: ${table}`)
    })

    const result = await syncExtractedDataToReservation('ext-999')

    expect(result.success).toBe(false)
    expect(result.error).toContain('not found')
  })

  it('skips if already synced (idempotent)', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'email_extractions') {
        return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { id: 'ext-synced', match_status: 'auto_matched' }, error: null }) }) }) }
      }
      throw new Error(`Unexpected table: ${table}`)
    })

    const result = await syncExtractedDataToReservation('ext-synced')

    expect(result.success).toBe(true)
  })

  it('does not fail when no reservation exists yet for those dates', async () => {
    const extraction = mockExtraction()

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'email_extractions') {
        return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: extraction, error: null }) }) }) }
      }
      if (table === 'reservations') {
        return buildReservationQuery([])
      }
      throw new Error(`Unexpected table: ${table}`)
    })

    const result = await syncExtractedDataToReservation('ext-1')

    expect(result.success).toBe(true)
  })

  it('splits guest name correctly', async () => {
    const extraction = mockExtraction({ guest_name: 'João Manuel Silva' })
    const updateMock = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'email_extractions') {
        return {
          select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: extraction, error: null }) }) }),
          update: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }),
        }
      }
      if (table === 'reservations') {
        return { ...buildReservationQuery([{ id: 'res-999', property_id: 'p-1', property_listing_id: 'pl-1', properties: null }]), update: updateMock }
      }
      throw new Error(`Unexpected table: ${table}`)
    })

    await syncExtractedDataToReservation('ext-1')

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        first_name: 'João',
        last_name: 'Manuel Silva',
        guest_phone: '+351911111111',
      })
    )
  })
})
