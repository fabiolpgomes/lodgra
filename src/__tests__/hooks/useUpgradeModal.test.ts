import { renderHook, act } from '@testing-library/react'
import { useUpgradeModal } from '@/hooks/useUpgradeModal'

describe('useUpgradeModal Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    delete (window as unknown as Record<string, unknown>).location
    ;(window as unknown as Record<string, unknown>).location = { href: '' }
  })

  describe('Initial State', () => {
    test('should initialize with isOpen=false', () => {
      const { result } = renderHook(() =>
        useUpgradeModal({ currentPlan: 'essencial' })
      )

      expect(result.current.isOpen).toBe(false)
      expect(result.current.blockedFeature).toBeNull()
      expect(result.current.reason).toBe('feature_blocked')
    })

    test('should preserve currentPlan in state', () => {
      const { result } = renderHook(() =>
        useUpgradeModal({ currentPlan: 'premium' })
      )

      expect(result.current.currentPlan).toBe('premium')
    })
  })

  describe('openForFeature', () => {
    test('should set isOpen=true and blockedFeature', () => {
      const { result } = renderHook(() =>
        useUpgradeModal({ currentPlan: 'essencial' })
      )

      act(() => {
        result.current.openForFeature('cleaner_portal')
      })

      expect(result.current.isOpen).toBe(true)
      expect(result.current.blockedFeature).toBe('cleaner_portal')
      expect(result.current.reason).toBe('feature_blocked')
    })

    test('should work with different features', () => {
      const { result } = renderHook(() =>
        useUpgradeModal({ currentPlan: 'expansao' })
      )

      act(() => {
        result.current.openForFeature('api_access')
      })

      expect(result.current.blockedFeature).toBe('api_access')
    })
  })

  describe('openForPropertyLimit', () => {
    test('should set isOpen=true and reason=property_limit', () => {
      const { result } = renderHook(() =>
        useUpgradeModal({ currentPlan: 'essencial' })
      )

      act(() => {
        result.current.openForPropertyLimit()
      })

      expect(result.current.isOpen).toBe(true)
      expect(result.current.blockedFeature).toBeNull()
      expect(result.current.reason).toBe('property_limit')
    })
  })

  describe('close', () => {
    test('should set isOpen=false', () => {
      const { result } = renderHook(() =>
        useUpgradeModal({ currentPlan: 'essencial' })
      )

      act(() => {
        result.current.openForFeature('cleaner_portal')
      })

      expect(result.current.isOpen).toBe(true)

      act(() => {
        result.current.close()
      })

      expect(result.current.isOpen).toBe(false)
    })
  })

  describe('handleAddExtra', () => {
    test('should redirect to properties page with action=add-extra', () => {
      const { result } = renderHook(() =>
        useUpgradeModal({ currentPlan: 'essencial' })
      )

      act(() => {
        result.current.handleAddExtra()
      })

      expect(window.location.href).toContain('/dashboard/properties')
      expect(window.location.href).toContain('action=add-extra')
    })
  })

  describe('handleUpgrade', () => {
    test('should redirect to custom checkout URL if provided', () => {
      const customUrl = 'https://stripe.com/checkout/custom123'
      const { result } = renderHook(() =>
        useUpgradeModal({ currentPlan: 'essencial', stripeCheckoutUrl: customUrl })
      )

      act(() => {
        result.current.handleUpgrade('expansao')
      })

      expect(window.location.href).toBe(customUrl)
    })

    test('should redirect to checkout endpoint with plan parameter', () => {
      const { result } = renderHook(() =>
        useUpgradeModal({ currentPlan: 'essencial' })
      )

      act(() => {
        result.current.handleUpgrade('premium')
      })

      expect(window.location.href).toContain('/api/billing/checkout')
      expect(window.location.href).toContain('plan=premium')
    })

    test('should handle different plans', () => {
      const { result } = renderHook(() =>
        useUpgradeModal({ currentPlan: 'expansao' })
      )

      act(() => {
        result.current.handleUpgrade('premium')
      })

      expect(window.location.href).toContain('plan=premium')
    })
  })

  describe('State Persistence', () => {
    test('should maintain state across multiple operations', () => {
      const { result } = renderHook(() =>
        useUpgradeModal({ currentPlan: 'essencial' })
      )

      // Open for feature
      act(() => {
        result.current.openForFeature('cleaner_portal')
      })

      expect(result.current.isOpen).toBe(true)
      expect(result.current.blockedFeature).toBe('cleaner_portal')

      // Close
      act(() => {
        result.current.close()
      })

      expect(result.current.isOpen).toBe(false)

      // Open for property limit
      act(() => {
        result.current.openForPropertyLimit()
      })

      expect(result.current.isOpen).toBe(true)
      expect(result.current.reason).toBe('property_limit')
    })
  })

  describe('Return Value Structure', () => {
    test('should return all expected properties', () => {
      const { result } = renderHook(() =>
        useUpgradeModal({ currentPlan: 'premium' })
      )

      expect(result.current).toHaveProperty('isOpen')
      expect(result.current).toHaveProperty('blockedFeature')
      expect(result.current).toHaveProperty('reason')
      expect(result.current).toHaveProperty('currentPlan')
      expect(result.current).toHaveProperty('openForFeature')
      expect(result.current).toHaveProperty('openForPropertyLimit')
      expect(result.current).toHaveProperty('close')
      expect(result.current).toHaveProperty('handleAddExtra')
      expect(result.current).toHaveProperty('handleUpgrade')
    })
  })
})
