import { checkPropertyAvailability } from '../checkAvailability'
import type { SupabaseClient } from '@supabase/supabase-js'

interface MockQuery {
  select: jest.Mock
  eq: jest.Mock
  in?: jest.Mock
  lt?: jest.Mock
  gt?: jest.Mock
}

describe('checkPropertyAvailability', () => {
  let mockSupabase: SupabaseClient

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn(),
    } as unknown as SupabaseClient
  })

  it('should return available=true when no conflicts', async () => {
    const mockQuery: MockQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
    }

    const mockListingsQuery: MockQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnValue(Promise.resolve({ data: [{ id: 'listing-1' }], error: null })),
    }

    const mockConflictsQuery: MockQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnValue(Promise.resolve({ data: [], error: null })),
    }

    const fromFn = mockSupabase.from as jest.Mock
    fromFn.mockImplementation((table: string) => {
      if (table === 'property_listings') return mockListingsQuery
      if (table === 'reservations') return mockConflictsQuery
      return mockQuery
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
    const mockListingsQuery: MockQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnValue(Promise.resolve({ data: [{ id: 'listing-1' }], error: null })),
    }

    const mockConflictsQuery: MockQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnValue(
        Promise.resolve({
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
      ),
    }

    const fromFn = mockSupabase.from as jest.Mock
    fromFn.mockImplementation((table: string) => {
      if (table === 'property_listings')
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnValue(Promise.resolve({ data: [{ id: 'listing-1' }], error: null })),
        }
      if (table === 'reservations') return mockConflictsQuery
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
    fromFn.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnValue(Promise.resolve({ data: [{ id: 'listing-1' }], error: null })),
    }))

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
    const mockListingsQuery: MockQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnValue(Promise.resolve({ data: [{ id: 'listing-1' }], error: null })),
    }

    const mockConflictsQuery: MockQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnValue(
        Promise.resolve({
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
      ),
    }

    const fromFn = mockSupabase.from as jest.Mock
    fromFn.mockImplementation((table: string) => {
      if (table === 'property_listings') return mockListingsQuery
      if (table === 'reservations') return mockConflictsQuery
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
