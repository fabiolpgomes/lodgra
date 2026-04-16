/**
 * Integration Tests for GET /api/ical/[propertyId]
 * Tests iCal export endpoint with token validation
 */

import { GET } from '@/app/api/ical/[propertyId]/route'
import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateICalFromReservations } from '@/lib/ical/icalService'

// Mock dependencies
jest.mock('@/lib/supabase/admin')
jest.mock('@/lib/ical/icalService')

const mockCreateAdminClient = createAdminClient as jest.MockedFunction<typeof createAdminClient>
const mockGenerateICalFromReservations = generateICalFromReservations as jest.MockedFunction<typeof generateICalFromReservations>

describe('GET /api/ical/[propertyId]', () => {
  const propertyId = 'prop-123'
  const validToken = 'token-abc123'
  const baseUrl = 'http://localhost:3000'

  // Mock Supabase responses
  const mockSupabaseClient = {
    from: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockCreateAdminClient.mockReturnValue(mockSupabaseClient as never)
  })

  // Test 1: Successful iCal export with valid token
  it('should return valid .ics file with correct token', async () => {
    const mockProperty = {
      id: propertyId,
      ical_export_token: validToken,
    }

    const expectedICalData = 'BEGIN:VCALENDAR\nVERSION:2.0\nEND:VCALENDAR'

    // Setup mocks
    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockProperty,
            error: null,
          }),
        }),
      }),
    })

    mockGenerateICalFromReservations.mockReturnValue(expectedICalData)

    // Create request
    const request = new NextRequest(`${baseUrl}/api/ical/${propertyId}?token=${validToken}`)

    // Execute
    const response = await GET(request, { params: Promise.resolve({ propertyId }) })

    // Verify response
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('text/calendar; charset=utf-8')
    expect(response.headers.get('Content-Disposition')).toContain(`property-${propertyId}.ics`)
  })

  // Test 2: Invalid token returns 401
  it('should return 401 when token is invalid', async () => {
    const mockProperty = {
      id: propertyId,
      ical_export_token: 'correct-token',
    }

    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockProperty,
            error: null,
          }),
        }),
      }),
    })

    const request = new NextRequest(`${baseUrl}/api/ical/${propertyId}?token=wrong-token`)
    const response = await GET(request, { params: Promise.resolve({ propertyId }) })

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe('Invalid or missing token')
  })

  // Test 3: Missing token returns 401
  it('should return 401 when token is missing from query params', async () => {
    const mockProperty = {
      id: propertyId,
      ical_export_token: validToken,
    }

    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockProperty,
            error: null,
          }),
        }),
      }),
    })

    const request = new NextRequest(`${baseUrl}/api/ical/${propertyId}`)
    const response = await GET(request, { params: Promise.resolve({ propertyId }) })

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe('Invalid or missing token')
  })

  // Test 4: Non-existent property returns 404
  it('should return 404 when property does not exist', async () => {
    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Not found' },
          }),
        }),
      }),
    })

    const request = new NextRequest(`${baseUrl}/api/ical/${propertyId}?token=${validToken}`)
    const response = await GET(request, { params: Promise.resolve({ propertyId }) })

    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.error).toBe('Property not found')
  })

  // Test 5: Property without reservations returns empty calendar
  it('should return empty calendar when property has no listings', async () => {
    const mockProperty = {
      id: propertyId,
      ical_export_token: validToken,
    }

    const emptyICalData = 'BEGIN:VCALENDAR\nVERSION:2.0\nEND:VCALENDAR'

    // First call returns property, second call returns empty listings
    const mockSelect1 = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: mockProperty,
          error: null,
        }),
      }),
    })

    const mockSelect2 = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    })

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'properties') {
        return { select: mockSelect1 }
      }
      if (table === 'property_listings') {
        return { select: mockSelect2 }
      }
      return undefined
    })

    mockGenerateICalFromReservations.mockReturnValue(emptyICalData)

    const request = new NextRequest(`${baseUrl}/api/ical/${propertyId}?token=${validToken}`)
    const response = await GET(request, { params: Promise.resolve({ propertyId }) })

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('text/calendar; charset=utf-8')
  })

  // Test 6: Database error returns 500
  it('should return 500 when database query fails', async () => {
    const mockProperty = {
      id: propertyId,
      ical_export_token: validToken,
    }

    // Setup mocks with error
    const mockSelect1 = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: mockProperty,
          error: null,
        }),
      }),
    })

    const mockSelect2 = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({
        data: [
          { id: 'listing-1', ical_url: 'url1', platform_id: 'p1', sync_enabled: true, is_active: true },
        ],
        error: null,
      }),
    })

    const mockSelect3 = jest.fn().mockReturnValue({
      in: jest.fn().mockReturnValue({
        in: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database connection error' },
          }),
        }),
      }),
    })

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'properties') {
        return { select: mockSelect1 }
      }
      if (table === 'property_listings') {
        return { select: mockSelect2 }
      }
      if (table === 'reservations') {
        return { select: mockSelect3 }
      }
      return undefined
    })

    const request = new NextRequest(`${baseUrl}/api/ical/${propertyId}?token=${validToken}`)
    const response = await GET(request, { params: Promise.resolve({ propertyId }) })

    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.error).toBe('Database connection error')
  })

  // Test 7: Multiple reservations generates correct calendar
  it('should generate calendar with multiple reservations', async () => {
    const mockProperty = {
      id: propertyId,
      ical_export_token: validToken,
    }

    const mockListings = [
      { id: 'listing-1', ical_url: 'url1', platform_id: 'p1', sync_enabled: true, is_active: true },
      { id: 'listing-2', ical_url: 'url2', platform_id: 'p2', sync_enabled: true, is_active: true },
    ]

    const mockReservations = [
      {
        id: 'res-1',
        check_in: '2026-03-20',
        check_out: '2026-03-22',
        status: 'confirmed',
        number_of_guests: 2,
        property_listing_id: 'listing-1',
        property_listings: { property_id: propertyId, properties: { id: propertyId, name: 'Test Property' } },
        guests: { first_name: 'John', last_name: 'Doe' },
      },
      {
        id: 'res-2',
        check_in: '2026-03-25',
        check_out: '2026-03-27',
        status: 'confirmed',
        number_of_guests: 1,
        property_listing_id: 'listing-2',
        property_listings: { property_id: propertyId, properties: { id: propertyId, name: 'Test Property' } },
        guests: { first_name: 'Jane', last_name: 'Smith' },
      },
    ]

    const expectedICalData = 'BEGIN:VCALENDAR\nVERSION:2.0\nEND:VCALENDAR'

    const mockSelect1 = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: mockProperty,
          error: null,
        }),
      }),
    })

    const mockSelect2 = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({
        data: mockListings,
        error: null,
      }),
    })

    const mockSelect3 = jest.fn().mockReturnValue({
      in: jest.fn().mockReturnValue({
        in: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: mockReservations,
            error: null,
          }),
        }),
      }),
    })

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'properties') return { select: mockSelect1 }
      if (table === 'property_listings') return { select: mockSelect2 }
      if (table === 'reservations') return { select: mockSelect3 }
      return undefined
    })

    mockGenerateICalFromReservations.mockReturnValue(expectedICalData)

    const request = new NextRequest(`${baseUrl}/api/ical/${propertyId}?token=${validToken}`)
    const response = await GET(request, { params: Promise.resolve({ propertyId }) })

    expect(response.status).toBe(200)
    expect(mockGenerateICalFromReservations).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ id: 'res-1' }), expect.objectContaining({ id: 'res-2' })]))
  })

  // Test 8: Content-Disposition header is set correctly
  it('should set correct Content-Disposition header for download', async () => {
    const mockProperty = {
      id: propertyId,
      ical_export_token: validToken,
    }

    const mockSelect1 = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: mockProperty,
          error: null,
        }),
      }),
    })

    const mockSelect2 = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    })

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'properties') return { select: mockSelect1 }
      if (table === 'property_listings') return { select: mockSelect2 }
      return undefined
    })

    mockGenerateICalFromReservations.mockReturnValue('BEGIN:VCALENDAR\nEND:VCALENDAR')

    const request = new NextRequest(`${baseUrl}/api/ical/${propertyId}?token=${validToken}`)
    const response = await GET(request, { params: Promise.resolve({ propertyId }) })

    const disposition = response.headers.get('Content-Disposition')
    expect(disposition).toContain('attachment')
    expect(disposition).toContain(`property-${propertyId}.ics`)
  })
})
