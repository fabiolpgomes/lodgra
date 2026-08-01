/**
 * Block Dates API - Mark dates as unavailable for booking
 * POST /api/properties/[id]/calendar/block-dates
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: propertyId } = await params

  try {
    const body = await request.json()
    const { startDate, endDate, reason = 'blocked-by-owner' } = body

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'startDate and endDate required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Generate dates between start and end
    const datesArray: string[] = []
    const current = new Date(startDate)
    const end = new Date(endDate)

    while (current <= end) {
      datesArray.push(current.toISOString().split('T')[0])
      current.setDate(current.getDate() + 1)
    }

    console.log('📊 Blocking dates:', {
      propertyId,
      dateCount: datesArray.length,
      reason,
      firstDate: datesArray[0],
      lastDate: datesArray[datesArray.length - 1],
    })

    // Insert block records
    const { data, error } = await supabase
      .from('calendar_blocks')
      .insert(
        datesArray.map(date => ({
          property_id: propertyId,
          date,
          reason,
          blocked_at: new Date().toISOString(),
        }))
      )
      .select()

    if (error) {
      console.error('❌ Block dates error:', error)
      return NextResponse.json(
        { success: false, error: `Database error: ${error.message}` },
        { status: 500 }
      )
    }

    console.log('✅ Dates blocked successfully:', { blockedCount: datesArray.length })

    return NextResponse.json({
      success: true,
      data: {
        blocked_dates: datesArray.length,
        reason,
      },
    })
  } catch (error) {
    console.error('❌ Error blocking dates:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { success: false, error: `Server error: ${errorMessage}` },
      { status: 500 }
    )
  }
}
