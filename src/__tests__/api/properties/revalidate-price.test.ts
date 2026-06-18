import { POST, GET } from '@/app/api/properties/[id]/revalidate-price/route'
import { revalidateTag } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

// Mock dependencies
jest.mock('next/cache')
jest.mock('@/lib/supabase/admin')

const mockRevalidateTag = revalidateTag as jest.MockedFunction<typeof revalidateTag>
const mockCreateAdminClient = createAdminClient as jest.MockedFunction<typeof createAdminClient>

describe('POST /api/properties/:id/revalidate-price', () => {
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    }

    mockCreateAdminClient.mockReturnValue(mockSupabase)
  })

  it('should revalidate cache for valid property', async () => {
    const propertyId = 'test-property-123'
    const propertySlug = 'beachfront-apartment'

    mockSupabase.single.mockResolvedValue({
      data: {
        id: propertyId,
        slug: propertySlug,
      },
      error: null,
    })

    const request = new Request('http://localhost:3000/api/properties/test-property-123/revalidate-price', {
      method: 'POST',
      body: JSON.stringify({
        newPrice: 150,
        reason: 'manual-update',
      }),
    })

    const response = await POST(request as any, {
      params: Promise.resolve({ id: propertyId }),
    })

    expect(response.status).toBe(200)
    expect(mockRevalidateTag).toHaveBeenCalledWith(`property-${propertyId}`)

    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.propertySlug).toBe(propertySlug)
  })

  it('should return 400 if property ID is missing', async () => {
    const request = new Request('http://localhost:3000/api/properties/undefined/revalidate-price', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const response = await POST(request as any, {
      params: Promise.resolve({ id: '' }),
    })

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('required')
  })

  it('should return 404 if property not found', async () => {
    mockSupabase.single.mockResolvedValue({
      data: null,
      error: new Error('Not found'),
    })

    const request = new Request('http://localhost:3000/api/properties/fake-id/revalidate-price', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const response = await POST(request as any, {
      params: Promise.resolve({ id: 'fake-id' }),
    })

    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.error).toContain('not found')
  })

  it('should include 24h cache expiry in response', async () => {
    const propertyId = 'test-property-123'

    mockSupabase.single.mockResolvedValue({
      data: { id: propertyId, slug: 'test' },
      error: null,
    })

    const request = new Request('http://localhost:3000/api/properties/test-property-123/revalidate-price', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const response = await POST(request as any, {
      params: Promise.resolve({ id: propertyId }),
    })

    const data = await response.json()
    const nextUpdate = new Date(data.nextUpdate)
    const now = new Date()

    // Should be approximately 24 hours from now
    const diffInMs = nextUpdate.getTime() - now.getTime()
    const diffInHours = diffInMs / (1000 * 60 * 60)

    expect(diffInHours).toBeGreaterThan(23.9)
    expect(diffInHours).toBeLessThan(24.1)
  })
})

describe('GET /api/properties/:id/revalidate-price', () => {
  it('should return endpoint documentation', async () => {
    const propertyId = 'test-property-123'

    const request = new Request('http://localhost:3000/api/properties/test-property-123/revalidate-price', {
      method: 'GET',
    })

    const response = await GET(request as any, {
      params: Promise.resolve({ id: propertyId }),
    })

    expect(response.status).toBe(200)
    const data = await response.json()

    expect(data.endpoint).toContain(propertyId)
    expect(data.method).toBe('POST')
    expect(data.description).toBeTruthy()
    expect(data.usage).toBeTruthy()
    expect(data.examples).toBeTruthy()
  })

  it('should return 400 if property ID is missing', async () => {
    const request = new Request('http://localhost:3000/api/properties/undefined/revalidate-price', {
      method: 'GET',
    })

    const response = await GET(request as any, {
      params: Promise.resolve({ id: '' }),
    })

    expect(response.status).toBe(400)
  })
})
