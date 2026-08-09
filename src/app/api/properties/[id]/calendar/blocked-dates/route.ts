/**
 * Get Blocked Dates API - Retrieve blocked date ranges for a property
 * GET /api/properties/[id]/calendar/blocked-dates?year=YYYY&month=MM
 *
 * Returns all blocked date ranges for the given month
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: propertyId } = await params

  try {
    // Get query parameters for month filtering
    const url = new URL(request.url)
    const year = parseInt(url.searchParams.get('year') || new Date().getFullYear().toString())
    const month = parseInt(url.searchParams.get('month') || (new Date().getMonth() + 1).toString())

    // Validate inputs
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json(
        { success: false, error: 'Invalid year or month parameters' },
        { status: 400 }
      )
    }

    const supabase = await createAdminClient()

    // Calculate start and end dates for the month
    const monthStart = new Date(year, month - 1, 1)
    const monthEnd = new Date(year, month, 0)

    const startDateStr = monthStart.toISOString().split('T')[0]
    const endDateStr = monthEnd.toISOString().split('T')[0]

    console.log(`📅 [blocked-dates GET] Fetching for property=${propertyId}, month=${year}-${String(month).padStart(2, '0')}`)

    // Fetch all blocks that overlap with this month using admin client (no RLS)
    const { data: blocks, error } = await supabase
      .from('calendar_blocks')
      .select('id, start_date, end_date, notes, block_type, created_at')
      .eq('property_id', propertyId)
      .lte('start_date', endDateStr)
      .gte('end_date', startDateStr)
      .order('start_date', { ascending: true })

    if (error) {
      console.error('❌ Fetch blocked dates error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        propertyId,
      })
      return NextResponse.json(
        { success: false, error: `Database error: ${error.message}` },
        { status: 500 }
      )
    }

    console.log(`✅ Fetched ${blocks?.length || 0} blocked date ranges for ${year}-${String(month).padStart(2, '0')}`, {
      dateRange: `${startDateStr} to ${endDateStr}`,
      blocks: blocks?.map(b => ({ id: b.id, dates: `${b.start_date} to ${b.end_date}` }))
    })

    return NextResponse.json({
      success: true,
      data: blocks || [],
      month: {
        year,
        month,
        startDate: startDateStr,
        endDate: endDateStr,
      },
    })
  } catch (error) {
    console.error('❌ Error fetching blocked dates:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { success: false, error: `Server error: ${errorMessage}` },
      { status: 500 }
    )
  }
}
