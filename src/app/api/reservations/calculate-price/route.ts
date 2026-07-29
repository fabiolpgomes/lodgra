import { NextRequest, NextResponse } from 'next/server'
import { DiscountCalculator } from '@/lib/pricing/discount-calculator'

interface CalculatePriceRequest {
  base_price: number
  loyalty_discount_percent?: number
  check_in: string // ISO date string
  check_out: string // ISO date string
  nights_total: number
  seasonal_modifier_percent?: number
  minimum_price_floor?: number
}

/**
 * POST /api/reservations/calculate-price
 *
 * Calculates final price with all applicable discounts.
 * Accepts check-in/check-out dates and calculates days until check-in.
 *
 * @param request - Next.js request object with pricing parameters
 * @returns JSON with detailed price breakdown and all applied discounts
 */
export async function POST(request: NextRequest) {
  try {
    const body: CalculatePriceRequest = await request.json()

    // Validate required fields
    if (body.base_price === undefined) {
      return NextResponse.json(
        { error: 'base_price is required' },
        { status: 400 }
      )
    }

    if (!body.check_in || !body.check_out) {
      return NextResponse.json(
        { error: 'check_in and check_out dates are required' },
        { status: 400 }
      )
    }

    if (body.nights_total === undefined) {
      return NextResponse.json(
        { error: 'nights_total is required' },
        { status: 400 }
      )
    }

    // Parse dates
    let checkInDate: Date
    try {
      checkInDate = new Date(body.check_in)
      if (isNaN(checkInDate.getTime())) {
        throw new Error('Invalid date format')
      }
    } catch {
      return NextResponse.json(
        { error: 'Invalid check_in date format (use ISO 8601)' },
        { status: 400 }
      )
    }

    // Calculate days until check-in
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    checkInDate.setHours(0, 0, 0, 0)

    const daysUntilCheckin = Math.ceil(
      (checkInDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysUntilCheckin < 0) {
      return NextResponse.json(
        { error: 'check_in date cannot be in the past' },
        { status: 400 }
      )
    }

    // Calculate discount
    const result = DiscountCalculator.calculate({
      base_price: body.base_price,
      loyalty_discount_percent: body.loyalty_discount_percent ?? 0,
      stay_duration_nights: body.nights_total,
      days_until_checkin: daysUntilCheckin,
      seasonal_modifier_percent: body.seasonal_modifier_percent,
      minimum_price_floor: body.minimum_price_floor,
    })

    // Validate result
    if (!DiscountCalculator.validatePrice(result.base_price, result.final_price)) {
      console.error('Invalid price calculation result:', result)
      return NextResponse.json(
        { error: 'Invalid price calculation' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      base_price: result.base_price,
      loyalty_discount_percent: result.loyalty_discount_percent,
      loyalty_discount_amount: result.loyalty_discount_amount,
      last_minute_discount: result.last_minute_discount,
      extended_stay_discount: result.extended_stay_discount,
      early_bird_discount: result.early_bird_discount,
      seasonal_adjustment: result.seasonal_adjustment,
      total_discounts_amount: result.total_discounts_amount,
      minimum_price_floor: result.minimum_price_floor,
      final_price: result.final_price,
      discount_breakdown: result.discount_breakdown,
      applied_rules: result.applied_rules,
      days_until_checkin: daysUntilCheckin,
      calculation_date: new Date().toISOString(),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('Erro em /api/reservations/calculate-price:', message)
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
