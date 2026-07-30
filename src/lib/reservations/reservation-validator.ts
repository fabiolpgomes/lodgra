import { createClient } from '@/lib/supabase/server'

export interface PriceResult {
  success: boolean
  pricePerNight: number[]
  subtotal: number
  currency: string
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

      // Fetch daily prices for the period
      const { data: prices, error } = await supabase
        .from('calendar_pricing')
        .select('date, price_per_night, currency')
        .eq('property_id', propertyId)
        .gte('date', checkIn)
        .lt('date', checkOut)
        .order('date', { ascending: true })

      if (error) {
        return {
          success: false,
          pricePerNight: [],
          subtotal: 0,
          currency: 'EUR',
          error: `Database error: ${error.message}`,
        }
      }

      if (!prices || prices.length === 0) {
        return {
          success: false,
          pricePerNight: [],
          subtotal: 0,
          currency: 'EUR',
          error: 'No pricing configured for these dates',
        }
      }

      const pricePerNight = prices.map((p) => p.price_per_night)
      const subtotal = pricePerNight.reduce((sum, price) => sum + price, 0)
      const currency = prices[0]?.currency || 'EUR'

      return {
        success: true,
        pricePerNight,
        subtotal,
        currency,
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
        .select('discount_type, discount_percentage, min_nights, max_nights')
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
        if (
          nights >= discount.min_nights &&
          (!discount.max_nights || nights <= discount.max_nights)
        ) {
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

      const discountAmount = (subtotal * applicableDiscount.discount_percentage) / 100
      const discountedPrice = subtotal - discountAmount

      return {
        success: true,
        hasDiscount: true,
        discountType: applicableDiscount.discount_type as 'min_stay' | 'extended_stay',
        discountPercentage: applicableDiscount.discount_percentage,
        originalPrice: subtotal,
        discountedPrice,
        reason: `${applicableDiscount.discount_type === 'extended_stay' ? 'Extended' : 'Minimum'} stay discount applied (${nights} nights)`,
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

      const { data: property, error } = await supabase
        .from('properties')
        .select('min_nights_configured')
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

      const minimumNights = property?.min_nights_configured || 1

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

      // Fetch cancellation policy for the property/date
      const { data: policies, error } = await supabase
        .from('cancellation_policies')
        .select('id, name, terms, refund_percentage, refund_deadline_days')
        .eq('property_id', propertyId)
        .lte('start_date', checkIn)
        .order('start_date', { ascending: false })
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

      return {
        success: true,
        policyId: policy.id,
        policyName: policy.name,
        terms: policy.terms,
        refundPercentage: policy.refund_percentage,
        refundDeadlineDays: policy.refund_deadline_days,
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
    const [priceResult, minimumNightsResult, cancellationPolicyResult, overlapResult] =
      await Promise.all([
        this.validatePrice(propertyId, checkIn, checkOut),
        this.validateMinimumNights(propertyId, nights),
        this.validateCancellationPolicy(propertyId, checkIn),
        this.validateReservationOverlap(propertyId, checkIn, checkOut),
      ])

    // Calculate discount after price is known
    const discountResult = await this.validateDiscounts(
      propertyId,
      priceResult.subtotal,
      nights
    )

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

    const finalPrice = discountResult.discountedPrice

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
      finalPrice,
      errors,
      warnings,
    }
  }
}
