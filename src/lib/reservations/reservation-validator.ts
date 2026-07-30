import { createClient } from '@/lib/supabase/server'

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
  error?: string
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
    return await createClient()
  }

  static async validatePrice(
    propertyId: string,
    checkIn: string,
    checkOut: string
  ): Promise<PriceResult> {
    try {
      const supabase = await this.getClient()
      const checkInDate = new Date(checkIn)
      const checkOutDate = new Date(checkOut)

      if (checkOutDate <= checkInDate) {
        return {
          success: false,
          pricePerNight: [],
          subtotal: 0,
          currency: 'EUR',
          error: 'Check-out must be after check-in',
        }
      }

      // Convert dates to ISO 8601 format (YYYY-MM-DD) for database comparison
      const checkInISO = checkInDate.toISOString().split('T')[0]
      const checkOutISO = checkOutDate.toISOString().split('T')[0]
      const nights = Math.ceil(
        (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
      )

      // Try to fetch daily prices from property_daily_prices table (overrides)
      const { data: dailyPrices, error: dailyError } = await supabase
        .from('property_daily_prices')
        .select('date, price')
        .eq('property_id', propertyId)
        .gte('date', checkInISO)
        .lt('date', checkOutISO)
        .order('date', { ascending: true })

      // If daily prices found, use them
      if (dailyPrices && dailyPrices.length > 0) {
        const pricePerNight = dailyPrices.map((p) => p.price)
        const subtotal = pricePerNight.reduce((sum, price) => sum + price, 0)

        return {
          success: true,
          pricePerNight,
          subtotal,
          currency: 'EUR',
          breakdown: dailyPrices.map((p) => ({ date: p.date, price: p.price })),
        }
      }

      // Fallback: Use base price from property_prices table
      const { data: basePrice, error: basePriceError } = await supabase
        .from('property_prices')
        .select('base_price, weekend_price')
        .eq('property_id', propertyId)
        .single()

      if (basePriceError || !basePrice) {
        return {
          success: false,
          pricePerNight: [],
          subtotal: 0,
          currency: 'EUR',
          error: 'No pricing configured for this property',
        }
      }

      // Calculate prices for each night (weekday vs weekend)
      const pricePerNight: number[] = []
      for (let i = 0; i < nights; i++) {
        const date = new Date(checkInDate)
        date.setDate(date.getDate() + i)
        const dayOfWeek = date.getDay()
        // Friday (5) and Saturday (6) are weekends
        const isWeekend = dayOfWeek === 5 || dayOfWeek === 6
        const price = isWeekend && basePrice.weekend_price ? basePrice.weekend_price : basePrice.base_price
        pricePerNight.push(price)
      }

      const subtotal = pricePerNight.reduce((sum, price) => sum + price, 0)

      return {
        success: true,
        pricePerNight,
        subtotal,
        currency: 'EUR',
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

      if (!discounts || discounts.length === 0) {
        return {
          success: true,
          hasDiscount: false,
          discountPercentage: 0,
          originalPrice: subtotal,
          discountedPrice: subtotal,
          reason: 'No discount rules configured',
        }
      }

      // Find applicable discount (highest discount for the night range)
      let applicableDiscount = null
      for (const discount of discounts) {
        if (nights >= discount.min_nights) {
          applicableDiscount = discount
        }
      }

      if (!applicableDiscount) {
        return {
          success: true,
          hasDiscount: false,
          discountPercentage: 0,
          originalPrice: subtotal,
          discountedPrice: subtotal,
          reason: `No discount for ${nights} nights`,
        }
      }

      const discountAmount = (subtotal * applicableDiscount.percentage) / 100
      const discountedPrice = subtotal - discountAmount
      const discountTypeLabel = applicableDiscount.discount_type === 'weekly' ? 'Weekly' :
                               applicableDiscount.discount_type === 'monthly' ? 'Monthly' :
                               applicableDiscount.discount_type

      return {
        success: true,
        hasDiscount: true,
        discountType: applicableDiscount.discount_type.includes('monthly') || applicableDiscount.discount_type.includes('weekly')
          ? ('min_stay' as const)
          : ('extended_stay' as const),
        discountPercentage: applicableDiscount.percentage,
        originalPrice: subtotal,
        discountedPrice,
        reason: `${discountTypeLabel} discount applied (${nights} nights)`,
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
    nights: number
  ): Promise<MinimumNightsResult> {
    try {
      const supabase = await this.getClient()

      // Fetch minimum nights from properties table (source of truth)
      const { data: property, error } = await supabase
        .from('properties')
        .select('min_nights')
        .eq('id', propertyId)
        .single()

      if (error) {
        return {
          success: false,
          passed: false,
          minimumNights: 0,
          selectedNights: nights,
          error: `Property not found: ${error.message}`,
        }
      }

      const minimumNights = property?.min_nights || 1

      return {
        success: true,
        passed: nights >= minimumNights,
        minimumNights,
        selectedNights: nights,
        error: nights < minimumNights
          ? `This property requires minimum ${minimumNights} nights. You selected ${nights} nights.`
          : undefined,
      }
    } catch (error) {
      return {
        success: false,
        passed: false,
        minimumNights: 0,
        selectedNights: nights,
        error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  }

  static async validateCancellationPolicy(
    propertyId: string,
    checkIn: string
  ): Promise<CancellationPolicyResult> {
    try {
      const supabase = await this.getClient()

      // Determine if this is a long-stay reservation (28+ nights)
      // For now, default to short-stay (false) - this should be enhanced with actual night count
      const isLongStay = false

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

      if (!reservations || reservations.length === 0) {
        return {
          hasConflict: false,
          conflictingReservations: [],
        }
      }

      // Filter out excluded reservation (for edit scenarios)
      const conflicts = excludeReservationId
        ? reservations.filter((r) => r.id !== excludeReservationId)
        : reservations

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
    checkOut: string
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
        this.validateMinimumNights(propertyId, nights),
        this.validateCancellationPolicy(propertyId, checkIn),
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
    if (!minimumNightsResult.passed && minimumNightsResult.error)
      errors.push(minimumNightsResult.error)
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
