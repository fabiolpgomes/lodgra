'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FeatureName } from './hasFeature'

interface FeatureGateProps {
  feature: FeatureName
  orgId: string
  fallback?: React.ReactNode
  onBlocked?: (feature: FeatureName, plan: string) => void
  children: React.ReactNode
}

/**
 * Client-side component to gate access to features
 * Shows children if org has access, otherwise shows fallback
 * @param feature Feature to gate
 * @param orgId Organization ID
 * @param fallback What to show if feature is not accessible
 * @param onBlocked Callback when feature is blocked
 * @param children Content to show if feature is accessible
 */
export function FeatureGate({
  feature,
  orgId,
  fallback = null,
  onBlocked,
  children,
}: FeatureGateProps) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const router = useRouter()

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    checkFeatureAccess()
  }, [feature, orgId])

  async function checkFeatureAccess() {
    try {
      const response = await fetch(
        `/api/features/check?feature=${feature}&org_id=${orgId}`
      )
      const data = await response.json()

      if (response.ok) {
        setHasAccess(data.hasAccess)

        if (!data.hasAccess && data.plan) {
          onBlocked?.(feature, data.plan)

          // Redirect to upgrade page with feature context
          // (Optional: only redirect if not already on upgrade page)
          const currentPath = window.location.pathname
          if (!currentPath.includes('/upgrade')) {
            router.push(`/upgrade?feature=${feature}&plan=${data.plan}`)
          }
        }
      } else {
        console.error('Feature check failed:', data.error)
        setHasAccess(false)
      }
    } catch (error) {
      console.error('Error checking feature access:', error)
      setHasAccess(false)
    }
  }

  // Show loading state while checking
  if (hasAccess === null) {
    return <div className="animate-pulse">Loading...</div>
  }

  // Show children if access granted, fallback otherwise
  if (!hasAccess) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
        {fallback || (
          <div className="text-sm text-yellow-800">
            <p className="font-semibold">Feature not available</p>
            <p className="text-xs">
              Upgrade your plan to access {feature.replace(/_/g, ' ')}.
            </p>
          </div>
        )}
      </div>
    )
  }

  return <>{children}</>
}

/**
 * Hook to check feature access programmatically
 * @param feature Feature to check
 * @param orgId Organization ID
 * @returns { hasAccess, loading, plan, error }
 */
export function useFeatureAccess(feature: FeatureName, orgId: string) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState<string>('essencial')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkAccess = async () => {
      try {
        setLoading(true)
        const response = await fetch(
          `/api/features/check?feature=${feature}&org_id=${orgId}`
        )
        const data = await response.json()

        if (response.ok) {
          setHasAccess(data.hasAccess)
          setPlan(data.plan)
        } else {
          setError(data.error)
          setHasAccess(false)
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        setError(errorMessage)
        setHasAccess(false)
      } finally {
        setLoading(false)
      }
    }

    checkAccess()
  }, [feature, orgId])

  return { hasAccess, loading, plan, error }
}
