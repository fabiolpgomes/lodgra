import { renderHook, act, waitFor } from '@testing-library/react'
import { useBillingPreview } from '@/hooks/useBillingPreview'

describe('useBillingPreview Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Initial state', () => {
    test('should start with loading=true', () => {
      ;(global.fetch as jest.Mock).mockImplementation(
        () =>
          new Promise(() => {
            // Never resolves
          })
      )

      const { result } = renderHook(() => useBillingPreview('org-123'))

      expect(result.current.loading).toBe(true)
      expect(result.current.error).toBeNull()
      expect(result.current.subscription).toBeNull()
      expect(result.current.propertyCount).toBe(0)
    })

    test('should handle missing orgId', () => {
      const { result } = renderHook(() => useBillingPreview(''))

      expect(result.current.loading).toBe(false)
      expect(result.current.error).toContain('No organization ID')
    })
  })

  describe('Fetching subscription and property data', () => {
    test('should fetch subscription and property count', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            plan: 'premium',
            status: 'active',
            current_period_end: '2026-06-23',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            currentCount: 5,
            limit: 10,
            canCreate: true,
          }),
        })

      const { result } = renderHook(() => useBillingPreview('org-123'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.subscription?.plan).toBe('premium')
      expect(result.current.propertyCount).toBe(5)
    })

    test('should make correct API calls', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ plan: 'essencial' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ currentCount: 1 }),
        })

      renderHook(() => useBillingPreview('org-123'))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/billing/subscription')
        expect(global.fetch).toHaveBeenCalledWith('/api/properties/check-limit?org_id=org-123')
      })
    })
  })

  describe('Different plans', () => {
    test('should handle Essencial plan', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ plan: 'essencial' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ currentCount: 1 }),
        })

      const { result } = renderHook(() => useBillingPreview('org-123'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.subscription?.plan).toBe('essencial')
    })

    test('should handle Expansão plan', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ plan: 'expansao' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ currentCount: 3 }),
        })

      const { result } = renderHook(() => useBillingPreview('org-123'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.subscription?.plan).toBe('expansao')
      expect(result.current.propertyCount).toBe(3)
    })

    test('should handle Premium plan', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ plan: 'premium' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ currentCount: 10 }),
        })

      const { result } = renderHook(() => useBillingPreview('org-123'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.subscription?.plan).toBe('premium')
      expect(result.current.propertyCount).toBe(10)
    })
  })

  describe('Error handling', () => {
    test('should handle subscription fetch error', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      const { result } = renderHook(() => useBillingPreview('org-123'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toContain('subscription')
    })

    test('should handle network error', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useBillingPreview('org-123'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toContain('Network error')
    })

    test('should handle null subscription gracefully', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => null,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ currentCount: 0 }),
        })

      const { result } = renderHook(() => useBillingPreview('org-123'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.subscription).toBeNull()
      expect(result.current.error).toBeNull()
    })
  })

  describe('Property count variations', () => {
    test('should handle 0 properties', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ plan: 'essencial' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ currentCount: 0 }),
        })

      const { result } = renderHook(() => useBillingPreview('org-123'))

      await waitFor(() => {
        expect(result.current.propertyCount).toBe(0)
      })
    })

    test('should handle high property count (extras)', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ plan: 'premium' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ currentCount: 20 }),
        })

      const { result } = renderHook(() => useBillingPreview('org-123'))

      await waitFor(() => {
        expect(result.current.propertyCount).toBe(20)
      })
    })

    test('should default currentCount to 0 if missing', async () => {
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ plan: 'premium' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ limit: 10 }), // Missing currentCount
        })

      const { result } = renderHook(() => useBillingPreview('org-123'))

      await waitFor(() => {
        expect(result.current.propertyCount).toBe(0)
      })
    })
  })
})
