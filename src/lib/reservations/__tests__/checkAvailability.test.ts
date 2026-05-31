import { checkPropertyAvailability } from '../checkAvailability'
import type { SupabaseClient } from '@supabase/supabase-js'

// Creates a chainable mock that is also awaitable (thenable)
function createThenable(resolveValue: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const q: Record<string, any> = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(resolveValue).then(resolve),
    catch: (reject: (e: unknown) => unknown) => Promise.resolve(resolveValue).catch(reject),
    finally: (fn: () => void) => Promise.resolve(resolveValue).finally(fn),
  }
  return q
}

describe('checkPropertyAvailability', () => {
  let mockSupabase: SupabaseClient

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn(),
    } as unknown as SupabaseClient
  })

  it('should return available=true when no conflicts', async () => {
    const listingsMock = createThenable({ data: [{ id: 'listing-1' }], error: null })
    const conflictsMock = createThenable({ data: [], error: null })

    const fromFn = mockSupabase.from as jest.Mock
    fromFn.mockImplementation((table: string) => {
      if (table === 'property_listings') return listingsMock
      if (table === 'reservations') return conflictsMock
      return createThenable({ data: null, error: null })
    })

    const result = await checkPropertyAvailability(
      mockSupabase,
      'property-1',
      '2026-05-01',
      '2026-05-10'
    )

    expect(result.available).toBe(true)
    expect(result.conflicting_reservations).toEqual([])
  })

  it('should return available=false when conflicts exist', async () => {
    const listingsMock = createThenable({ data: [{ id: 'listing-1' }], error: null })
    const conflictsMock = createThenable({
      data: [
        {
          id: 'res-1',
          check_in: '2026-05-05',
          check_out: '2026-05-08',
          status: 'confirmed',
          source: 'booking',
          guests: { first_name: 'John', last_name: 'Doe' },
        },
      ],
      error: null,
    })

    const fromFn = mockSupabase.from as jest.Mock
    fromFn.mockImplementation((table: string) => {
      if (table === 'property_listings') return listingsMock
      if (table === 'reservations') return conflictsMock
    })

    const result = await checkPropertyAvailability(
      mockSupabase,
      'property-1',
      '2026-05-01',
      '2026-05-10'
    )

    expect(result.available).toBe(false)
    expect(result.conflicting_reservations.length).toBe(1)
    expect(result.conflicting_reservations[0].guest_name).toBe('John Doe')
  })

  it('should validate date format', async () => {
    const fromFn = mockSupabase.from as jest.Mock
    fromFn.mockImplementation(() => createThenable({ data: [{ id: 'listing-1' }], error: null }))

    const result = await checkPropertyAvailability(
      mockSupabase,
      'property-1',
      'invalid-date',
      '2026-05-10'
    )

    expect(result.available).toBe(false)
    expect(result.message).toBe('Datas inválidas')
  })

  it('should exclude reservation when provided', async () => {
    const listingsMock = createThenable({ data: [{ id: 'listing-1' }], error: null })
    const conflictsMock = createThenable({
      data: [
        {
          id: 'res-1',
          check_in: '2026-05-05',
          check_out: '2026-05-08',
          status: 'confirmed',
          source: 'manual',
          guests: null,
        },
      ],
      error: null,
    })

    const fromFn = mockSupabase.from as jest.Mock
    fromFn.mockImplementation((table: string) => {
      if (table === 'property_listings') return listingsMock
      if (table === 'reservations') return conflictsMock
    })

    const result = await checkPropertyAvailability(
      mockSupabase,
      'property-1',
      '2026-05-01',
      '2026-05-10',
      'res-1'
    )

    expect(result.available).toBe(true)
    expect(result.conflicting_reservations).toEqual([])
  })
})
