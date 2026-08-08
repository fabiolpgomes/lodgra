/**
 * Story 37.2: Get daily prices for a property
 * GET /api/properties/:id/daily-prices
 *
 * Returns pricing by date using this hierarchy:
 * 1. daily_prices (daily overrides set via admin calendar)
 * 2. pricing_rules (period-based pricing fallback)
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { eachDayOfInterval, format } from 'date-fns'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: propertyId } = await params

  try {
    const supabase = await createAdminClient()
    const pricesMap = new Map<string, number>()

    // Fetch weekend_price from properties table
    const { data: property } = await supabase
      .from('properties')
      .select('weekend_price')
      .eq('id', propertyId)
      .single()

    const weekendPrice = property?.weekend_price || null

    // Step 1: Get all pricing_rules for this property (base layer)
    const { data: rules, error: rulesError } = await supabase
      .from('pricing_rules')
      .select('start_date, end_date, price_per_night')
      .eq('property_id', propertyId)
      .order('start_date', { ascending: true })

    if (rulesError) {
      console.error('[daily-prices] Error fetching pricing_rules:', rulesError)
    }

    // Build base prices from pricing_rules
    if (rules && rules.length > 0) {
      for (const rule of rules) {
        const startDate = new Date(rule.start_date)
        const endDate = new Date(rule.end_date)
        const daysInRange = eachDayOfInterval({ start: startDate, end: endDate })

        for (const day of daysInRange) {
          const dateStr = format(day, 'yyyy-MM-dd')
          pricesMap.set(dateStr, rule.price_per_night)
        }
      }
    }

    // Step 2: Get daily_prices overrides (overlay on top of pricing_rules)
    const { data: dailyPricesRaw, error: dailyError } = await supabase
      .from('daily_prices')
      .select('date, base_price')
      .eq('property_id', propertyId)

    if (dailyError) {
      // Handle missing table gracefully (continue with just pricing_rules)
      if (!(dailyError.code === '42P01' || dailyError.message?.includes('does not exist'))) {
        console.error('[daily-prices] Error fetching daily_prices:', dailyError)
      }
    } else if (dailyPricesRaw) {
      // Override with daily prices
      for (const daily of dailyPricesRaw) {
        const dateStr = format(new Date(daily.date), 'yyyy-MM-dd')
        pricesMap.set(dateStr, daily.base_price)
      }
    }

    // Convert map to array format, applying weekend pricing if configured
    const dailyPrices = Array.from(pricesMap.entries()).map(([date, base_price]) => {
      const dateObj = new Date(date)
      const dayOfWeek = dateObj.getDay() // 0 = Sunday, 6 = Saturday
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

      // Use weekend_price if available and it's a weekend day
      const finalPrice = isWeekend && weekendPrice ? weekendPrice : base_price

      return {
        date,
        base_price,
        weekend_price: weekendPrice,
        final_price: finalPrice,
      }
    })

    return NextResponse.json(dailyPrices)
  } catch (error) {
    console.error('[daily-prices] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Server error: ${errorMessage}` },
      { status: 500 }
    )
  }
}
