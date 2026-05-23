'use client'

import { useState, useCallback } from 'react'
import { FeatureName } from '@/lib/features/hasFeature'

type ModalReason = 'feature_blocked' | 'property_limit'

interface UseUpgradeModalProps {
  currentPlan: 'essencial' | 'expansao' | 'premium'
  stripeCheckoutUrl?: string // Optional custom checkout URL
}

export function useUpgradeModal({ currentPlan, stripeCheckoutUrl }: UseUpgradeModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [blockedFeature, setBlockedFeature] = useState<FeatureName | null>(null)
  const [reason, setReason] = useState<ModalReason>('feature_blocked')

  const openForFeature = useCallback((feature: FeatureName) => {
    setBlockedFeature(feature)
    setReason('feature_blocked')
    setIsOpen(true)
  }, [])

  const openForPropertyLimit = useCallback(() => {
    setBlockedFeature(null)
    setReason('property_limit')
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  const handleAddExtra = useCallback(() => {
    // Redirect to properties page with action to add extra
    const origin =
      typeof window !== 'undefined' ? window.location.origin : ''
    window.location.href = `${origin}/dashboard/properties?action=add-extra`
  }, [])

  const handleUpgrade = useCallback(
    (targetPlan: string) => {
      // If custom URL provided, use it
      if (stripeCheckoutUrl) {
        window.location.href = stripeCheckoutUrl
        return
      }

      // Otherwise, redirect to Stripe checkout endpoint
      // The endpoint will use Stripe price IDs from environment variables
      const origin =
        typeof window !== 'undefined' ? window.location.origin : ''

      window.location.href = `${origin}/api/billing/checkout?plan=${targetPlan}`
    },
    [stripeCheckoutUrl]
  )

  return {
    isOpen,
    blockedFeature,
    reason,
    currentPlan,
    openForFeature,
    openForPropertyLimit,
    close,
    handleAddExtra,
    handleUpgrade,
  }
}
