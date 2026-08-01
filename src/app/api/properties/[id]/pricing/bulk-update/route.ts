/**
 * Bulk update pricing for multiple dates
 * POST /api/properties/:id/pricing/bulk-update
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: propertyId } = await params

  try {
    const supabase = await createAdminClient()
    const body = await request.json()
    const { dates, base_price } = body

    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid dates' },
        { status: 400 }
      )
    }

    if (typeof base_price !== 'number' || base_price < 1) {
      return NextResponse.json(
        { success: false, error: 'Invalid base_price' },
        { status: 400 }
      )
    }

    // Update pricing for each date
    const updates = dates.map(date => ({
      property_id: propertyId,
      date,
      base_price,
      updated_at: new Date().toISOString(),
    }))

    // Upsert prices for all dates
    console.log('📊 Attempting to upsert', updates.length, 'records to daily_prices table')
    console.log('📊 Sample record:', updates[0])
    const { data, error } = await supabase
      .from('daily_prices')
      .upsert(updates, { onConflict: 'property_id,date' })

    if (error) {
      console.error('❌ Supabase error:', error)
      console.error('Error code:', error.code)
      console.error('Error message:', error.message)
      return NextResponse.json(
        { success: false, error: `Database error: ${error.message}` },
        { status: 500 }
      )
    }

    console.log('✅ Upsert successful')
    return NextResponse.json({
      success: true,
      data: {
        updated_dates: dates.length,
        base_price,
      },
    })
  } catch (error) {
    console.error('❌ Error in bulk price update:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { success: false, error: `Server error: ${errorMessage}` },
      { status: 500 }
    )
  }
}
