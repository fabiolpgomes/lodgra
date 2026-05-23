'use client'

import { useEffect, useState } from 'react'

interface BillingData {
  subscription: {
    plan: string
    status: string
    current_period_end: string
  } | null
  propertyCount: number
}

interface UseBillingPreviewReturn {
  subscription: { plan: string } | null
  propertyCount: number
  loading: boolean
  error: string | null
}

export function useBillingPreview(orgId: string): UseBillingPreviewReturn {
  const [data, setData] = useState<BillingData>({
    subscription: null,
    propertyCount: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!orgId) {
      setError('No organization ID provided')
      setLoading(false)
      return
    }

    const fetchBillingData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch subscription info
        const subResponse = await fetch('/api/billing/subscription')
        if (!subResponse.ok) {
          throw new Error('Failed to fetch subscription')
        }
        const subData = await subResponse.json()

        // Fetch property count
        const propsResponse = await fetch(`/api/properties/check-limit?org_id=${orgId}`)
        if (!propsResponse.ok) {
          throw new Error('Failed to fetch property count')
        }
        const propsData = await propsResponse.json()

        setData({
          subscription: subData ? { plan: subData.plan } : null,
          propertyCount: propsData.currentCount || 0,
        })
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        setError(errorMessage)
        console.error('[useBillingPreview] Error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchBillingData()
  }, [orgId])

  return {
    subscription: data.subscription,
    propertyCount: data.propertyCount,
    loading,
    error,
  }
}
