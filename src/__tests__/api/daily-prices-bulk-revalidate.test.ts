import { NextRequest } from 'next/server'
import { POST, DELETE } from '@/app/api/properties/[id]/daily-prices/bulk/route'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { createTestRequest } from '@/__tests__/utils/test-request'

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

function createRequest(body: Record<string, unknown>, method: 'POST' | 'DELETE' = 'POST'): NextRequest {
  return createTestRequest('http://localhost/api/properties/prop-123/daily-prices/bulk', {
    method,
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('daily-prices bulk revalidation', () => {
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()

    const propertyChain = {
      select: jest.fn(() => propertyChain),
      eq: jest.fn(() => propertyChain),
      single: jest.fn(),
    }

    const upsertResult = {
      select: jest.fn(async () => ({
        data: [],
        error: null,
      })),
    }

    const deleteChain = {
      eq: jest.fn(() => deleteChain),
      in: jest.fn(async () => ({
        error: null,
      })),
    }

    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn((table: string) => {
        if (table === 'properties') return propertyChain
        if (table === 'property_daily_prices') {
          return {
            upsert: jest.fn(() => upsertResult),
            delete: jest.fn(() => deleteChain),
          }
        }
        return {
          upsert: jest.fn(() => upsertResult),
          delete: jest.fn(() => deleteChain),
        }
      }),
    }

    ;(createAdminClient as jest.Mock).mockResolvedValue(mockSupabase)
    propertyChain.single.mockResolvedValue({
      data: { id: 'prop-123', slug: 'test-property' },
      error: null,
    })
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
    })
  })

  it('revalidates public pages after bulk price upsert', async () => {
    const request = createRequest({
      operations: [
        { date: '2026-09-01', price: 160 },
        { date: '2026-09-02', price: 160 },
      ],
    }, 'POST')

    const response = await POST(request, { params: Promise.resolve({ id: 'prop-123' }) })
    const json = await response.json()

    expect(response.status).toBe(201)
    expect(json.success).toBe(true)
    expect(revalidatePath).toHaveBeenCalledWith('/p/test-property')
    expect(revalidatePath).toHaveBeenCalledWith('/p/test-property/checkout')
    expect(revalidatePath).toHaveBeenCalledWith('/booking')
  })

  it('revalidates public pages after bulk price delete', async () => {
    const request = createRequest({
      dates: ['2026-09-01', '2026-09-02'],
    }, 'DELETE')

    const response = await DELETE(request, { params: Promise.resolve({ id: 'prop-123' }) })
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(revalidatePath).toHaveBeenCalledWith('/p/test-property')
    expect(revalidatePath).toHaveBeenCalledWith('/p/test-property/checkout')
    expect(revalidatePath).toHaveBeenCalledWith('/booking')
  })
})
