import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseISO, differenceInDays, format, addDays, eachDayOfInterval } from 'date-fns'

/**
 * Story 37.2: Calculate reservation price using daily_prices table
 * POST /api/reservations/calculate-price
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { property_id, check_in, check_out } = body

    if (!property_id || !check_in || !check_out) {
      return NextResponse.json(
        { error: 'property_id, check_in e check_out são obrigatórios' },
        { status: 400 }
      )
    }

    const checkInDate = parseISO(check_in as string)
    const checkOutDate = parseISO(check_out as string)

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return NextResponse.json(
        { error: 'Datas inválidas' },
        { status: 400 }
      )
    }

    const nights = differenceInDays(checkOutDate, checkInDate)
    if (nights < 1) {
      return NextResponse.json(
        { error: 'Check-out deve ser depois do check-in' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Fetch property with fees
    const { data: property, error: propError } = await supabase
      .from('properties')
      .select('id, min_nights, cleaning_fee, cleaning_fee_type, pet_fee, pet_fee_type')
      .eq('id', property_id)
      .single()

    if (propError || !property) {
      console.warn(`[calculate-price] Property not found: ${property_id}`, propError)
      return NextResponse.json({
        success: true,
        price_per_night: 0,
        total_amount: 0,
        nights,
        cleaning_fee: 0,
        pet_fee: 0,
        base_total: 0,
        min_nights: 1,
        warning: 'Property not found - please enter value manually'
      })
    }

    // Fetch daily prices for the date range
    const checkInStr = format(checkInDate, 'yyyy-MM-dd')
    const checkOutStr = format(checkOutDate, 'yyyy-MM-dd')

    const { data: dailyPricesData } = await supabase
      .from('daily_prices')
      .select('date, base_price')
      .eq('property_id', property_id)
      .gte('date', checkInStr)
      .lt('date', checkOutStr)

    // Map prices by date for easy lookup
    const pricesByDate = new Map<string, number>()
    if (dailyPricesData) {
      dailyPricesData.forEach((p: { date: string; base_price: number }) => {
        pricesByDate.set(p.date, parseFloat(String(p.base_price)))
      })
    }

    // Calculate total price by iterating each night
    let totalPrice = 0
    const daysInStay = eachDayOfInterval({
      start: checkInDate,
      end: addDays(checkOutDate, -1),
    })

    for (const day of daysInStay) {
      const dateStr = format(day, 'yyyy-MM-dd')
      const dayPrice = pricesByDate.get(dateStr) ?? 0
      totalPrice += dayPrice
    }

    // Add fees
    const cleaningFee = property.cleaning_fee ?? 0
    const petFee = property.pet_fee ?? 0
    const cleaningFeeTotal = cleaningFee > 0
      ? (property.cleaning_fee_type === 'per_night' ? cleaningFee * nights : cleaningFee)
      : 0
    const petFeeTotal = petFee > 0
      ? (property.pet_fee_type === 'per_night' ? petFee * nights : petFee)
      : 0

    const finalTotal = totalPrice + cleaningFeeTotal + petFeeTotal
    const propertyMinNights = property.min_nights ? parseInt(String(property.min_nights)) : 1

    return NextResponse.json({
      success: true,
      price_per_night: totalPrice / nights || 0, // Average price per night
      total_amount: finalTotal,
      nights,
      cleaning_fee: cleaningFeeTotal,
      pet_fee: petFeeTotal,
      base_total: totalPrice,
      min_nights: propertyMinNights,
    })
  } catch (error: unknown) {
    console.error('[calculate-price] Error:', error)
    const msg = error instanceof Error ? error.message : 'Error calculating price'
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    )
  }
}
