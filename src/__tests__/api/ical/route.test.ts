/**
 * Integration Tests for GET /api/ical/[propertyId]
 * Tests iCal export endpoint with token validation
 */

import { createTestRequest } from '@/__tests__/utils/test-request'
import { GET } from '@/app/api/ical/[propertyId]/route'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateICalWithBlocks } from '@/lib/ical/icalService'

// Mock dependencies
jest.mock('@/lib/supabase/admin')
jest.mock('@/lib/ical/icalService')
jest.mock('next/server', () => {
  let capturedHeaders: any = {}
  const createMockResponse = (body: any, options: any = {}) => {
    capturedHeaders = options?.headers || {}
    return {
      status: options?.status || 200,
      headers: {
        get: jest.fn((key: string) => {
          return capturedHeaders?.get?.(key) || null
        }),
      },
      json: jest.fn(async () => body),
      text: jest.fn(async () => body),
    }
  }

  const NextResponseJson = jest.fn((body: any, options: any = {}) => createMockResponse(body, options))
  const NextResponseConstructor = jest.fn(function (body: any, options: any) {
    return createMockResponse(body, options)
  }) as any

  NextResponseConstructor.json = NextResponseJson

  return {
    NextRequest: jest.fn(),
    NextResponse: NextResponseConstructor,
  }
})

const mockCreateAdminClient = createAdminClient as jest.MockedFunction<typeof createAdminClient>
const mockGenerateICalWithBlocks = generateICalWithBlocks as jest.MockedFunction<typeof generateICalWithBlocks>

// Helper to create chainable Supabase query mocks
function createChainableMock() {
  const methods: any = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    upsert: jest.fn().mockResolvedValue({ data: {}, error: null }),
    insert: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    // Make the query itself awaitable
    then: jest.fn(async (onFulfilled) => onFulfilled({ data: [], error: null })),
    catch: jest.fn().mockReturnThis(),
  }
  return methods
}

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

    // Create a universal mock for all queries
    const universalMock = createChainableMock()

    // Override single to return property data first time, then null
    let singleCallCount = 0
    universalMock.single.mockImplementation(async function () {
      singleCallCount++
      if (singleCallCount === 1) {
        return { data: mockProperty, error: null }
      }
      return { data: null, error: null }
    })

    // Override eq to ensure data is returned correctly
    universalMock.eq.mockImplementation(function () {
      return this
    })

    // Make order chainable too
    universalMock.order.mockImplementation(async function () {
      return { data: [], error: null }
    })

    mockSupabaseClient.from.mockImplementation(() => universalMock)
    mockGenerateICalWithBlocks.mockReturnValue(expectedICalData)

    const request = createTestRequest(`${baseUrl}/api/ical/${propertyId}?token=${validToken}`)
    const response = await GET(request, { params: Promise.resolve({ propertyId }) })

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

    const propertyMock = createChainableMock()
    propertyMock.single.mockResolvedValue({ data: mockProperty, error: null })

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'properties') return propertyMock
      return createChainableMock()
    })

    const request = createTestRequest(`${baseUrl}/api/ical/${propertyId}?token=wrong-token`)
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

    const propertyMock = createChainableMock()
    propertyMock.single.mockResolvedValue({ data: mockProperty, error: null })

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'properties') return propertyMock
      return createChainableMock()
    })

    const request = createTestRequest(`${baseUrl}/api/ical/${propertyId}`)
    const response = await GET(request, { params: Promise.resolve({ propertyId }) })

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe('Invalid or missing token')
  })

  // Test 4: Non-existent property returns 404
  it('should return 404 when property does not exist', async () => {
    const propertyMock = createChainableMock()
    propertyMock.single.mockResolvedValue({ data: null, error: { message: 'Not found' } })

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'properties') return propertyMock
      return createChainableMock()
    })

    const request = createTestRequest(`${baseUrl}/api/ical/${propertyId}?token=${validToken}`)
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

    const propertyMock = createChainableMock()
    propertyMock.single.mockResolvedValue({ data: mockProperty, error: null })

    const blocksMock = createChainableMock()
    blocksMock.order.mockResolvedValue({ data: [], error: null })

    const listingsMock = createChainableMock()
    listingsMock.eq.mockResolvedValue({ data: [], error: null })

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'properties') return propertyMock
      if (table === 'calendar_blocks') return blocksMock
      if (table === 'property_listings') return listingsMock
      return createChainableMock()
    })

    mockGenerateICalWithBlocks.mockReturnValue(emptyICalData)

    const request = createTestRequest(`${baseUrl}/api/ical/${propertyId}?token=${validToken}`)
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

    const propertyMock = createChainableMock()
    propertyMock.single.mockResolvedValue({ data: mockProperty, error: null })

    const listingsMock = createChainableMock()
    listingsMock.eq.mockResolvedValue({
      data: [{ id: 'listing-1', ical_url: 'url1', platform_id: 'p1', sync_enabled: true, is_active: true }],
      error: null,
    })

    const reservationsMock = createChainableMock()
    reservationsMock.in.mockReturnValue(reservationsMock)
    reservationsMock.neq.mockReturnValue(reservationsMock)
    reservationsMock.order.mockResolvedValue({ data: null, error: { message: 'Database connection error' } })

    const blocksMock = createChainableMock()
    blocksMock.order.mockResolvedValue({ data: [], error: null })

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'properties') return propertyMock
      if (table === 'property_listings') return listingsMock
      if (table === 'reservations') return reservationsMock
      if (table === 'calendar_blocks') return blocksMock
      return createChainableMock()
    })

    const request = createTestRequest(`${baseUrl}/api/ical/${propertyId}?token=${validToken}`)
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

    const propertyMock = createChainableMock()
    propertyMock.single.mockResolvedValue({ data: mockProperty, error: null })

    const listingsMock = createChainableMock()
    listingsMock.eq.mockResolvedValue({ data: mockListings, error: null })

    const reservationsMock = createChainableMock()
    reservationsMock.in.mockReturnValue(reservationsMock)
    reservationsMock.neq.mockReturnValue(reservationsMock)
    reservationsMock.order.mockResolvedValue({ data: mockReservations, error: null })

    const blocksMock = createChainableMock()
    blocksMock.order.mockResolvedValue({ data: [], error: null })

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'properties') return propertyMock
      if (table === 'property_listings') return listingsMock
      if (table === 'reservations') return reservationsMock
      if (table === 'calendar_blocks') return blocksMock
      return createChainableMock()
    })

    mockGenerateICalWithBlocks.mockReturnValue(expectedICalData)

    const request = createTestRequest(`${baseUrl}/api/ical/${propertyId}?token=${validToken}`)
    const response = await GET(request, { params: Promise.resolve({ propertyId }) })

    expect(response.status).toBe(200)
    expect(mockGenerateICalWithBlocks).toHaveBeenCalled()
    expect(reservationsMock.select).toHaveBeenCalledWith(
      expect.stringContaining('properties:properties!property_listings_property_org_fk')
    )
  })

  // Test 8: Content-Disposition header is set correctly
  it('should set correct Content-Disposition header for download', async () => {
    const mockProperty = {
      id: propertyId,
      ical_export_token: validToken,
    }

    const propertyMock = createChainableMock()
    propertyMock.single.mockResolvedValue({ data: mockProperty, error: null })

    const blocksMock = createChainableMock()
    blocksMock.order.mockResolvedValue({ data: [], error: null })

    const listingsMock = createChainableMock()
    listingsMock.eq.mockResolvedValue({ data: [], error: null })

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'properties') return propertyMock
      if (table === 'calendar_blocks') return blocksMock
      if (table === 'property_listings') return listingsMock
      return createChainableMock()
    })

    mockGenerateICalWithBlocks.mockReturnValue('BEGIN:VCALENDAR\nEND:VCALENDAR')

    const request = createTestRequest(`${baseUrl}/api/ical/${propertyId}?token=${validToken}`)
    const response = await GET(request, { params: Promise.resolve({ propertyId }) })

    const disposition = response.headers.get('Content-Disposition')
    expect(disposition).toContain('attachment')
    expect(disposition).toContain(`property-${propertyId}.ics`)
  })
})
