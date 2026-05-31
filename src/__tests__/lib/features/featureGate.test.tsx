import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { FeatureGate, useFeatureAccess } from '@/lib/features/featureGate'
import { FeatureName } from '@/lib/features/hasFeature'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}))

describe('FeatureGate Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('When feature is accessible', () => {
    beforeEach(() => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          hasAccess: true,
          feature: 'api_access',
          plan: 'premium',
        }),
      })
    })

    test('should render children when feature is accessible', async () => {
      render(
        <FeatureGate feature="api_access" orgId="test-org">
          <div>Feature Content</div>
        </FeatureGate>
      )

      await waitFor(() => {
        expect(screen.getByText('Feature Content')).toBeInTheDocument()
      })
    })

    test('should make correct API call with feature and orgId', async () => {
      render(
        <FeatureGate feature="api_access" orgId="test-org-123">
          <div>Content</div>
        </FeatureGate>
      )

      await waitFor(() => {
        const call = (global.fetch as jest.Mock).mock.calls[0][0]
        expect(call).toContain('feature=api_access')
        expect(call).toContain('org_id=test-org-123')
      })
    })
  })

  describe('When feature is NOT accessible', () => {
    beforeEach(() => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          hasAccess: false,
          feature: 'forecast_bi',
          plan: 'expansao',
        }),
      })
    })

    test('should show fallback when feature is not accessible', async () => {
      const fallback = <div>Feature not available</div>
      render(
        <FeatureGate feature="forecast_bi" orgId="test-org" fallback={fallback}>
          <div>Should not see this</div>
        </FeatureGate>
      )

      await waitFor(() => {
        expect(screen.getByText('Feature not available')).toBeInTheDocument()
      })
    })

    test('should show default fallback UI when no custom fallback provided', async () => {
      render(
        <FeatureGate feature="api_access" orgId="test-org">
          <div>Should not see this</div>
        </FeatureGate>
      )

      await waitFor(() => {
        expect(
          screen.getByText('Upgrade your plan to access api access.')
        ).toBeInTheDocument()
      })
    })

    test('should call onBlocked callback when feature is blocked', async () => {
      const onBlocked = jest.fn()

      render(
        <FeatureGate
          feature="forecast_bi"
          orgId="test-org"
          onBlocked={onBlocked}
        >
          <div>Content</div>
        </FeatureGate>
      )

      await waitFor(() => {
        expect(onBlocked).toHaveBeenCalledWith('forecast_bi', 'expansao')
      })
    })

    test('should show loading state initially', () => {
      ;(global.fetch as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ hasAccess: true }),
                }),
              100
            )
          )
      )

      render(
        <FeatureGate feature="api_access" orgId="test-org">
          <div>Content</div>
        </FeatureGate>
      )

      expect(screen.getByText(/Loading/i)).toBeInTheDocument()
    })
  })

  describe('Error handling', () => {
    test('should show fallback on API error', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to check feature' }),
      })

      render(
        <FeatureGate
          feature="api_access"
          orgId="test-org"
          fallback={<div>Error occurred</div>}
        >
          <div>Content</div>
        </FeatureGate>
      )

      await waitFor(() => {
        expect(screen.getByText('Error occurred')).toBeInTheDocument()
      })
    })

    test('should show fallback on network error', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      )

      const fallback = <div>Network unavailable</div>
      render(
        <FeatureGate
          feature="api_access"
          orgId="test-org"
          fallback={fallback}
        >
          <div>Content</div>
        </FeatureGate>
      )

      await waitFor(() => {
        expect(screen.getByText('Network unavailable')).toBeInTheDocument()
      })
    })
  })

  describe('Feature name formatting', () => {
    test('should replace underscores with spaces in feature names', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          hasAccess: false,
          feature: 'advanced_reports',
          plan: 'essencial',
        }),
      })

      render(
        <FeatureGate feature="advanced_reports" orgId="test-org">
          <div>Content</div>
        </FeatureGate>
      )

      await waitFor(() => {
        expect(
          screen.getByText(/Upgrade your plan to access advanced reports/i)
        ).toBeInTheDocument()
      })
    })
  })

  describe('Re-checking on prop changes', () => {
    test('should re-fetch when orgId changes', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          hasAccess: true,
          feature: 'api_access',
          plan: 'premium',
        }),
      })

      const { rerender } = render(
        <FeatureGate feature="api_access" orgId="org-1">
          <div>Content</div>
        </FeatureGate>
      )

      ;(global.fetch as jest.Mock).mockClear()
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          hasAccess: true,
          feature: 'api_access',
          plan: 'premium',
        }),
      })

      rerender(
        <FeatureGate feature="api_access" orgId="org-2">
          <div>Content</div>
        </FeatureGate>
      )

      await waitFor(() => {
        const call = (global.fetch as jest.Mock).mock.calls[0]?.[0]
        expect(call).toContain('org_id=org-2')
      })
    })

    test('should re-fetch when feature changes', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          hasAccess: true,
          feature: 'api_access',
          plan: 'premium',
        }),
      })

      const { rerender } = render(
        <FeatureGate feature="api_access" orgId="test-org">
          <div>Content</div>
        </FeatureGate>
      )

      ;(global.fetch as jest.Mock).mockClear()
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          hasAccess: false,
          feature: 'forecast_bi',
          plan: 'expansao',
        }),
      })

      rerender(
        <FeatureGate feature="forecast_bi" orgId="test-org">
          <div>Content</div>
        </FeatureGate>
      )

      await waitFor(() => {
        const call = (global.fetch as jest.Mock).mock.calls[0]?.[0]
        expect(call).toContain('feature=forecast_bi')
      })
    })
  })
})

describe('useFeatureAccess Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Initial loading state', () => {
    test('should start with loading=true', () => {
      ;(global.fetch as jest.Mock).mockImplementation(
        () =>
          new Promise(() => {
            // Never resolves, keeps loading
          })
      )

      const TestComponent = () => {
        const { loading, hasAccess } = useFeatureAccess('api_access', 'test-org')
        return (
          <div>
            {loading && <div>Loading...</div>}
            {!loading && hasAccess && <div>Has Access</div>}
            {!loading && !hasAccess && <div>No Access</div>}
          </div>
        )
      }

      render(<TestComponent />)
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })
  })

  describe('When feature is accessible', () => {
    test('should return hasAccess=true and correct plan', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          hasAccess: true,
          feature: 'api_access',
          plan: 'premium',
        }),
      })

      const TestComponent = () => {
        const { hasAccess, loading, plan } = useFeatureAccess(
          'api_access',
          'test-org'
        )

        if (loading) return <div>Loading...</div>

        return (
          <div>
            <div>Access: {hasAccess ? 'Yes' : 'No'}</div>
            <div>Plan: {plan}</div>
          </div>
        )
      }

      render(<TestComponent />)

      await waitFor(() => {
        expect(screen.getByText('Access: Yes')).toBeInTheDocument()
        expect(screen.getByText('Plan: premium')).toBeInTheDocument()
      })
    })
  })

  describe('When feature is NOT accessible', () => {
    test('should return hasAccess=false', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          hasAccess: false,
          feature: 'forecast_bi',
          plan: 'expansao',
        }),
      })

      const TestComponent = () => {
        const { hasAccess, loading } = useFeatureAccess('forecast_bi', 'test-org')

        if (loading) return <div>Loading...</div>

        return <div>Access: {hasAccess ? 'Yes' : 'No'}</div>
      }

      render(<TestComponent />)

      await waitFor(() => {
        expect(screen.getByText('Access: No')).toBeInTheDocument()
      })
    })
  })

  describe('Error handling', () => {
    test('should return error message on API failure', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'Invalid feature name',
        }),
      })

      const TestComponent = () => {
        const { error, loading, hasAccess } = useFeatureAccess(
          'invalid_feature' as unknown as FeatureName,
          'test-org'
        )

        if (loading) return <div>Loading...</div>

        return (
          <div>
            <div>Error: {error}</div>
            <div>Access: {hasAccess ? 'Yes' : 'No'}</div>
          </div>
        )
      }

      render(<TestComponent />)

      await waitFor(() => {
        expect(screen.getByText('Error: Invalid feature name')).toBeInTheDocument()
        expect(screen.getByText('Access: No')).toBeInTheDocument()
      })
    })

    test('should return error on network failure', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network timeout')
      )

      const TestComponent = () => {
        const { error, loading, hasAccess } = useFeatureAccess(
          'api_access',
          'test-org'
        )

        if (loading) return <div>Loading...</div>

        return (
          <div>
            <div>Error: {error}</div>
            <div>Access: {hasAccess ? 'Yes' : 'No'}</div>
          </div>
        )
      }

      render(<TestComponent />)

      await waitFor(() => {
        expect(screen.getByText('Error: Network timeout')).toBeInTheDocument()
        expect(screen.getByText('Access: No')).toBeInTheDocument()
      })
    })
  })

  describe('Plan state', () => {

    test('should update plan from API response', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          hasAccess: true,
          feature: 'advanced_reports',
          plan: 'expansao',
        }),
      })

      const TestComponent = () => {
        const { loading, plan } = useFeatureAccess(
          'advanced_reports',
          'test-org'
        )

        if (loading) return <div>Loading...</div>

        return <div>Plan: {plan}</div>
      }

      render(<TestComponent />)

      await waitFor(() => {
        expect(screen.getByText('Plan: expansao')).toBeInTheDocument()
      })
    })
  })

  describe('Dependencies re-run', () => {
    test('should re-check when feature changes', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          hasAccess: true,
          plan: 'premium',
        }),
      })

      const { rerender } = render(
        <TestHookWrapper feature="api_access" />
      )

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
      })

      ;(global.fetch as jest.Mock).mockClear()
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          hasAccess: false,
          plan: 'essencial',
        }),
      })

      rerender(<TestHookWrapper feature="forecast_bi" />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })
    })

    test('should re-check when orgId changes', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          hasAccess: true,
          plan: 'premium',
        }),
      })

      const { rerender } = render(
        <TestHookWrapper feature="api_access" orgId="org-1" />
      )

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
      })

      ;(global.fetch as jest.Mock).mockClear()
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          hasAccess: true,
          plan: 'premium',
        }),
      })

      rerender(<TestHookWrapper feature="api_access" orgId="org-2" />)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })
    })
  })
})

// Test helper component
function TestHookWrapper({
  feature = 'api_access',
  orgId = 'test-org',
}: {
  feature?: string
  orgId?: string
}) {
  const { loading, hasAccess, plan, error } = useFeatureAccess(
    (feature || '') as unknown as FeatureName,
    orgId
  )

  if (loading) return <div>Loading...</div>

  return (
    <div>
      <div>Access: {hasAccess ? 'Yes' : 'No'}</div>
      <div>Plan: {plan}</div>
      {error && <div>Error: {error}</div>}
    </div>
  )
}
