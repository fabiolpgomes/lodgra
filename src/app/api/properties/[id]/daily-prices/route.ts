/**
 * Story 37.2: Get daily prices for a property from pricing_rules
 * GET /api/properties/:id/daily-prices
 *
 * Returns pricing by date based on pricing_rules periods.
 * No fallback - pricing_rules is source of truth.
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
    const supabase = createAdminClient()

    // Get all pricing_rules for this property
    const { data: rules, error: rulesError } = await supabase
      .from('pricing_rules')
      .select('start_date, end_date, price_per_night')
      .eq('property_id', propertyId)
      .order('start_date', { ascending: true })

    if (rulesError) {
      console.error('[daily-prices] Supabase error:', rulesError)
      return NextResponse.json(
        { error: `Database error: ${rulesError.message}` },
        { status: 500 }
      )
    }

    // Build daily prices map from pricing rules
    const dailyPrices: Array<{ date: string; base_price: number }> = []

    if (rules && rules.length > 0) {
      for (const rule of rules) {
        const startDate = new Date(rule.start_date)
        const endDate = new Date(rule.end_date)

        const daysInRange = eachDayOfInterval({ start: startDate, end: endDate })
        for (const day of daysInRange) {
          dailyPrices.push({
            date: format(day, 'yyyy-MM-dd'),
            base_price: rule.price_per_night
          })
        }
      }
    }

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
