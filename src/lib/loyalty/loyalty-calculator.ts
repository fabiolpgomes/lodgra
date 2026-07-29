/**
 * Loyalty Score Calculator
 *
 * Calculates loyalty points based on booking history following these rules:
 * - Base: +5 pts per completed stay
 * - Bonus: +10 pts per stay with zero cancellation
 * - Referrals: +15 pts per successful referral
 * - Cap: Maximum 100 pts
 */

/**
 * Represents a booking in the guest's history
 */
export interface Booking {
  id: string
  guest_id: string
  status: 'confirmed' | 'cancelled' | 'completed'
  check_in: string | Date
  check_out: string | Date
  cancelled_at?: string | Date | null
  total_amount: number
  created_at: string | Date
}

/**
 * Input for loyalty score calculation
 */
export interface LoyaltyCalculationInput {
  bookings: Booking[]
  referral_count?: number
}

/**
 * Output from loyalty score calculation
 */
export interface LoyaltyCalculationResult {
  loyalty_score: number
  breakdown: {
    completed_stays: number
    completed_stays_points: number
    zero_cancellation_bonus: number
    referral_points: number
  }
  reasoning: string
}

/**
 * LoyaltyCalculator - Static class for calculating guest loyalty scores
 *
 * @example
 * const result = LoyaltyCalculator.calculate({
 *   bookings: guestBookings,
 *   referral_count: 2
 * })
 */
export class LoyaltyCalculator {
  private static readonly BASE_POINTS_PER_STAY = 5
  private static readonly ZERO_CANCELLATION_BONUS = 10
  private static readonly REFERRAL_POINTS = 15
  private static readonly MAX_LOYALTY_SCORE = 100

  /**
   * Calculate loyalty score for a guest based on booking history
   *
   * @param input - Guest's booking history and referral count
   * @returns Loyalty score and detailed breakdown
   * @throws Error if input validation fails
   */
  static calculate(input: LoyaltyCalculationInput): LoyaltyCalculationResult {
    // Validate input
    if (!this.validateInput(input)) {
      throw new Error('Invalid input: bookings must be an array')
    }

    const bookings = input.bookings || []
    const referralCount = input.referral_count || 0

    // Count completed stays
    const completedStays = bookings.filter(
      (b) => b.status === 'completed'
    ).length

    // Calculate base points from completed stays
    const completedStaysPoints = completedStays * this.BASE_POINTS_PER_STAY

    // Count stays with zero cancellation (completed without cancellation)
    const zeroCancellationStays = bookings.filter(
      (b) => b.status === 'completed' && (!b.cancelled_at || b.cancelled_at === null)
    ).length

    // Calculate zero cancellation bonus
    const zeroCancellationBonus = zeroCancellationStays * this.ZERO_CANCELLATION_BONUS

    // Calculate referral points
    const referralPoints = referralCount * this.REFERRAL_POINTS

    // Calculate total and apply cap
    let totalScore =
      completedStaysPoints + zeroCancellationBonus + referralPoints

    // Apply maximum cap
    if (totalScore > this.MAX_LOYALTY_SCORE) {
      totalScore = this.MAX_LOYALTY_SCORE
    }

    // Build reasoning string
    const reasoning = this.buildReasoning(
      completedStays,
      completedStaysPoints,
      zeroCancellationBonus,
      referralCount,
      referralPoints,
      totalScore
    )

    return {
      loyalty_score: totalScore,
      breakdown: {
        completed_stays: completedStays,
        completed_stays_points: completedStaysPoints,
        zero_cancellation_bonus: zeroCancellationBonus,
        referral_points: referralPoints,
      },
      reasoning,
    }
  }

  /**
   * Validate loyalty score is within acceptable range
   *
   * @param score - The loyalty score to validate
   * @returns true if score is valid (0-100), false otherwise
   */
  static validateScore(score: number): boolean {
    if (typeof score !== 'number') return false
    if (score < 0) return false
    if (score > this.MAX_LOYALTY_SCORE) return false
    if (!Number.isInteger(score)) return false
    return true
  }

  /**
   * Validate input data
   *
   * @param input - Input to validate
   * @returns true if valid, false otherwise
   */
  private static validateInput(input: LoyaltyCalculationInput): boolean {
    if (!input) return false
    if (!Array.isArray(input.bookings)) return false
    return true
  }

  /**
   * Build human-readable reasoning string
   *
   * @param completedStays - Number of completed stays
   * @param completedStaysPoints - Points from completed stays
   * @param zeroCancellationBonus - Bonus points from no cancellations
   * @param referralCount - Number of successful referrals
   * @param referralPoints - Points from referrals
   * @param totalScore - Final loyalty score
   * @returns Human-readable reasoning string
   */
  private static buildReasoning(
    completedStays: number,
    completedStaysPoints: number,
    zeroCancellationBonus: number,
    referralCount: number,
    referralPoints: number,
    totalScore: number
  ): string {
    const parts: string[] = []

    if (completedStays > 0) {
      parts.push(
        `${completedStays} estada${completedStays !== 1 ? 's' : ''} concluída${completedStays !== 1 ? 's' : ''} (${completedStaysPoints} pts)`
      )
    }

    if (zeroCancellationBonus > 0) {
      const cancellationFreeStays = zeroCancellationBonus / this.ZERO_CANCELLATION_BONUS
      parts.push(
        `${cancellationFreeStays} estada${cancellationFreeStays !== 1 ? 's' : ''} sem cancelamento (${zeroCancellationBonus} pts bonus)`
      )
    }

    if (referralCount > 0) {
      parts.push(
        `${referralCount} referência${referralCount !== 1 ? 's' : ''} bem-sucedida${referralCount !== 1 ? 's' : ''} (${referralPoints} pts)`
      )
    }

    if (parts.length === 0) {
      return `Sem histórico de reservas. Pontuação: 0`
    }

    const reasoningText = parts.join(', ')
    if (totalScore >= this.MAX_LOYALTY_SCORE) {
      return `${reasoningText}. Limite máximo alcançado: ${totalScore} pts`
    }

    return `${reasoningText}. Pontuação total: ${totalScore} pts`
  }
}
