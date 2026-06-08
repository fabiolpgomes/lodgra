import { checkPropertyAvailability } from '../checkAvailability'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('checkPropertyAvailability', () => {
  let mockSupabase: SupabaseClient

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn(),
    } as unknown as SupabaseClient
  })

  const createMockChain = (finalData: any) => {
    const chain = {
      select: jest.fn(),
      eq: jest.fn(),
      in: jest.fn(),
      lt: jest.fn(),
      gt: jest.fn(),
    }

    chain.select.mockReturnValue(chain)
    chain.eq.mockReturnValue(chain)
    chain.in.mockReturnValue(chain)
    chain.lt.mockReturnValue(chain)
    chain.gt.mockReturnValue(Promise.resolve(finalData))

    return chain
  }

  it('should return available=true when no conflicts', async () => {
    const mockListingsChain = createMockChain({ data: [{ id: 'listing-1' }], error: null })
    const mockConflictsChain = createMockChain({ data: [], error: null })

    const fromFn = mockSupabase.from as jest.Mock
    fromFn.mockImplementation((table: string) => {
      if (table === 'property_listings') return mockListingsChain
      if (table === 'reservations') return mockConflictsChain
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
    const mockListingsChain = createMockChain({ data: [{ id: 'listing-1' }], error: null })

    const mockConflictsChain = createMockChain({
      data: [
        {
          id: 'res-1',
          check_in: '2026-05-05',
          check_out: '2026-05-08',
          status: 'confirmed',
          source: 'booking',
          guest_name: 'John Doe',
        },
      ],
      error: null,
    })

    const fromFn = mockSupabase.from as jest.Mock
    fromFn.mockImplementation((table: string) => {
      if (table === 'property_listings') return mockListingsChain
      if (table === 'reservations') return mockConflictsChain
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
    const mockListingsChain = createMockChain({ data: [{ id: 'listing-1' }], error: null })

    const fromFn = mockSupabase.from as jest.Mock
    fromFn.mockImplementation(() => mockListingsChain)

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
    const mockListingsChain = createMockChain({ data: [{ id: 'listing-1' }], error: null })

    const mockConflictsChain = createMockChain({
      data: [
        {
          id: 'res-1',
          check_in: '2026-05-05',
          check_out: '2026-05-08',
          status: 'confirmed',
          source: 'manual',
          guest_name: null,
        },
      ],
      error: null,
    })

    const fromFn = mockSupabase.from as jest.Mock
    fromFn.mockImplementation((table: string) => {
      if (table === 'property_listings') return mockListingsChain
      if (table === 'reservations') return mockConflictsChain
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
