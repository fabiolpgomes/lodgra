import { hasFeature, FEATURE_MATRIX, getAccessibleFeatures } from '@/lib/features/hasFeature'
import { createClient } from '@supabase/supabase-js'

jest.mock('@supabase/supabase-js')

describe('Feature Gating System', () => {
  let mockSupabase: Record<string, jest.Mock>

  beforeEach(() => {
    jest.clearAllMocks()
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(),
    }
    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  describe('FEATURE_MATRIX structure', () => {
    test('should have all required features', () => {
      expect(FEATURE_MATRIX).toHaveProperty('cleaner_portal')
      expect(FEATURE_MATRIX).toHaveProperty('advanced_reports')
      expect(FEATURE_MATRIX).toHaveProperty('api_access')
      expect(FEATURE_MATRIX).toHaveProperty('forecast_bi')
    })

    test('cleaner_portal should include expansao and premium', () => {
      expect(FEATURE_MATRIX.cleaner_portal).toContain('expansao')
      expect(FEATURE_MATRIX.cleaner_portal).toContain('premium')
    })

    test('api_access should only include premium', () => {
      expect(FEATURE_MATRIX.api_access).toContain('premium')
      expect(FEATURE_MATRIX.api_access).not.toContain('expansao')
      expect(FEATURE_MATRIX.api_access).not.toContain('essencial')
    })
  })

  describe('hasFeature - Essencial plan', () => {
    beforeEach(() => {
      mockSupabase.single.mockResolvedValue({
        data: { plan: 'essencial' },
        error: null,
      })
    })

    test('should NOT have access to cleaner_portal', async () => {
      const result = await hasFeature('essencial-org', 'cleaner_portal')
      expect(result).toBe(false)
    })

    test('should NOT have access to advanced_reports', async () => {
      const result = await hasFeature('essencial-org', 'advanced_reports')
      expect(result).toBe(false)
    })

    test('should NOT have access to api_access', async () => {
      const result = await hasFeature('essencial-org', 'api_access')
      expect(result).toBe(false)
    })

    test('should NOT have access to forecast_bi', async () => {
      const result = await hasFeature('essencial-org', 'forecast_bi')
      expect(result).toBe(false)
    })
  })

  describe('hasFeature - Expansão plan', () => {
    beforeEach(() => {
      mockSupabase.single.mockResolvedValue({
        data: { plan: 'expansao' },
        error: null,
      })
    })

    test('should HAVE access to cleaner_portal', async () => {
      const result = await hasFeature('expansao-org', 'cleaner_portal')
      expect(result).toBe(true)
    })

    test('should HAVE access to advanced_reports', async () => {
      const result = await hasFeature('expansao-org', 'advanced_reports')
      expect(result).toBe(true)
    })

    test('should NOT have access to api_access', async () => {
      const result = await hasFeature('expansao-org', 'api_access')
      expect(result).toBe(false)
    })

    test('should NOT have access to forecast_bi', async () => {
      const result = await hasFeature('expansao-org', 'forecast_bi')
      expect(result).toBe(false)
    })
  })

  describe('hasFeature - Premium plan', () => {
    beforeEach(() => {
      mockSupabase.single.mockResolvedValue({
        data: { plan: 'premium' },
        error: null,
      })
    })

    test('should HAVE access to ALL features', async () => {
      expect(await hasFeature('premium-org', 'cleaner_portal')).toBe(true)
      expect(await hasFeature('premium-org', 'advanced_reports')).toBe(true)
      expect(await hasFeature('premium-org', 'api_access')).toBe(true)
      expect(await hasFeature('premium-org', 'forecast_bi')).toBe(true)
    })
  })

  describe('hasFeature - Error handling', () => {
    test('should default to essencial when subscription not found (PGRST116)', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }, // No rows found
      })

      const result = await hasFeature('new-org', 'cleaner_portal')
      expect(result).toBe(false) // essencial doesn't have cleaner_portal
    })

    test('should return false (deny access) on database error', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed', code: 'ERROR' },
      })

      const result = await hasFeature('error-org', 'cleaner_portal')
      expect(result).toBe(false)
    })

    test('should handle async errors gracefully', async () => {
      mockSupabase.single.mockRejectedValue(new Error('Network error'))

      const result = await hasFeature('error-org', 'api_access')
      expect(result).toBe(false)
    })
  })

  describe('getAccessibleFeatures', () => {
    test('Essencial org should have no premium features', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { plan: 'essencial' },
        error: null,
      })

      const features = await getAccessibleFeatures('essencial-org')
      expect(features).toEqual([])
    })

    test('Expansão org should have cleaner_portal and advanced_reports', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { plan: 'expansao' },
        error: null,
      })

      const features = await getAccessibleFeatures('expansao-org')
      expect(features).toContain('cleaner_portal')
      expect(features).toContain('advanced_reports')
      expect(features).not.toContain('api_access')
      expect(features).not.toContain('forecast_bi')
    })

    test('Premium org should have all features', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { plan: 'premium' },
        error: null,
      })

      const features = await getAccessibleFeatures('premium-org')
      expect(features).toContain('cleaner_portal')
      expect(features).toContain('advanced_reports')
      expect(features).toContain('api_access')
      expect(features).toContain('forecast_bi')
    })
  })

  describe('Legacy plan aliases', () => {
    test('growth plan should have expansao features', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { plan: 'growth' },
        error: null,
      })

      expect(await hasFeature('growth-org', 'cleaner_portal')).toBe(true)
    })

    test('professional plan should have premium features', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { plan: 'professional' },
        error: null,
      })

      expect(await hasFeature('professional-org', 'api_access')).toBe(true)
    })

    test('business plan should have premium features', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { plan: 'business' },
        error: null,
      })

      expect(await hasFeature('business-org', 'forecast_bi')).toBe(true)
    })
  })
})
