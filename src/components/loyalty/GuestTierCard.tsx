'use client'

import { useMemo } from 'react'

export type TierName = 'Bronze' | 'Silver' | 'Gold' | 'Platinum'

interface TierInfo {
  tier_name: TierName
  base_discount_percent: number
  perks: string[]
}

interface GuestTierCardProps {
  loyalty_score: number
  current_tier: TierInfo
  next_tier?: TierInfo | null
  points_to_next?: number
  loading?: boolean
}

const tierColors: Record<TierName, { badge: string; bar: string; text: string }> = {
  Bronze: {
    badge: 'bg-gray-100 text-gray-700 border-gray-300',
    bar: 'bg-gray-400',
    text: 'text-gray-600',
  },
  Silver: {
    badge: 'bg-blue-100 text-blue-700 border-blue-300',
    bar: 'bg-blue-400',
    text: 'text-blue-600',
  },
  Gold: {
    badge: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    bar: 'bg-yellow-400',
    text: 'text-yellow-600',
  },
  Platinum: {
    badge: 'bg-purple-100 text-purple-700 border-purple-300',
    bar: 'bg-purple-400',
    text: 'text-purple-600',
  },
}

export function GuestTierCard({
  loyalty_score,
  current_tier,
  next_tier,
  points_to_next = 0,
  loading = false,
}: GuestTierCardProps) {
  const colors = tierColors[current_tier.tier_name]
  
  // Calculate progress percentage (0-100)
  const progressPercent = Math.min((loyalty_score / 100) * 100, 100)

  // Unlock message
  const unlockMessage = useMemo(() => {
    if (!next_tier || points_to_next <= 0) {
      return 'You have reached the highest tier!'
    }
    
    const stayWord = points_to_next === 1 ? 'stay' : 'stays'
    return `${points_to_next} more ${stayWord} to unlock ${next_tier.tier_name} tier (${next_tier.base_discount_percent}% discount)`
  }, [next_tier, points_to_next])

  if (loading) {
    return (
      <div className="p-4 border-t">
        <div className="text-center text-sm text-gray-600">
          Loading tier information...
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 border-t w-full">
      {/* Header with tier badge */}
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-semibold">Guest Tier 🏆</h3>
      </div>

      {/* Current tier and discount */}
      <div className="mb-4">
        <div className="flex items-baseline justify-between mb-2">
          <span className={`text-lg font-bold ${colors.text}`}>
            {current_tier.tier_name}
          </span>
          <span className="text-sm text-gray-600">
            {current_tier.base_discount_percent}% discount
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden mb-2">
          <div
            className={`h-full transition-all duration-300 ${colors.bar}`}
            style={{ width: `${progressPercent}%` }}
            role="progressbar"
            aria-valuenow={loyalty_score}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Loyalty progress: ${loyalty_score} out of 100 points`}
          />
        </div>

        {/* Score display */}
        <p className="text-xs text-gray-600">
          <strong>{loyalty_score}/100</strong> points
        </p>
      </div>

      {/* Next tier unlock message */}
      <div className={`bg-blue-50 border border-blue-200 rounded-md p-3 mb-4 ${colors.text}`}>
        <p className="text-xs leading-relaxed">
          {unlockMessage}
        </p>
      </div>

      {/* Perks list */}
      <div>
        <p className="text-xs font-semibold text-gray-700 mb-2">Tier Benefits</p>
        <ul className="space-y-1">
          {current_tier.perks.map((perk, idx) => (
            <li
              key={idx}
              className="text-xs text-gray-700 flex items-start gap-2"
            >
              <span className="text-emerald-700 font-bold mt-0.5">✓</span>
              <span>{perk}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Accessibility: Hidden tier badge for screen readers */}
      <div className="sr-only">
        You are a {current_tier.tier_name} member with {loyalty_score} loyalty points.
        Current discount: {current_tier.base_discount_percent}%.{' '}
        {next_tier
          ? `Next tier: ${next_tier.tier_name} with ${next_tier.base_discount_percent}% discount. ${unlockMessage}`
          : 'You have reached the highest tier.'}
      </div>
    </div>
  )
}
