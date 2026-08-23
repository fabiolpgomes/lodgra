import { PUT } from '@/app/api/properties/[id]/pricing/route'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { authorizePropertyManagement } from '@/lib/auth/authorizePropertyManagement'
import { createTestRequest } from '@/__tests__/utils/test-request'

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

jest.mock('@/lib/auth/authorizePropertyManagement', () => ({
  authorizePropertyManagement: jest.fn(),
}))

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

describe('PUT /api/properties/[id]/pricing revalidation', () => {
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()

    const pricingChain = {
      select: jest.fn(() => pricingChain),
      eq: jest.fn(() => pricingChain),
      update: jest.fn(() => pricingChain),
      insert: jest.fn(() => pricingChain),
      single: jest.fn(),
    }

    mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'property_prices') return pricingChain
        return pricingChain
      }),
    }

    ;(createAdminClient as jest.Mock).mockReturnValue(mockSupabase)
    ;(authorizePropertyManagement as jest.Mock).mockResolvedValue({
      authorized: true,
      admin: mockSupabase,
      property: {
        id: 'prop-123',
        slug: 'test-property',
        currency: 'EUR',
        organization_id: 'org-123',
      },
    })
  })

  it('revalidates public pages when updating existing pricing', async () => {
    const pricingChain = mockSupabase.from('property_prices')

    pricingChain.single
      .mockResolvedValueOnce({ data: { id: 'price-1' }, error: null })
      .mockResolvedValueOnce({
        data: {
          id: 'price-1',
          property_id: 'prop-123',
          base_price: 160,
          weekend_price: 180,
        },
        error: null,
      })

    const request = createTestRequest('http://localhost/api/properties/prop-123/pricing', {
      method: 'PUT',
      body: JSON.stringify({
        base_price: 160,
        weekend_price: 180,
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await PUT(request as any, { params: Promise.resolve({ id: 'prop-123' }) })
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(revalidatePath).toHaveBeenCalledWith('/p/test-property')
    expect(revalidatePath).toHaveBeenCalledWith('/p/test-property/checkout')
    expect(revalidatePath).toHaveBeenCalledWith('/booking')
    expect(pricingChain.update).toHaveBeenCalled()
  })

  it('revalidates public pages when creating new pricing', async () => {
    const pricingChain = mockSupabase.from('property_prices')

    pricingChain.single
      .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
      .mockResolvedValueOnce({
        data: {
          id: 'price-2',
          property_id: 'prop-123',
          base_price: 170,
          weekend_price: null,
        },
        error: null,
      })

    const request = createTestRequest('http://localhost/api/properties/prop-123/pricing', {
      method: 'PUT',
      body: JSON.stringify({
        base_price: 170,
        weekend_price: null,
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await PUT(request as any, { params: Promise.resolve({ id: 'prop-123' }) })
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(revalidatePath).toHaveBeenCalledWith('/p/test-property')
    expect(revalidatePath).toHaveBeenCalledWith('/p/test-property/checkout')
    expect(revalidatePath).toHaveBeenCalledWith('/booking')
    expect(pricingChain.insert).toHaveBeenCalled()
  })
})
