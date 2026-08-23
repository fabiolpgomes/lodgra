/**
 * Loyalty Discount Calculator (Story 37.5)
 * Identifies recurring guests and calculates loyalty discount eligibility
 */

import { formatCurrency } from '@/lib/utils/currency'

export interface LoyaltyStatus {
  is_loyal: boolean
  average_rating: number | null
  reservation_count: number
  eligibility_reason?: string
}

export interface LoyaltyCalcInput {
  average_rating: number | null
  reservation_count: number
  has_previous_reservations: boolean
  loyalty_discount_enabled: boolean
  loyalty_discount_percentage: number
}

export interface LoyaltyCalcResult {
  is_eligible: boolean
  discount_percentage: number
  discount_amount_eur?: number
  reason: string
}

/**
 * Determine if guest qualifies for loyalty discount
 */
export function calculateLoyaltyDiscount(input: LoyaltyCalcInput): LoyaltyCalcResult {
  const {
    average_rating,
    reservation_count,
    has_previous_reservations,
    loyalty_discount_enabled,
    loyalty_discount_percentage,
  } = input

  if (!loyalty_discount_enabled) {
    return {
      is_eligible: false,
      discount_percentage: 0,
      reason: 'Loyalty discount disabled for this property',
    }
  }

  if (!has_previous_reservations) {
    return {
      is_eligible: false,
      discount_percentage: 0,
      reason: 'First-time guest, loyalty discount not applicable',
    }
  }

  if (average_rating !== null && average_rating < 4.8) {
    return {
      is_eligible: false,
      discount_percentage: 0,
      reason: `Guest rating ${average_rating.toFixed(2)} below 4.8 threshold`,
    }
  }

  if (average_rating !== null && reservation_count < 3) {
    return {
      is_eligible: false,
      discount_percentage: 0,
      reason: `Insufficient reviews: ${reservation_count} < 3 minimum`,
    }
  }

  return {
    is_eligible: true,
    discount_percentage: loyalty_discount_percentage,
    reason: `Loyal guest! ${reservation_count} previous stays, ${average_rating ? `${average_rating.toFixed(2)} rating` : 'unreviewed'}`,
  }
}

/**
 * Apply loyalty discount to a base price
 * Loyalty discount is ADDITIONAL to duration discounts (multiplicative)
 */
export function applyLoyaltyDiscount(
  priceAfterDurationDiscount: number,
  loyaltyDiscountPercentage: number
): { final_price: number; loyalty_amount: number } {
  if (loyaltyDiscountPercentage <= 0) {
    return { final_price: priceAfterDurationDiscount, loyalty_amount: 0 }
  }

  const loyaltyAmount = Math.round(
    (priceAfterDurationDiscount * loyaltyDiscountPercentage) / 100
  )
  const finalPrice = Math.round(priceAfterDurationDiscount - loyaltyAmount)

  return {
    final_price: finalPrice,
    loyalty_amount: loyaltyAmount,
  }
}

/**
 * Format loyalty discount for display
 */
export function formatLoyaltyMessage(
  isEligible: boolean,
  discountPercentage: number,
  discountAmount?: number
): string {
  if (!isEligible) {
    return ''
  }

  if (discountAmount !== undefined) {
    return `🎁 Desconto Fidelidade: -${formatCurrency(discountAmount / 100)} (${discountPercentage}%)`
  }

  return `🎁 Desconto Fidelidade: ${discountPercentage}%`
}
