/**
 * Story 37.5: Loyalty Discount Helper
 *
 * Helper para auto-aplicar loyalty discount em bookings
 * Integra loyalty score calculation com booking creation
 */

interface LoyaltyDiscountInfo {
  discount_percent: number
  is_eligible: boolean
  loyalty_tier: 'new' | 'occasional' | 'loyal' | 'vip'
  loyalty_score: number
}

/**
 * Fetch loyalty discount for a guest
 * Used during booking creation to determine if loyalty discount should be applied
 *
 * @param guestId - Guest ID
 * @returns Loyalty discount info including percentage and tier
 */
export async function getLoyaltyDiscountForGuest(
  guestId: string
): Promise<LoyaltyDiscountInfo | null> {
  try {
    const response = await fetch(`/api/guests/${guestId}/loyalty-discount`)

    if (!response.ok) {
      console.warn(
        `Could not fetch loyalty discount for guest ${guestId}: ${response.status}`
      )
      return null
    }

    const data = await response.json()

    return {
      discount_percent: data.discount_percent || 0,
      is_eligible: data.is_eligible || false,
      loyalty_tier: data.loyalty_tier || 'new',
      loyalty_score: data.loyalty_score || 0,
    }
  } catch (error) {
    console.error('Error fetching loyalty discount:', error)
    return null
  }
}

/**
 * Calculate final price with loyalty discount
 *
 * Usage in booking creation:
 * ```ts
 * const loyaltyInfo = await getLoyaltyDiscountForGuest(guestId)
 * const priceWithDiscount = calculatePriceWithLoyaltyDiscount(
 *   basePrice,
 *   loyaltyInfo
 * )
 * ```
 */
export function calculatePriceWithLoyaltyDiscount(
  basePrice: number,
  loyaltyInfo: LoyaltyDiscountInfo | null
): { finalPrice: number; discountAmount: number; discountPercent: number } {
  if (!loyaltyInfo || !loyaltyInfo.is_eligible) {
    return {
      finalPrice: basePrice,
      discountAmount: 0,
      discountPercent: 0,
    }
  }

  const discountAmount = (basePrice * loyaltyInfo.discount_percent) / 100
  const finalPrice = basePrice - discountAmount

  return {
    finalPrice,
    discountAmount,
    discountPercent: loyaltyInfo.discount_percent,
  }
}

/**
 * Format loyalty tier for display
 */
export function formatLoyaltyTier(
  tier: 'new' | 'occasional' | 'loyal' | 'vip'
): string {
  const labels = {
    new: 'Novo Hóspede',
    occasional: 'Hóspede Ocasional',
    loyal: 'Hóspede Leal',
    vip: 'Hóspede VIP',
  }
  return labels[tier] || tier
}

/**
 * Get loyalty tier badge color
 */
export function getLoyaltyTierColor(
  tier: 'new' | 'occasional' | 'loyal' | 'vip'
): string {
  const colors = {
    new: 'gray',
    occasional: 'blue',
    loyal: 'green',
    vip: 'purple',
  }
  return colors[tier] || 'gray'
}
