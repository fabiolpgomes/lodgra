/**
 * Epic 43: ReservationPriceCalculator
 *
 * Calculates final reservation price with Epic 43 model:
 * - Price hierarchy: daily_prices → pricing_rules → base_price
 * - Exclusive volume discounts: Weekly (7-27) XOR Monthly (28+)
 * - Loyalty discount in cascade (after volume)
 * - Complete transparent breakdown
 *
 * @example
 * const result = ReservationPriceCalculator.calculate({
 *   propertyId: 'prop-123',
 *   checkIn: '2026-08-15',
 *   checkOut: '2026-08-22',
 *   basePrice: 100,
 *   weeklyDiscountPercent: 10,
 *   monthlyDiscountPercent: 20,
 *   loyaltyDiscountPercent: 5,
 *   fees: [{ name: 'Limpeza', amount: 50 }],
 *   isLoyaltyGuest: true
 * })
 */

export interface PricingRuleMatch {
  pricePerNight: number
  minNights?: number
  source: 'daily_prices' | 'pricing_rules' | 'base_price'
}

export interface DiscountDetail {
  type: 'weekly' | 'monthly' | 'loyalty' | 'none'
  percent: number
  amount: number
  appliedAt: string // 'volume' | 'loyalty' | 'na'
}

export interface Fee {
  name: string
  amount: number
}

export interface ReservationPriceInput {
  propertyId: string
  checkIn: string // ISO date
  checkOut: string // ISO date
  basePrice: number
  weeklyDiscountPercent?: number // 7-27 nights
  monthlyDiscountPercent?: number // 28+ nights
  loyaltyDiscountPercent?: number
  fees?: Fee[]
  isLoyaltyGuest?: boolean
  dailyPrices?: Map<string, number> // date -> price overrides
  pricingRules?: Array<{
    startDate: string
    endDate: string
    pricePerNight: number
    minNights?: number
  }>
}

export interface ReservationPriceResult {
  nights: number
  pricePerNight: number
  priceSource: 'daily_prices' | 'pricing_rules' | 'base_price'
  subtotal: number // pricePerNight × nights

  // Volume discount (exclusive: weekly OR monthly, never both)
  volumeDiscountType: 'weekly' | 'monthly' | 'none'
  volumeDiscountPercent: number
  volumeDiscountAmount: number
  afterVolumeDiscount: number

  // Loyalty discount (cascade: applied to already-discounted price)
  loyaltyDiscountPercent: number
  loyaltyDiscountAmount: number
  afterLoyaltyDiscount: number

  // Fees
  fees: Fee[]
  feesTotal: number

  // Final
  finalPrice: number

  // Breakdown string (Portuguese)
  breakdown: string
  appliedRules: string[]
}

export class ReservationPriceCalculator {
  private static readonly DECIMAL_PLACES = 2

  /**
   * Calculate reservation price with Epic 43 model
   */
  static calculate(input: ReservationPriceInput): ReservationPriceResult {
    this.validateInput(input)

    const { checkIn, checkOut, basePrice } = input

    // Calculate nights
    const nights = this.calculateNights(checkIn, checkOut)

    // Get price per night (hierarchy: daily → rules → base)
    const pricePerNight = this.getPricePerNight(input, nights)

    // Calculate subtotal
    const subtotal = this.round(pricePerNight * nights)

    // Apply volume discount (EXCLUSIVE: weekly OR monthly)
    const volumeDiscount = this.calculateVolumeDiscount(
      subtotal,
      nights,
      input.weeklyDiscountPercent ?? 0,
      input.monthlyDiscountPercent ?? 0
    )

    const afterVolumeDiscount = this.round(
      subtotal - volumeDiscount.amount
    )

    // Apply loyalty discount (CASCADE: on already-discounted price)
    const loyaltyDiscount = this.calculateLoyaltyDiscount(
      afterVolumeDiscount,
      input.isLoyaltyGuest ?? false,
      input.loyaltyDiscountPercent ?? 0
    )

    const afterLoyaltyDiscount = this.round(
      afterVolumeDiscount - loyaltyDiscount.amount
    )

    // Calculate fees
    const fees = input.fees ?? []
    const feesTotal = this.round(
      fees.reduce((sum, fee) => sum + fee.amount, 0)
    )

    // Final price
    const finalPrice = this.round(afterLoyaltyDiscount + feesTotal)

    // Build breakdown
    const breakdown = this.buildBreakdown(
      pricePerNight,
      nights,
      subtotal,
      volumeDiscount,
      afterVolumeDiscount,
      loyaltyDiscount,
      afterLoyaltyDiscount,
      fees,
      feesTotal,
      finalPrice
    )

    const appliedRules = this.buildAppliedRules(
      nights,
      volumeDiscount,
      loyaltyDiscount,
      fees
    )

    return {
      nights,
      pricePerNight: this.round(pricePerNight),
      priceSource: this.getPriceSource(input, nights),
      subtotal,
      volumeDiscountType: volumeDiscount.type,
      volumeDiscountPercent: volumeDiscount.percent,
      volumeDiscountAmount: volumeDiscount.amount,
      afterVolumeDiscount,
      loyaltyDiscountPercent: loyaltyDiscount.percent,
      loyaltyDiscountAmount: loyaltyDiscount.amount,
      afterLoyaltyDiscount,
      fees,
      feesTotal,
      finalPrice,
      breakdown,
      appliedRules,
    }
  }

  private static validateInput(input: ReservationPriceInput): void {
    if (!input.checkIn || !input.checkOut) {
      throw new Error('checkIn and checkOut are required')
    }

    if (input.basePrice <= 0) {
      throw new Error('basePrice must be greater than 0')
    }

    const checkIn = new Date(input.checkIn)
    const checkOut = new Date(input.checkOut)

    if (checkOut <= checkIn) {
      throw new Error('checkOut must be after checkIn')
    }
  }

  private static calculateNights(checkIn: string, checkOut: string): number {
    const start = new Date(checkIn)
    const end = new Date(checkOut)
    const diffMs = end.getTime() - start.getTime()
    const nights = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    return nights
  }

  private static getPricePerNight(
    input: ReservationPriceInput,
    nights: number
  ): number {
    // 1. Check daily_prices for each day (use average if all covered)
    if (input.dailyPrices && input.dailyPrices.size > 0) {
      const prices = this.getDailyPricesForPeriod(
        input.checkIn,
        input.checkOut,
        input.dailyPrices
      )
      if (prices.length > 0) {
        return prices.reduce((sum, p) => sum + p, 0) / prices.length
      }
    }

    // 2. Check pricing_rules for matching period
    if (input.pricingRules && input.pricingRules.length > 0) {
      const rule = this.findMatchingRule(
        input.checkIn,
        input.checkOut,
        input.pricingRules,
        nights
      )
      if (rule) {
        return rule.pricePerNight
      }
    }

    // 3. Fallback to base_price
    return input.basePrice
  }

  private static getPriceSource(
    input: ReservationPriceInput,
    nights: number
  ): 'daily_prices' | 'pricing_rules' | 'base_price' {
    if (input.dailyPrices && input.dailyPrices.size > 0) {
      const prices = this.getDailyPricesForPeriod(
        input.checkIn,
        input.checkOut,
        input.dailyPrices
      )
      if (prices.length > 0) return 'daily_prices'
    }

    if (input.pricingRules && input.pricingRules.length > 0) {
      const rule = this.findMatchingRule(
        input.checkIn,
        input.checkOut,
        input.pricingRules,
        nights
      )
      if (rule) return 'pricing_rules'
    }

    return 'base_price'
  }

  private static getDailyPricesForPeriod(
    checkIn: string,
    checkOut: string,
    dailyPrices: Map<string, number>
  ): number[] {
    const prices: number[] = []
    const start = new Date(checkIn)
    const end = new Date(checkOut)

    for (
      let date = new Date(start);
      date < end;
      date.setDate(date.getDate() + 1)
    ) {
      const dateStr = date.toISOString().split('T')[0]
      const price = dailyPrices.get(dateStr)
      if (price) {
        prices.push(price)
      }
    }

    return prices
  }

  private static findMatchingRule(
    checkIn: string,
    checkOut: string,
    rules: Array<{
      startDate: string
      endDate: string
      pricePerNight: number
      minNights?: number
    }>,
    nights: number
  ) {
    const start = new Date(checkIn)
    const end = new Date(checkOut)

    for (const rule of rules) {
      const ruleStart = new Date(rule.startDate)
      const ruleEnd = new Date(rule.endDate)

      // Check if period overlaps and respects min_nights
      const overlaps =
        start < ruleEnd && end > ruleStart && (!rule.minNights || nights >= rule.minNights)

      if (overlaps) {
        return rule
      }
    }

    return null
  }

  private static calculateVolumeDiscount(
    subtotal: number,
    nights: number,
    weeklyPercent: number,
    monthlyPercent: number
  ): DiscountDetail {
    // EXCLUSIVE: Monthly (28+) XOR Weekly (7-27)
    if (nights >= 28 && monthlyPercent > 0) {
      return {
        type: 'monthly',
        percent: monthlyPercent,
        amount: this.round((subtotal * monthlyPercent) / 100),
        appliedAt: 'volume',
      }
    }

    if (nights >= 7 && nights < 28 && weeklyPercent > 0) {
      return {
        type: 'weekly',
        percent: weeklyPercent,
        amount: this.round((subtotal * weeklyPercent) / 100),
        appliedAt: 'volume',
      }
    }

    return {
      type: 'none',
      percent: 0,
      amount: 0,
      appliedAt: 'na',
    }
  }

  private static calculateLoyaltyDiscount(
    priceAfterVolume: number,
    isLoyaltyGuest: boolean,
    loyaltyPercent: number
  ): DiscountDetail {
    if (isLoyaltyGuest && loyaltyPercent > 0) {
      return {
        type: 'loyalty',
        percent: loyaltyPercent,
        amount: this.round((priceAfterVolume * loyaltyPercent) / 100),
        appliedAt: 'loyalty',
      }
    }

    return {
      type: 'none',
      percent: 0,
      amount: 0,
      appliedAt: 'na',
    }
  }

  private static buildBreakdown(
    pricePerNight: number,
    nights: number,
    subtotal: number,
    volumeDiscount: DiscountDetail,
    afterVolume: number,
    loyaltyDiscount: DiscountDetail,
    afterLoyalty: number,
    fees: Fee[],
    feesTotal: number,
    finalPrice: number
  ): string {
    const lines: string[] = []

    lines.push('═══════════════════════════════════════')
    lines.push(`Preço por Noite: €${pricePerNight.toFixed(2)}`)
    lines.push(`Nº de Noites: ${nights}`)
    lines.push(`Subtotal: €${subtotal.toFixed(2)}`)
    lines.push('')

    if (volumeDiscount.amount > 0) {
      const type =
        volumeDiscount.type === 'weekly'
          ? 'Desconto Semanal'
          : 'Desconto Mensal'
      lines.push(`- ${type} (${volumeDiscount.percent}%): -€${volumeDiscount.amount.toFixed(2)}`)
      lines.push(`  Subtotal com Desconto: €${afterVolume.toFixed(2)}`)
    }

    if (loyaltyDiscount.amount > 0) {
      lines.push(`- Desconto Fidelidade (${loyaltyDiscount.percent}%): -€${loyaltyDiscount.amount.toFixed(2)}`)
      lines.push(`  Subtotal com Fidelidade: €${afterLoyalty.toFixed(2)}`)
    }

    if (feesTotal > 0) {
      lines.push('')
      lines.push('Taxas:')
      for (const fee of fees) {
        lines.push(`  + ${fee.name}: €${fee.amount.toFixed(2)}`)
      }
      lines.push(`  Total Taxas: €${feesTotal.toFixed(2)}`)
    }

    lines.push('')
    lines.push('═══════════════════════════════════════')
    lines.push(`TOTAL: €${finalPrice.toFixed(2)}`)
    lines.push('═══════════════════════════════════════')

    return lines.join('\n')
  }

  private static buildAppliedRules(
    nights: number,
    volumeDiscount: DiscountDetail,
    loyaltyDiscount: DiscountDetail,
    fees: Fee[]
  ): string[] {
    const rules: string[] = []

    rules.push(`Estadia: ${nights} noite${nights !== 1 ? 's' : ''}`)

    if (volumeDiscount.amount > 0) {
      const type =
        volumeDiscount.type === 'weekly'
          ? `Desconto Semanal (7-27 noites): ${volumeDiscount.percent}%`
          : `Desconto Mensal (28+ noites): ${volumeDiscount.percent}%`
      rules.push(type)
    }

    if (loyaltyDiscount.amount > 0) {
      rules.push(`Desconto Fidelidade: ${loyaltyDiscount.percent}%`)
    }

    if (fees.length > 0) {
      rules.push(`Taxas: ${fees.map((f) => f.name).join(', ')}`)
    }

    return rules
  }

  private static round(value: number, places = this.DECIMAL_PLACES): number {
    const factor = Math.pow(10, places)
    return Math.round(value * factor) / factor
  }
}
