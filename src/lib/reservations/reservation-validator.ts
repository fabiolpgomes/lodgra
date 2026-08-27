import { addDays, eachDayOfInterval, format } from 'date-fns'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveVolumeDiscountRule } from '@/lib/pricing/volume-discount-rules'

export interface PriceResult {
  success: boolean
  pricePerNight: number[]
  subtotal: number
  currency: string
  breakdown?: Array<{ date: string; price: number }>
  error?: string
}

export interface DiscountResult {
  success: boolean
  hasDiscount: boolean
  discountType?: 'min_stay' | 'extended_stay' | 'none'
  discountPercentage: number
  originalPrice: number
  discountedPrice: number
  reason: string
}

export interface MinimumNightsResult {
  success: boolean
  passed: boolean
  minimumNights: number
  selectedNights: number
  requiresApproval?: boolean
  overrideApplied?: boolean
  error?: string
}

export interface ValidationOptions {
  allowMinimumNightsOverride?: boolean
}

export interface CancellationPolicyResult {
  success: boolean
  policyId: string
  policyName: string
  terms: string
  refundPercentage: number
  refundDeadlineDays: number
  error?: string
}

export interface OverlapResult {
  hasConflict: boolean
  conflictingReservations: Array<{ id: string; checkIn: string; checkOut: string }>
  error?: string
}

export interface FeesResult {
  success: boolean
  cleaningFee: number
  cleaningFeeType: 'per_stay' | 'per_night' | null
  petFee: number
  petFeeType: 'per_stay' | 'per_night' | null
  totalFees: number
  breakdown: Array<{ name: string; amount: number; type: string }>
  error?: string
}

export interface ValidationResult {
  success: boolean
  propertyId: string
  checkIn: string
  checkOut: string
  nights: number
  price: PriceResult
  discount: DiscountResult
  minimumNights: MinimumNightsResult
  cancellationPolicy: CancellationPolicyResult
  fees: FeesResult
  breakdown: {
    basePrice: number
    discountAmount: number
    discountPercentage: number
    cleaningFee: number
    petFee: number
    subtotal: number
    totalFees: number
    finalPrice: number
    currency: string
  }
  finalPrice: number
  errors: string[]
  warnings: string[]
}

export class ReservationValidator {
  static async getClient() {
    return createAdminClient()
  }

  private static parseLocalDate(value: string) {
    const [year, month, day] = value.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  static async validatePrice(
    propertyId: string,
    checkIn: string,
    checkOut: string
  ): Promise<PriceResult> {
    try {
      const supabase = await this.getClient()
      const checkInDate = this.parseLocalDate(checkIn)
      const checkOutDate = this.parseLocalDate(checkOut)

      if (checkOutDate <= checkInDate) {
        return {
          success: false,
          pricePerNight: [],
          subtotal: 0,
          currency: 'EUR',
          error: 'Check-out must be after check-in',
        }
      }

      const checkInISO = format(checkInDate, 'yyyy-MM-dd')
      const checkOutISO = format(checkOutDate, 'yyyy-MM-dd')
      const nights = Math.ceil(
        (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      const stayDays = eachDayOfInterval({
        start: checkInDate,
        end: addDays(checkOutDate, -1),
      })
      const lastNight = addDays(checkOutDate, -1)
      const nightlyPrices = new Map<string, number>()
      const [
        { data: basePrice, error: basePriceError },
        { data: pricingRules, error: pricingRulesError },
        { data: dailyPrices, error: dailyError },
      ] = await Promise.all([
        supabase
          .from('property_prices')
          .select('base_price, weekend_price')
          .eq('property_id', propertyId)
          .maybeSingle(),
        supabase
          .from('pricing_rules')
          .select('start_date, end_date, price_per_night')
          .eq('property_id', propertyId)
          .lte('start_date', checkOutISO)
          .gte('end_date', checkInISO)
          .order('start_date', { ascending: true }),
        supabase
          .from('daily_prices')
          .select('date, base_price')
          .eq('property_id', propertyId)
          .gte('date', checkInISO)
          .lt('date', checkOutISO)
          .order('date', { ascending: true }),
      ])

      if (basePriceError && basePriceError.code !== 'PGRST116') {
        console.error('[ReservationValidator] Error fetching property_prices:', basePriceError)
      }

      if (pricingRulesError && pricingRulesError.code !== 'PGRST116') {
        console.error('[ReservationValidator] Error fetching pricing_rules:', pricingRulesError)
      }

      if (dailyError && dailyError.code !== 'PGRST116') {
        console.error('[ReservationValidator] Error fetching daily_prices:', dailyError)
      }

      const baseNightlyPrice = Number(basePrice?.base_price) || 0
      const weekendPrice = Number(basePrice?.weekend_price) || null

      if (baseNightlyPrice > 0) {
        for (const day of stayDays) {
          const dateKey = format(day, 'yyyy-MM-dd')
          const isWeekend = day.getDay() === 5 || day.getDay() === 6
          nightlyPrices.set(dateKey, isWeekend && weekendPrice ? weekendPrice : baseNightlyPrice)
        }
      }

      for (const rule of pricingRules ?? []) {
        const ruleStart = this.parseLocalDate(rule.start_date)
        const ruleEnd = this.parseLocalDate(rule.end_date)
        const overlapStart = ruleStart > checkInDate ? ruleStart : checkInDate
        const overlapEnd = ruleEnd < lastNight ? ruleEnd : lastNight

        if (overlapStart > overlapEnd) continue

        for (const day of eachDayOfInterval({ start: overlapStart, end: overlapEnd })) {
          nightlyPrices.set(format(day, 'yyyy-MM-dd'), Number(rule.price_per_night))
        }
      }

      for (const daily of dailyPrices ?? []) {
        nightlyPrices.set(
          format(this.parseLocalDate(daily.date), 'yyyy-MM-dd'),
          Number(daily.base_price)
        )
      }

      const pricePerNight: number[] = []
      const missingDates: string[] = []

      for (const day of stayDays) {
        const dateKey = format(day, 'yyyy-MM-dd')
        const price = nightlyPrices.get(dateKey)
        if (price === undefined) {
          missingDates.push(dateKey)
          continue
        }
        pricePerNight.push(price)
      }

      if (missingDates.length > 0) {
        return {
          success: false,
          pricePerNight: [],
          subtotal: 0,
          currency: 'EUR',
          error: `No pricing configured for date ${missingDates[0]} (configure pricing_rules or daily_prices)`,
        }
      }

      const subtotal = pricePerNight.reduce((sum, price) => sum + price, 0)

      return {
        success: true,
        pricePerNight,
        subtotal,
        currency: 'EUR',
        breakdown: stayDays.map((day, index) => ({
          date: format(day, 'yyyy-MM-dd'),
          price: pricePerNight[index] ?? 0,
        })),
      }
    } catch (error) {
      return {
        success: false,
        pricePerNight: [],
        subtotal: 0,
        currency: 'EUR',
        error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  static async validateDiscounts(
    propertyId: string,
    subtotal: number,
    nights: number
  ): Promise<DiscountResult> {
    try {
      if (nights < 7) {
        return {
          success: true,
          hasDiscount: false,
          discountPercentage: 0,
          originalPrice: subtotal,
          discountedPrice: subtotal,
          reason: 'No discount for stays under 7 nights',
        }
      }

      const supabase = await this.getClient()

      // Fetch discount rules for the property
      const { data: discounts, error } = await supabase
        .from('property_discounts')
        .select('discount_type, percentage, min_nights')
        .eq('property_id', propertyId)
        .order('min_nights', { ascending: true })

      if (error) {
        return {
          success: false,
          hasDiscount: false,
          discountPercentage: 0,
          originalPrice: subtotal,
          discountedPrice: subtotal,
          reason: `Database error: ${error.message}`,
        }
      }

      const resolvedDiscount = resolveVolumeDiscountRule(discounts ?? [], nights)

      if (!resolvedDiscount) {
        return {
          success: true,
          hasDiscount: false,
          discountPercentage: 0,
          originalPrice: subtotal,
          discountedPrice: subtotal,
          reason: `No discount for ${nights} nights`,
        }
      }

      const { discount, isDefault } = resolvedDiscount
      const discountAmount = (subtotal * discount.percentage) / 100
      const discountedPrice = subtotal - discountAmount
      const discountTypeLabel = discount.discount_type === 'weekly'
        ? 'Weekly'
        : discount.discount_type === 'monthly'
        ? 'Monthly'
        : discount.discount_type

      return {
        success: true,
        hasDiscount: discount.percentage > 0,
        discountType: discount.discount_type.includes('monthly') || discount.discount_type.includes('weekly')
          ? ('min_stay' as const)
          : ('extended_stay' as const),
        discountPercentage: discount.percentage,
        originalPrice: subtotal,
        discountedPrice,
        reason: `${isDefault ? 'Default ' : ''}${discountTypeLabel} discount applied (${nights} nights)`,
      }
    } catch (error) {
      return {
        success: false,
        hasDiscount: false,
        discountPercentage: 0,
        originalPrice: subtotal,
        discountedPrice: subtotal,
        reason: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  static async validateMinimumNights(
    propertyId: string,
    nights: number,
    checkIn?: string,
    checkOut?: string,
    options: ValidationOptions = {}
  ): Promise<MinimumNightsResult> {
    try {
      const supabase = await this.getClient()

      // Fetch min/max nights from property_availability table
      const { data: availabilityData, error } = await supabase
        .from('property_availability')
        .select('min_nights, max_nights')
        .eq('property_id', propertyId)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = "no rows" (expected), other errors should be reported
        return {
          success: false,
          passed: false,
          minimumNights: Number(availabilityData?.min_nights) || 1,
          selectedNights: nights,
          error: `Database error: ${error.message}`,
        }
      }

      // A pricing rule can impose a stricter minimum for the selected period.
      // Use the same overlap semantics as the calendar/public availability API
      // so a direct reservation cannot bypass a seasonal minimum stay.
      let periodMinimumNights = 1
      if (checkIn && checkOut) {
        const { data: pricingRules, error: pricingRulesError } = await supabase
          .from('pricing_rules')
          .select('min_nights')
          .eq('property_id', propertyId)
          .lte('start_date', checkOut)
          .gte('end_date', checkIn)

        if (pricingRulesError) {
          return {
            success: false,
            passed: false,
            minimumNights: availabilityData?.min_nights ?? 1,
            selectedNights: nights,
            error: `Database error: ${pricingRulesError.message}`,
          }
        }

        periodMinimumNights = (pricingRules ?? []).reduce(
          (maximum, rule) => Math.max(maximum, Number(rule.min_nights) || 1),
          1
        )
      }

      // Defaults: min 1, max 365 (if no record found). The effective minimum
      // is the strictest value from the global availability card or period rule.
      const configuredMinimumNights = Number(availabilityData?.min_nights) || 1
      const minimumNights = Math.max(configuredMinimumNights, periodMinimumNights)
      const maximumNights = Number(availabilityData?.max_nights) || 365
      const allowMinimumNightsOverride = options.allowMinimumNightsOverride === true
      const isBelowMinimum = nights < minimumNights

      if (isBelowMinimum && allowMinimumNightsOverride) {
        return {
          success: true,
          passed: true,
          minimumNights,
          selectedNights: nights,
          requiresApproval: true,
          overrideApplied: true,
        }
      }

      return {
        success: true,
        passed: !isBelowMinimum && nights <= maximumNights,
        minimumNights,
        selectedNights: nights,
        requiresApproval: isBelowMinimum,
        error:
          isBelowMinimum
            ? `This property requires minimum ${minimumNights} night${minimumNights > 1 ? 's' : ''}. You selected ${nights} nights.`
            : nights > maximumNights
            ? `This property allows maximum ${maximumNights} nights. You selected ${nights} nights.`
            : undefined,
      }
    } catch (error) {
      return {
        success: false,
        passed: false,
        minimumNights: 1, // Default to 1 even on error
        selectedNights: nights,
        error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  static async validateCancellationPolicy(
    propertyId: string,
    checkIn: string,
    nights = 0
  ): Promise<CancellationPolicyResult> {
    try {
      const supabase = await this.getClient()

      // The property has separate cancellation rules for short stays and
      // long stays. Long stay starts at the same 28-night boundary as the
      // monthly discount card.
      const isLongStay = nights >= 28

      // Fetch cancellation policy for the property
      const { data: policies, error } = await supabase
        .from('property_cancellation_policies')
        .select('id, policy_type, full_refund_days, partial_refund_days, partial_refund_percent')
        .eq('property_id', propertyId)
        .eq('is_long_stay', isLongStay)
        .eq('is_active', true)
        .order('policy_type', { ascending: true })
        .limit(1)

      if (error) {
        return {
          success: false,
          policyId: '',
          policyName: 'Unknown',
          terms: '',
          refundPercentage: 0,
          refundDeadlineDays: 0,
          error: `Database error: ${error.message}`,
        }
      }

      if (!policies || policies.length === 0) {
        return {
          success: false,
          policyId: '',
          policyName: 'Not configured',
          terms: '',
          refundPercentage: 0,
          refundDeadlineDays: 0,
          error: 'No cancellation policy configured for this property',
        }
      }

      const policy = policies[0]
      const policyNameMap: Record<string, string> = {
        'flexible': 'Flexible',
        'moderate': 'Moderate',
        'limited': 'Limited',
        'firm': 'Firm',
        'rigid': 'Rigid',
      }

      return {
        success: true,
        policyId: policy.id,
        policyName: policyNameMap[policy.policy_type] || policy.policy_type,
        terms: `Full refund until ${policy.full_refund_days} days before check-in${
          policy.partial_refund_days ? `; ${policy.partial_refund_percent}% refund until ${policy.partial_refund_days} days before` : ''
        }`,
        refundPercentage: 100,
        refundDeadlineDays: policy.full_refund_days,
      }
    } catch (error) {
      return {
        success: false,
        policyId: '',
        policyName: 'Unknown',
        terms: '',
        refundPercentage: 0,
        refundDeadlineDays: 0,
        error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  static async validateReservationOverlap(
    propertyId: string,
    checkIn: string,
    checkOut: string,
    excludeReservationId?: string
  ): Promise<OverlapResult> {
    try {
      const supabase = await this.getClient()

      // Query: Find all active reservations with overlapping dates
      // Overlap logic: existing.check_in < new.checkOut AND existing.check_out > new.checkIn
      const { data: reservations, error } = await supabase
        .from('reservations')
        .select('id, check_in, check_out')
        .eq('property_id', propertyId)
        .neq('status', 'cancelled')
        .lt('check_in', checkOut)
        .gt('check_out', checkIn)

      if (error) {
        return {
          hasConflict: false,
          conflictingReservations: [],
          error: `Database error: ${error.message}`,
        }
      }

      // Filter out excluded reservation (for edit scenarios)
      const conflicts = excludeReservationId
        ? (reservations ?? []).filter((r) => r.id !== excludeReservationId)
        : (reservations ?? [])

      return {
        hasConflict: conflicts.length > 0,
        conflictingReservations: conflicts.map((r) => ({
          id: r.id,
          checkIn: r.check_in,
          checkOut: r.check_out,
        })),
      }
    } catch (error) {
      return {
        hasConflict: false,
        conflictingReservations: [],
        error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  static async validateFees(
    propertyId: string,
    nights: number
  ): Promise<FeesResult> {
    try {
      const supabase = await this.getClient()

      // Fetch fees from properties table
      const { data: property, error } = await supabase
        .from('properties')
        .select('cleaning_fee, cleaning_fee_type, pet_fee, pet_fee_type')
        .eq('id', propertyId)
        .single()

      if (error) {
        return {
          success: true,
          cleaningFee: 0,
          cleaningFeeType: null,
          petFee: 0,
          petFeeType: null,
          totalFees: 0,
          breakdown: [],
        }
      }

      const breakdown: Array<{ name: string; amount: number; type: string }> = []
      let totalFees = 0

      // Calculate cleaning fee
      let cleaningFee = 0
      if (property?.cleaning_fee && property.cleaning_fee > 0) {
        cleaningFee =
          property.cleaning_fee_type === 'per_night'
            ? property.cleaning_fee * nights
            : property.cleaning_fee
        breakdown.push({
          name: 'Limpeza',
          amount: cleaningFee,
          type: property.cleaning_fee_type || 'per_stay',
        })
        totalFees += cleaningFee
      }

      // Calculate pet fee
      let petFee = 0
      if (property?.pet_fee && property.pet_fee > 0) {
        petFee =
          property.pet_fee_type === 'per_night'
            ? property.pet_fee * nights
            : property.pet_fee
        breakdown.push({
          name: 'Animal de Estimação',
          amount: petFee,
          type: property.pet_fee_type || 'per_stay',
        })
        totalFees += petFee
      }

      return {
        success: true,
        cleaningFee: property?.cleaning_fee || 0,
        cleaningFeeType: (property?.cleaning_fee_type as 'per_stay' | 'per_night' | null) || null,
        petFee: property?.pet_fee || 0,
        petFeeType: (property?.pet_fee_type as 'per_stay' | 'per_night' | null) || null,
        totalFees,
        breakdown,
      }
    } catch (error) {
      return {
        success: false,
        cleaningFee: 0,
        cleaningFeeType: null,
        petFee: 0,
        petFeeType: null,
        totalFees: 0,
        breakdown: [],
        error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  static async validate(
    propertyId: string,
    checkIn: string,
    checkOut: string,
    options: ValidationOptions = {}
  ): Promise<ValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []

    // Calculate nights
    const checkInDate = new Date(checkIn)
    const checkOutDate = new Date(checkOut)
    const nights = Math.ceil(
      (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (nights <= 0) {
      errors.push('Check-out must be after check-in')
    }

    // Run all validations in parallel
    const [priceResult, minimumNightsResult, cancellationPolicyResult, overlapResult, feesResult] =
      await Promise.all([
        this.validatePrice(propertyId, checkIn, checkOut),
        this.validateMinimumNights(propertyId, nights, checkIn, checkOut, options),
        this.validateCancellationPolicy(propertyId, checkIn, nights),
        this.validateReservationOverlap(propertyId, checkIn, checkOut),
        this.validateFees(propertyId, nights),
      ])

    // Calculate discount after price is known
    const discountResult = await this.validateDiscounts(
      propertyId,
      priceResult.subtotal,
      nights
    )

    // Calculate final breakdown
    const basePrice = priceResult.subtotal
    const discountAmount = basePrice - discountResult.discountedPrice
    const priceAfterDiscount = discountResult.discountedPrice
    const totalFees = feesResult.totalFees
    const subtotalWithFees = priceAfterDiscount + totalFees
    const finalPrice = subtotalWithFees

    // Collect errors
    if (!priceResult.success && priceResult.error) errors.push(priceResult.error)
    if (!minimumNightsResult.passed && !minimumNightsResult.overrideApplied && minimumNightsResult.error)
      errors.push(minimumNightsResult.error)
    if (minimumNightsResult.overrideApplied) {
      warnings.push(
        `Exceção aprovada: o período fica abaixo do mínimo de ${minimumNightsResult.minimumNights} noites, mas a reserva manual foi autorizada.`
      )
    }
    if (overlapResult.hasConflict) {
      const conflictIds = overlapResult.conflictingReservations.map((r) => r.id).join(', ')
      errors.push(`Overlapping reservations found: ${conflictIds}`)
    }
    if (overlapResult.error) warnings.push(overlapResult.error)
    if (!cancellationPolicyResult.success && cancellationPolicyResult.error)
      warnings.push(cancellationPolicyResult.error)

    // Collect additional errors
    if (!feesResult.success && feesResult.error) warnings.push(feesResult.error)

    return {
      success: errors.length === 0,
      propertyId,
      checkIn,
      checkOut,
      nights,
      price: priceResult,
      discount: discountResult,
      minimumNights: minimumNightsResult,
      cancellationPolicy: cancellationPolicyResult,
      fees: feesResult,
      breakdown: {
        basePrice,
        discountAmount,
        discountPercentage: discountResult.discountPercentage,
        cleaningFee: feesResult.cleaningFee > 0 ? feesResult.totalFees : 0,
        petFee: feesResult.petFee > 0 ? feesResult.petFee : 0,
        subtotal: priceAfterDiscount,
        totalFees,
        finalPrice,
        currency: priceResult.currency,
      },
      finalPrice,
      errors,
      warnings,
    }
  }
}
