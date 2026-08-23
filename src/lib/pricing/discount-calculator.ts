/**
 * Dynamic Discount Calculator
 *
 * Core pricing engine that combines multiple discount types:
 * - Loyalty Discount (from guest tier)
 * - Last-Minute Discount (7 days or less)
 * - Extended Stay Discount (7+ nights)
 * - Early-Bird Discount (30+ days advance)
 * - Seasonal Modifiers
 *
 * Discounts are applied in order with price floor protection (50% minimum).
 */

import { formatCurrency } from '@/lib/utils/currency'

/**
 * Input for discount calculation
 */
export interface DiscountInput {
  base_price: number
  loyalty_discount_percent: number // 0-15, from TierCalculator
  stay_duration_nights: number
  days_until_checkin: number
  seasonal_modifier_percent?: number
  minimum_price_floor?: number // default 50% of base_price
}

/**
 * Individual discount detail
 */
export interface DiscountDetail {
  applied: boolean
  amount: number
  percent?: number
  threshold?: number
  description: string
}

/**
 * Result of discount calculation
 */
export interface DiscountResult {
  base_price: number
  loyalty_discount_amount: number
  loyalty_discount_percent: number
  last_minute_discount: DiscountDetail
  extended_stay_discount: DiscountDetail
  early_bird_discount: DiscountDetail
  seasonal_adjustment: DiscountDetail
  total_discounts_amount: number
  minimum_price_floor: number
  final_price: number
  discount_breakdown: string
  applied_rules: string[]
}

/**
 * DiscountCalculator - Static class for calculating dynamic discounts
 *
 * Applies discounts in strict order:
 * 1. Loyalty Discount (from guest tier)
 * 2. Last-Minute Discount (7 days or less)
 * 3. Extended Stay Discount (7+ nights)
 * 4. Early-Bird Discount (30+ days advance)
 * 5. Seasonal Modifiers
 *
 * Price floor protection: final price >= 50% of base_price (configurable)
 *
 * @example
 * const result = DiscountCalculator.calculate({
 *   base_price: 100,
 *   loyalty_discount_percent: 10,
 *   stay_duration_nights: 7,
 *   days_until_checkin: 5
 * })
 * // Returns detailed breakdown with all discounts applied
 */
export class DiscountCalculator {
  private static readonly LAST_MINUTE_THRESHOLD = 7 // days
  private static readonly LAST_MINUTE_DISCOUNT = 10 // percent
  private static readonly EXTENDED_STAY_THRESHOLD = 7 // nights
  private static readonly EXTENDED_STAY_DISCOUNT = 5 // percent
  private static readonly EARLY_BIRD_THRESHOLD = 30 // days
  private static readonly EARLY_BIRD_DISCOUNT = 5 // percent
  private static readonly DEFAULT_PRICE_FLOOR = 50 // percent of base
  private static readonly DECIMAL_PLACES = 2

  /**
   * Calculate final price with all applicable discounts
   *
   * @param input - Discount calculation input
   * @returns Detailed breakdown of all discounts and final price
   * @throws Error if input validation fails
   */
  static calculate(input: DiscountInput): DiscountResult {
    // Validate input
    this.validateInput(input)

    const {
      base_price,
      loyalty_discount_percent,
      stay_duration_nights,
      days_until_checkin,
      seasonal_modifier_percent = 0,
      minimum_price_floor,
    } = input

    // Calculate price floor
    const priceFloor = (minimum_price_floor ?? this.DEFAULT_PRICE_FLOOR) / 100
    const minimumPrice = base_price * priceFloor

    // Initialize result
    let currentPrice = base_price
    const appliedRules: string[] = []
    const loyaltyDiscountAmount = this.roundToDecimals(
      (base_price * loyalty_discount_percent) / 100
    )

    currentPrice -= loyaltyDiscountAmount

    if (loyalty_discount_percent > 0) {
      appliedRules.push(`Desconto de Lealdade: -${loyalty_discount_percent}%`)
    }

    // Last-Minute Discount
    const lastMinuteDiscount = this.calculateLastMinuteDiscount(
      currentPrice,
      days_until_checkin
    )
    if (lastMinuteDiscount.applied) {
      currentPrice -= lastMinuteDiscount.amount
      appliedRules.push(
        `Desconto Last-Minute: -${lastMinuteDiscount.percent}% (${days_until_checkin} dias)`
      )
    }

    // Extended Stay Discount
    const extendedStayDiscount = this.calculateExtendedStayDiscount(
      currentPrice,
      stay_duration_nights
    )
    if (extendedStayDiscount.applied) {
      currentPrice -= extendedStayDiscount.amount
      appliedRules.push(
        `Desconto Estadia Estendida: -${extendedStayDiscount.percent}% (${stay_duration_nights} noites)`
      )
    }

    // Early-Bird Discount
    const earlyBirdDiscount = this.calculateEarlyBirdDiscount(
      currentPrice,
      days_until_checkin
    )
    if (earlyBirdDiscount.applied) {
      currentPrice -= earlyBirdDiscount.amount
      appliedRules.push(
        `Desconto Antecipado: -${earlyBirdDiscount.percent}% (${days_until_checkin} dias)`
      )
    }

    // Seasonal Modifier (can be positive or negative)
    const seasonalAdjustment = this.calculateSeasonalAdjustment(
      currentPrice,
      seasonal_modifier_percent
    )
    if (seasonalAdjustment.applied) {
      if (seasonalAdjustment.percent! > 0) {
        currentPrice += seasonalAdjustment.amount
        appliedRules.push(
          `Ajuste Sazonal: +${seasonalAdjustment.percent}%`
        )
      } else {
        currentPrice += seasonalAdjustment.amount
        appliedRules.push(
          `Ajuste Sazonal: ${seasonalAdjustment.percent}%`
        )
      }
    }

    // Apply price floor protection
    const finalPrice = this.roundToDecimals(
      Math.max(currentPrice, minimumPrice)
    )

    // Calculate total discounts
    const totalDiscountsAmount = this.roundToDecimals(base_price - finalPrice)

    // Build breakdown string
    const discountBreakdown = this.buildBreakdown(
      base_price,
      loyaltyDiscountAmount,
      lastMinuteDiscount,
      extendedStayDiscount,
      earlyBirdDiscount,
      seasonalAdjustment,
      totalDiscountsAmount,
      finalPrice
    )

    return {
      base_price: this.roundToDecimals(base_price),
      loyalty_discount_amount: loyaltyDiscountAmount,
      loyalty_discount_percent,
      last_minute_discount: lastMinuteDiscount,
      extended_stay_discount: extendedStayDiscount,
      early_bird_discount: earlyBirdDiscount,
      seasonal_adjustment: seasonalAdjustment,
      total_discounts_amount: totalDiscountsAmount,
      minimum_price_floor: minimumPrice,
      final_price: finalPrice,
      discount_breakdown: discountBreakdown,
      applied_rules: appliedRules,
    }
  }

  /**
   * Validate input data
   *
   * @param input - Input to validate
   * @throws Error if input is invalid
   */
  private static validateInput(input: DiscountInput): void {
    if (!input) {
      throw new Error('Input is required')
    }

    if (typeof input.base_price !== 'number' || input.base_price < 0) {
      throw new Error('base_price must be a non-negative number')
    }

    if (
      typeof input.loyalty_discount_percent !== 'number' ||
      input.loyalty_discount_percent < 0 ||
      input.loyalty_discount_percent > 15
    ) {
      throw new Error('loyalty_discount_percent must be between 0 and 15')
    }

    if (
      typeof input.stay_duration_nights !== 'number' ||
      input.stay_duration_nights < 1
    ) {
      throw new Error('stay_duration_nights must be at least 1')
    }

    if (
      typeof input.days_until_checkin !== 'number' ||
      input.days_until_checkin < 0
    ) {
      throw new Error('days_until_checkin must be non-negative')
    }

    if (
      input.seasonal_modifier_percent !== undefined &&
      (typeof input.seasonal_modifier_percent !== 'number' ||
        input.seasonal_modifier_percent < -50 ||
        input.seasonal_modifier_percent > 50)
    ) {
      throw new Error('seasonal_modifier_percent must be between -50 and 50')
    }

    if (
      input.minimum_price_floor !== undefined &&
      (typeof input.minimum_price_floor !== 'number' ||
        input.minimum_price_floor < 0 ||
        input.minimum_price_floor > 100)
    ) {
      throw new Error('minimum_price_floor must be between 0 and 100')
    }
  }

  /**
   * Calculate last-minute discount (7 days or less before check-in)
   *
   * @param currentPrice - Price to apply discount to
   * @param daysUntilCheckin - Days until check-in
   * @returns Discount detail
   */
  private static calculateLastMinuteDiscount(
    currentPrice: number,
    daysUntilCheckin: number
  ): DiscountDetail {
    if (daysUntilCheckin <= this.LAST_MINUTE_THRESHOLD && daysUntilCheckin > 0) {
      return {
        applied: true,
        amount: this.roundToDecimals(
          (currentPrice * this.LAST_MINUTE_DISCOUNT) / 100
        ),
        percent: this.LAST_MINUTE_DISCOUNT,
        threshold: this.LAST_MINUTE_THRESHOLD,
        description: `Last-minute discount: ${this.LAST_MINUTE_DISCOUNT}% for bookings within ${this.LAST_MINUTE_THRESHOLD} days`,
      }
    }

    return {
      applied: false,
      amount: 0,
      threshold: this.LAST_MINUTE_THRESHOLD,
      description: `Last-minute discount not applied (${daysUntilCheckin} days before check-in)`,
    }
  }

  /**
   * Calculate extended stay discount (7 or more nights)
   *
   * @param currentPrice - Price to apply discount to
   * @param stayDurationNights - Total nights
   * @returns Discount detail
   */
  private static calculateExtendedStayDiscount(
    currentPrice: number,
    stayDurationNights: number
  ): DiscountDetail {
    if (stayDurationNights >= this.EXTENDED_STAY_THRESHOLD) {
      return {
        applied: true,
        amount: this.roundToDecimals(
          (currentPrice * this.EXTENDED_STAY_DISCOUNT) / 100
        ),
        percent: this.EXTENDED_STAY_DISCOUNT,
        threshold: this.EXTENDED_STAY_THRESHOLD,
        description: `Extended stay discount: ${this.EXTENDED_STAY_DISCOUNT}% for stays of ${this.EXTENDED_STAY_THRESHOLD}+ nights`,
      }
    }

    return {
      applied: false,
      amount: 0,
      threshold: this.EXTENDED_STAY_THRESHOLD,
      description: `Extended stay discount not applied (${stayDurationNights} nights)`,
    }
  }

  /**
   * Calculate early-bird discount (30+ days in advance)
   *
   * @param currentPrice - Price to apply discount to
   * @param daysUntilCheckin - Days until check-in
   * @returns Discount detail
   */
  private static calculateEarlyBirdDiscount(
    currentPrice: number,
    daysUntilCheckin: number
  ): DiscountDetail {
    if (daysUntilCheckin >= this.EARLY_BIRD_THRESHOLD) {
      return {
        applied: true,
        amount: this.roundToDecimals(
          (currentPrice * this.EARLY_BIRD_DISCOUNT) / 100
        ),
        percent: this.EARLY_BIRD_DISCOUNT,
        threshold: this.EARLY_BIRD_THRESHOLD,
        description: `Early-bird discount: ${this.EARLY_BIRD_DISCOUNT}% for bookings ${this.EARLY_BIRD_THRESHOLD}+ days in advance`,
      }
    }

    return {
      applied: false,
      amount: 0,
      threshold: this.EARLY_BIRD_THRESHOLD,
      description: `Early-bird discount not applied (${daysUntilCheckin} days in advance)`,
    }
  }

  /**
   * Calculate seasonal adjustment (can be positive or negative)
   *
   * @param currentPrice - Price to apply modifier to
   * @param seasonalModifierPercent - Seasonal modifier percentage
   * @returns Adjustment detail
   */
  private static calculateSeasonalAdjustment(
    currentPrice: number,
    seasonalModifierPercent: number
  ): DiscountDetail {
    if (seasonalModifierPercent !== 0) {
      return {
        applied: true,
        amount: this.roundToDecimals(
          (currentPrice * seasonalModifierPercent) / 100
        ),
        percent: seasonalModifierPercent,
        description: `Seasonal adjustment: ${seasonalModifierPercent > 0 ? '+' : ''}${seasonalModifierPercent}%`,
      }
    }

    return {
      applied: false,
      amount: 0,
      description: 'No seasonal adjustment applied',
    }
  }

  /**
   * Validate final price is within acceptable range
   *
   * @param basePrice - Original price
   * @param finalPrice - Calculated final price
   * @returns true if valid, false otherwise
   */
  static validatePrice(basePrice: number, finalPrice: number): boolean {
    if (!Number.isFinite(basePrice) || basePrice < 0) return false
    if (!Number.isFinite(finalPrice) || finalPrice < 0) return false
    // Final price should not exceed base price by more than 50% (seasonal increase)
    if (finalPrice > basePrice * 1.5) return false
    return true
  }

  /**
   * Round to decimal places (EUR cents)
   *
   * @param value - Value to round
   * @param places - Number of decimal places (default 2)
   * @returns Rounded value
   */
  private static roundToDecimals(
    value: number,
    places: number = this.DECIMAL_PLACES
  ): number {
    const factor = Math.pow(10, places)
    return Math.round(value * factor) / factor
  }

  /**
   * Build human-readable breakdown string in Portuguese
   *
   * @returns Formatted breakdown string
   */
  private static buildBreakdown(
    basePrice: number,
    loyaltyAmount: number,
    lastMinute: DiscountDetail,
    extendedStay: DiscountDetail,
    earlyBird: DiscountDetail,
    seasonal: DiscountDetail,
    totalDiscounts: number,
    finalPrice: number
  ): string {
    const lines: string[] = [
      `Preço Base: ${formatCurrency(basePrice)}`,
    ]

    if (loyaltyAmount > 0) {
      lines.push(`- Desconto de Lealdade: -${formatCurrency(loyaltyAmount)}`)
    }

    if (lastMinute.applied) {
      lines.push(`- Last-Minute (${lastMinute.percent}%): -${formatCurrency(lastMinute.amount)}`)
    }

    if (extendedStay.applied) {
      lines.push(`- Estadia Estendida (${extendedStay.percent}%): -${formatCurrency(extendedStay.amount)}`)
    }

    if (earlyBird.applied) {
      lines.push(`- Antecipado (${earlyBird.percent}%): -${formatCurrency(earlyBird.amount)}`)
    }

    if (seasonal.applied) {
      if (seasonal.amount > 0) {
        lines.push(`+ Ajuste Sazonal (+${seasonal.percent}%): +${formatCurrency(seasonal.amount)}`)
      } else {
        lines.push(`- Ajuste Sazonal (${seasonal.percent}%): -${formatCurrency(Math.abs(seasonal.amount))}`)
      }
    }

    lines.push(`---`)
    lines.push(`Desconto Total: -${formatCurrency(totalDiscounts)}`)
    lines.push(`Preço Final: ${formatCurrency(finalPrice)}`)

    return lines.join('\n')
  }
}
