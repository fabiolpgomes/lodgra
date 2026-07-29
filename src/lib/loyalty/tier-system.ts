/**
 * Guest Tier System
 *
 * Maps loyalty scores to tier levels with associated discounts and perks.
 *
 * Tier Definitions:
 * - Bronze: 0-25 pts → 0% discount
 * - Silver: 26-50 pts → 5% discount
 * - Gold: 51-75 pts → 10% discount
 * - Platinum: 76-100 pts → 15% discount
 */

/**
 * Represents a guest tier
 */
export type TierName = 'Bronze' | 'Silver' | 'Gold' | 'Platinum'

/**
 * Guest tier information with benefits
 */
export interface Tier {
  tier_name: TierName
  loyalty_score: number
  base_discount_percent: number
  points_min: number
  points_max: number
  perks: string[]
}

/**
 * Next tier progression information
 */
export interface NextTierInfo {
  current_tier: TierName
  next_tier: TierName | null
  points_needed: number
  discount_gain: number
}

/**
 * TierCalculator - Static class for calculating guest tiers based on loyalty score
 *
 * @example
 * const tier = TierCalculator.calculateTier(45)
 * // Returns: { tier_name: 'Silver', loyalty_score: 45, base_discount_percent: 5, ... }
 *
 * @example
 * const nextTier = TierCalculator.getNextTierInfo(45)
 * // Returns: { current_tier: 'Silver', next_tier: 'Gold', points_needed: 6, discount_gain: 5 }
 */
export class TierCalculator {
  private static readonly TIER_DEFINITIONS: Record<TierName, {
    min: number
    max: number
    discount: number
    perks: string[]
  }> = {
    Bronze: {
      min: 0,
      max: 25,
      discount: 0,
      perks: [
        'Boas-vindas a nosso programa de lealdade',
        'Acesso a ofertas semanais',
        'Suporte ao cliente padrão',
      ],
    },
    Silver: {
      min: 26,
      max: 50,
      discount: 5,
      perks: [
        'Desconto de 5% em todas as reservas',
        'Acesso prioritário a novas propriedades',
        'Suporte ao cliente prioritário',
        'Convites para eventos exclusivos',
      ],
    },
    Gold: {
      min: 51,
      max: 75,
      discount: 10,
      perks: [
        'Desconto de 10% em todas as reservas',
        'Check-in antecipado gratuito',
        'Upgrade de acomodação (sujeito à disponibilidade)',
        'Linha direta de suporte VIP',
        'Acesso antecipado a promoções',
      ],
    },
    Platinum: {
      min: 76,
      max: 100,
      discount: 15,
      perks: [
        'Desconto de 15% em todas as reservas',
        'Check-in antecipado e check-out tardio gratuito',
        'Upgrade de acomodação garantido',
        'Concierge pessoal 24/7',
        'Acesso exclusivo a propriedades premium',
        'Bônus de pontos em reservas especiais (2x)',
        'Cancelamento grátis até 48h antes',
      ],
    },
  }

  /**
   * Calculate tier based on loyalty score
   *
   * @param loyaltyScore - Guest's loyalty score (0-100)
   * @returns Tier information with discount and perks
   * @throws Error if score is invalid
   */
  static calculateTier(loyaltyScore: number): Tier {
    // Validate input
    if (typeof loyaltyScore !== 'number' || isNaN(loyaltyScore)) {
      throw new Error('Invalid loyalty score: must be a number')
    }

    if (loyaltyScore < 0 || loyaltyScore > 100) {
      throw new Error('Invalid loyalty score: must be between 0 and 100')
    }

    // Determine tier
    let tierName: TierName

    if (loyaltyScore <= 25) {
      tierName = 'Bronze'
    } else if (loyaltyScore <= 50) {
      tierName = 'Silver'
    } else if (loyaltyScore <= 75) {
      tierName = 'Gold'
    } else {
      tierName = 'Platinum'
    }

    const tierDef = this.TIER_DEFINITIONS[tierName]

    return {
      tier_name: tierName,
      loyalty_score: loyaltyScore,
      base_discount_percent: tierDef.discount,
      points_min: tierDef.min,
      points_max: tierDef.max,
      perks: tierDef.perks,
    }
  }

  /**
   * Get next tier progression information
   *
   * @param currentScore - Current loyalty score
   * @returns Information about next tier and points needed
   * @throws Error if score is invalid
   */
  static getNextTierInfo(currentScore: number): NextTierInfo {
    // Validate input
    if (typeof currentScore !== 'number' || isNaN(currentScore)) {
      throw new Error('Invalid loyalty score: must be a number')
    }

    if (currentScore < 0 || currentScore > 100) {
      throw new Error('Invalid loyalty score: must be between 0 and 100')
    }

    const currentTier = this.calculateTier(currentScore)
    const tierName = currentTier.tier_name

    // Determine next tier
    const tierOrder: TierName[] = ['Bronze', 'Silver', 'Gold', 'Platinum']
    const currentIndex = tierOrder.indexOf(tierName)
    const nextTierName = currentIndex < tierOrder.length - 1
      ? tierOrder[currentIndex + 1]
      : null

    // Calculate points needed to reach next tier
    let pointsNeeded = 0
    let discountGain = 0

    if (nextTierName) {
      const nextTierDef = this.TIER_DEFINITIONS[nextTierName]
      pointsNeeded = nextTierDef.min - currentScore
      discountGain = nextTierDef.discount - currentTier.base_discount_percent
    }

    return {
      current_tier: tierName,
      next_tier: nextTierName,
      points_needed: Math.max(0, pointsNeeded),
      discount_gain: discountGain,
    }
  }

  /**
   * Validate tier name
   *
   * @param tierName - Tier name to validate
   * @returns true if valid, false otherwise
   */
  static isValidTierName(tierName: string): tierName is TierName {
    return ['Bronze', 'Silver', 'Gold', 'Platinum'].includes(tierName)
  }

  /**
   * Get all tier definitions
   *
   * @returns Array of all tiers with their definitions
   */
  static getAllTiers(): Tier[] {
    return [
      this.calculateTier(0),
      this.calculateTier(26),
      this.calculateTier(51),
      this.calculateTier(76),
    ]
  }
}
