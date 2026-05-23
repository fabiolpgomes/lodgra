jest.mock('@/lib/supabase/admin')
jest.mock('@/lib/stripe/client-br')
jest.mock('@/lib/auth/requireRole')
jest.mock('@/lib/middleware/rate-limit')

import { POST, DELETE } from '@/app/api/billing/add-extra-property/route'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripeBR } from '@/lib/stripe/client-br'
import { requireRole } from '@/lib/auth/requireRole'
import { checkBillingRateLimit } from '@/lib/middleware/rate-limit'

describe('POST /api/billing/add-extra-property', () => {
  let mockAdminClient: any
  let mockRequest: any

  beforeEach(() => {
    jest.clearAllMocks()

    mockAdminClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      update: jest.fn().mockReturnThis(),
    }

    ;(createAdminClient as jest.Mock).mockReturnValue(mockAdminClient)
    ;(checkBillingRateLimit as jest.Mock).mockResolvedValue({ allowed: true })
    ;(requireRole as jest.Mock).mockReturnValue({
      authorized: true,
      userId: 'user-123',
      organizationId: 'org-123',
    })

    mockRequest = {
      json: jest.fn(),
    } as any

    process.env.STRIPE_PRICE_ID_PREMIUM_EXTRA_PROPERTY = 'price_extra_property_test'
  })

  describe('Authorization & Validation', () => {
    test('should require admin or gestor role', async () => {
      ;(requireRole as jest.Mock).mockReturnValue({
        authorized: false,
        response: new Response('Unauthorized', { status: 403 }),
      })

      const response = await POST(mockRequest as any)
      expect(response.status).toBe(403)
    })

    test('should return 400 if organization ID missing', async () => {
      ;(requireRole as jest.Mock).mockReturnValue({
        authorized: true,
        userId: 'user-123',
        organizationId: null,
      })

      const response = await POST(mockRequest as any)
      expect(response.status).toBe(404)
    })

    test('should enforce rate limiting', async () => {
      ;(checkBillingRateLimit as jest.Mock).mockResolvedValue({ allowed: false })

      const response = await POST(mockRequest as any)
      expect(response.status).toBe(429)
    })

    test('should return 500 if price ID not configured', async () => {
      delete process.env.STRIPE_PRICE_ID_PREMIUM_EXTRA_PROPERTY

      const response = await POST(mockRequest as any)
      expect(response.status).toBe(500)
    })
  })

  describe('Adding extra properties to Premium subscription', () => {
    beforeEach(() => {
      mockAdminClient.single.mockResolvedValueOnce({
        data: {
          stripe_br_customer_id: 'cus_premium_123',
          subscription_plan: 'premium',
          premium_extra_properties_count: 0,
        },
      })

      ;(stripeBR.subscriptions.list as jest.Mock).mockResolvedValueOnce({
        data: [
          {
            id: 'sub_premium_123',
            items: {
              data: [
                {
                  id: 'si_base_123',
                  price: { id: 'price_premium' },
                  quantity: 1,
                },
              ],
            },
            current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30,
            status: 'active',
          },
        ],
      })

      ;(stripeBR.subscriptions.update as jest.Mock).mockResolvedValueOnce({
        id: 'sub_premium_123',
        items: {
          data: [
            { id: 'si_base_123', price: { id: 'price_premium' }, quantity: 1 },
            { id: 'si_extra_123', price: { id: 'price_extra_property_test' }, quantity: 1 },
          ],
        },
        current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30,
        status: 'active',
      })

      mockAdminClient.update.mockReturnValue(mockAdminClient)
    })

    test('should add extra property item to subscription', async () => {
      const response = await POST(mockRequest as any)

      expect(response.status).toBe(200)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.extra_properties_count).toBe(1)
      expect(data.subscription_id).toBe('sub_premium_123')
      expect(stripeBR.subscriptions.update).toHaveBeenCalled()
    })

    test('should update organization tracking', async () => {
      await POST(mockRequest as any)

      expect(mockAdminClient.update).toHaveBeenCalledWith({
        premium_extra_properties_count: 1,
      })
    })

    test('should reject non-Premium plans', async () => {
      mockAdminClient.single.mockResolvedValueOnce({
        data: {
          stripe_br_customer_id: 'cus_essencial_123',
          subscription_plan: 'essencial',
          premium_extra_properties_count: 0,
        },
      })

      const response = await POST(mockRequest as any)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Premium')
    })

    test('should increment extra properties count', async () => {
      // First call: 0 → 1
      mockAdminClient.single.mockResolvedValueOnce({
        data: {
          stripe_br_customer_id: 'cus_premium_123',
          subscription_plan: 'premium',
          premium_extra_properties_count: 0,
        },
      })

      await POST(mockRequest as any)

      // Second call: 1 → 2
      mockAdminClient.single.mockResolvedValueOnce({
        data: {
          stripe_br_customer_id: 'cus_premium_123',
          subscription_plan: 'premium',
          premium_extra_properties_count: 1,
        },
      })

      const response = await POST(mockRequest as any)

      expect(mockAdminClient.update).toHaveBeenLastCalledWith({
        premium_extra_properties_count: 2,
      })
    })
  })

  describe('Error handling', () => {
    test('should return 400 if no Stripe customer found', async () => {
      mockAdminClient.single.mockResolvedValueOnce({
        data: { stripe_br_customer_id: null },
      })

      const response = await POST(mockRequest as any)
      expect(response.status).toBe(400)
    })

    test('should return 400 if no active subscription', async () => {
      mockAdminClient.single.mockResolvedValueOnce({
        data: {
          stripe_br_customer_id: 'cus_premium_123',
          subscription_plan: 'premium',
          premium_extra_properties_count: 0,
        },
      })

      ;(stripeBR.subscriptions.list as jest.Mock).mockResolvedValueOnce({
        data: [],
      })

      const response = await POST(mockRequest as any)
      expect(response.status).toBe(400)
    })
  })
})

describe('DELETE /api/billing/add-extra-property', () => {
  let mockAdminClient: any
  let mockRequest: any

  beforeEach(() => {
    jest.clearAllMocks()

    mockAdminClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      update: jest.fn().mockReturnThis(),
    }

    ;(createAdminClient as jest.Mock).mockReturnValue(mockAdminClient)
    ;(requireRole as jest.Mock).mockReturnValue({
      authorized: true,
      userId: 'user-123',
      organizationId: 'org-123',
    })

    mockRequest = {} as any

    process.env.STRIPE_PRICE_ID_PREMIUM_EXTRA_PROPERTY = 'price_extra_property_test'
  })

  describe('Removing extra properties', () => {
    beforeEach(() => {
      mockAdminClient.single.mockResolvedValueOnce({
        data: {
          stripe_br_customer_id: 'cus_premium_123',
          premium_extra_properties_count: 1,
        },
      })

      ;(stripeBR.subscriptions.list as jest.Mock).mockResolvedValueOnce({
        data: [
          {
            id: 'sub_premium_123',
            items: {
              data: [
                { id: 'si_base_123', price: { id: 'price_premium' } },
                { id: 'si_extra_123', price: { id: 'price_extra_property_test' } },
              ],
            },
            current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30,
            status: 'active',
          },
        ],
      })

      ;(stripeBR.subscriptions.update as jest.Mock).mockResolvedValueOnce({
        id: 'sub_premium_123',
        items: { data: [{ id: 'si_base_123', price: { id: 'price_premium' } }] },
        current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30,
        status: 'active',
      })

      mockAdminClient.update.mockReturnValue(mockAdminClient)
    })

    test('should remove extra property item from subscription', async () => {
      const response = await DELETE(mockRequest as any)

      expect(response.status).toBe(200)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.extra_properties_count).toBe(0)
      expect(stripeBR.subscriptions.update).toHaveBeenCalled()
    })

    test('should update organization tracking to 0', async () => {
      await DELETE(mockRequest as any)

      expect(mockAdminClient.update).toHaveBeenCalledWith({
        premium_extra_properties_count: 0,
      })
    })

    test('should return 400 if no extra properties to remove', async () => {
      mockAdminClient.single.mockResolvedValueOnce({
        data: {
          stripe_br_customer_id: 'cus_premium_123',
          premium_extra_properties_count: 0,
        },
      })

      const response = await DELETE(mockRequest as any)
      expect(response.status).toBe(400)
    })
  })
})
