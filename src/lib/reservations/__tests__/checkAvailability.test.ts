/* eslint-disable @typescript-eslint/no-explicit-any */
import { checkPropertyAvailability } from '../checkAvailability'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('checkPropertyAvailability', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createMockSupabase = (listingsData: any, conflictsData: any) => {
    // Chain for conflicts/reservations queries
    const createConflictChain = () => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      gt: jest.fn().mockResolvedValue(conflictsData),
    })

    // Chain for listings queries - supports multiple .eq() calls
    const createListingsChain = () => {
      const chain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      }
      // When the chain completes, resolve with listings data
      const eqMock = chain.eq as jest.Mock
      eqMock.mockImplementation(() => {
        // Return the chain itself to support chaining, but make it thenable
        const result = {
          ...chain,
          then: (onFulfilled: any) => Promise.resolve(listingsData).then(onFulfilled),
        }
        return result
      })
      return chain
    }

    const mockFrom = jest.fn((table: string) => {
      if (table === 'property_listings') return createListingsChain()
      return createConflictChain()
    })

    return {
      from: mockFrom,
    } as unknown as SupabaseClient
  }

  it('should return available=true when no conflicts', async () => {
    const mockSupabase = createMockSupabase(
      { data: [{ id: 'listing-1' }], error: null },
      { data: [], error: null }
    )

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
    const mockSupabase = createMockSupabase(
      { data: [{ id: 'listing-1' }], error: null },
      {
        data: [
          {
            id: 'res-1',
            check_in: '2026-05-05',
            check_out: '2026-05-08',
            status: 'confirmed',
            source: 'booking',
            guests: {
              first_name: 'John',
              last_name: 'Doe',
            },
          },
        ],
        error: null,
      }
    )

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
    const mockSupabase = createMockSupabase(
      { data: [{ id: 'listing-1' }], error: null },
      { data: [], error: null }
    )

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
    const mockSupabase = createMockSupabase(
      { data: [{ id: 'listing-1' }], error: null },
      {
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
      }
    )

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
