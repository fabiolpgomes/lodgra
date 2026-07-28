/**
 * Story 37.2: Get daily prices for a property
 * GET /api/properties/:id/daily-prices
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: propertyId } = await params

  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('daily_prices')
      .select('date, base_price')
      .eq('property_id', propertyId)
      .order('date', { ascending: true })

    if (error) {
      console.error('[daily-prices] Supabase error:', error)
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('[daily-prices] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Server error: ${errorMessage}` },
      { status: 500 }
    )
  }
}
