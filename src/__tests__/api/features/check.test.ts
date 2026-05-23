import { GET } from '@/app/api/features/check/route'
import { createClient } from '@supabase/supabase-js'

jest.mock('@supabase/supabase-js')
jest.mock('@/lib/features/hasFeature', () => ({
  hasFeature: jest.fn(),
  FEATURE_MATRIX: {
    cleaner_portal: ['expansao', 'premium'],
    advanced_reports: ['expansao', 'premium'],
    api_access: ['premium'],
    forecast_bi: ['premium'],
  },
}))

describe('GET /api/features/check', () => {
  let mockSupabase: Record<string, jest.Mock>
  let mockHasFeature: jest.Mock

  beforeEach(async () => {
    jest.clearAllMocks()
    const module = await import('@/lib/features/hasFeature')
    mockHasFeature = module.hasFeature

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

  test('should return 400 when feature parameter is missing', async () => {
    const request = new Request('http://localhost/api/features/check?org_id=test-org')

    const response = await GET(request)

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('Invalid or missing feature')
  })

  test('should return 400 when org_id parameter is missing', async () => {
    const request = new Request('http://localhost/api/features/check?feature=cleaner_portal')

    const response = await GET(request)

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('Missing org_id')
  })

  test('should return 400 when feature is invalid', async () => {
    const request = new Request(
      'http://localhost/api/features/check?feature=invalid_feature&org_id=test-org'
    )

    const response = await GET(request)

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('Invalid or missing feature')
    expect(data.validFeatures).toBeDefined()
  })

  test('should return hasAccess=true for allowed features', async () => {
    mockHasFeature.mockResolvedValue(true)
    mockSupabase.single.mockResolvedValue({
      data: { plan: 'premium' },
      error: null,
    })

    const request = new Request(
      'http://localhost/api/features/check?feature=api_access&org_id=premium-org'
    )

    const response = await GET(request)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.hasAccess).toBe(true)
    expect(data.feature).toBe('api_access')
    expect(data.plan).toBe('premium')
    expect(data.message).toBeUndefined()
  })

  test('should return hasAccess=false for blocked features', async () => {
    mockHasFeature.mockResolvedValue(false)
    mockSupabase.single.mockResolvedValue({
      data: { plan: 'essencial' },
      error: null,
    })

    const request = new Request(
      'http://localhost/api/features/check?feature=cleaner_portal&org_id=essencial-org'
    )

    const response = await GET(request)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.hasAccess).toBe(false)
    expect(data.message).toContain('Feature not available')
  })

  test('should default to essencial plan when subscription not found', async () => {
    mockHasFeature.mockResolvedValue(false)
    mockSupabase.single.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116' },
    })

    const request = new Request(
      'http://localhost/api/features/check?feature=api_access&org_id=new-org'
    )

    const response = await GET(request)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.plan).toBe('essencial')
  })

  test('should handle database errors gracefully', async () => {
    mockHasFeature.mockResolvedValue(false)
    mockSupabase.single.mockRejectedValue(new Error('DB Error'))

    const request = new Request(
      'http://localhost/api/features/check?feature=cleaner_portal&org_id=error-org'
    )

    const response = await GET(request)

    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data.error).toBe('Internal server error')
  })

  test('should include organizationId in response', async () => {
    mockHasFeature.mockResolvedValue(true)
    mockSupabase.single.mockResolvedValue({
      data: { plan: 'premium' },
      error: null,
    })

    const request = new Request(
      'http://localhost/api/features/check?feature=forecast_bi&org_id=my-org-123'
    )

    const response = await GET(request)
    const data = await response.json()

    expect(data.organizationId).toBe('my-org-123')
  })
})
