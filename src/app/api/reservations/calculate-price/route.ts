import { NextRequest, NextResponse } from 'next/server'
import { ReservationPriceCalculator } from '@/lib/pricing/reservation-price-calculator'

interface CalculatePriceRequest {
  propertyId: string
  checkIn: string // ISO date
  checkOut: string // ISO date
  basePrice: number
  weeklyDiscountPercent?: number // 7-27 nights
  monthlyDiscountPercent?: number // 28+ nights
  loyaltyDiscountPercent?: number
  isLoyaltyGuest?: boolean
  fees?: Array<{ name: string; amount: number }>
  dailyPrices?: Record<string, number> // date -> price
  pricingRules?: Array<{
    startDate: string
    endDate: string
    pricePerNight: number
    minNights?: number
  }>
}

/**
 * POST /api/reservations/calculate-price
 *
 * Epic 43: Calculates final reservation price with:
 * - Price hierarchy: daily_prices → pricing_rules → base_price
 * - Exclusive volume discounts: Weekly (7-27) XOR Monthly (28+)
 * - Loyalty discount in cascade (after volume)
 * - Complete transparent breakdown
 *
 * @param request - Next.js request with pricing parameters
 * @returns JSON with detailed price breakdown and all applied rules
 */
export async function POST(request: NextRequest) {
  try {
    const body: CalculatePriceRequest = await request.json()

    // Validate required fields
    if (!body.propertyId) {
      return NextResponse.json(
        { error: 'propertyId is required' },
        { status: 400 }
      )
    }

    if (!body.checkIn || !body.checkOut) {
      return NextResponse.json(
        { error: 'checkIn and checkOut dates are required (ISO format)' },
        { status: 400 }
      )
    }

    if (body.basePrice === undefined || body.basePrice <= 0) {
      return NextResponse.json(
        { error: 'basePrice must be a positive number' },
        { status: 400 }
      )
    }

    // Convert daily prices record to Map if provided
    const dailyPricesMap = body.dailyPrices
      ? new Map(Object.entries(body.dailyPrices).map(([k, v]) => [k, v as number]))
      : undefined

    // Call calculator
    const result = ReservationPriceCalculator.calculate({
      propertyId: body.propertyId,
      checkIn: body.checkIn,
      checkOut: body.checkOut,
      basePrice: body.basePrice,
      weeklyDiscountPercent: body.weeklyDiscountPercent,
      monthlyDiscountPercent: body.monthlyDiscountPercent,
      loyaltyDiscountPercent: body.loyaltyDiscountPercent,
      isLoyaltyGuest: body.isLoyaltyGuest,
      fees: body.fees,
      dailyPrices: dailyPricesMap,
      pricingRules: body.pricingRules,
    })

    return NextResponse.json({
      nights: result.nights,
      pricePerNight: result.pricePerNight,
      priceSource: result.priceSource,
      subtotal: result.subtotal,

      volumeDiscountType: result.volumeDiscountType,
      volumeDiscountPercent: result.volumeDiscountPercent,
      volumeDiscountAmount: result.volumeDiscountAmount,
      afterVolumeDiscount: result.afterVolumeDiscount,

      loyaltyDiscountPercent: result.loyaltyDiscountPercent,
      loyaltyDiscountAmount: result.loyaltyDiscountAmount,
      afterLoyaltyDiscount: result.afterLoyaltyDiscount,

      fees: result.fees,
      feesTotal: result.feesTotal,

      finalPrice: result.finalPrice,

      breakdown: result.breakdown,
      appliedRules: result.appliedRules,
      calculatedAt: new Date().toISOString(),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[/api/reservations/calculate-price]', message)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
