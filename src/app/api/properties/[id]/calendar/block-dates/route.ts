/**
 * Block Dates API - Mark date range as unavailable for booking
 * POST /api/properties/[id]/calendar/block-dates
 *
 * Schema: calendar_blocks uses start_date/end_date (date ranges from iCal sync)
 * This endpoint creates a single block record covering the entire range
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

    const supabase = await createAdminClient()

    // Parse dates - frontend already sends YYYY-MM-DD format in local date
    // Do NOT use new Date() which interprets as UTC
    const validateDateFormat = (dateStr: string) => {
      const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/)
      if (!match) throw new Error(`Invalid date format: ${dateStr}`)
      const [, year, month, day] = match
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    }

    const start = validateDateFormat(startDate)
    const end = validateDateFormat(endDate)

    if (start > end) {
      return NextResponse.json(
        { success: false, error: 'startDate must be before or equal to endDate' },
        { status: 400 }
      )
    }

    // Format dates without timezone conversion - use received format directly
    const startDateStr = startDate  // Already YYYY-MM-DD from frontend
    const endDateStr = endDate      // Already YYYY-MM-DD from frontend
    const nightsBlocked = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

    console.log('[DEBUG API BlockDates] Input:', { startDate, endDate })
    console.log('[DEBUG API BlockDates] Saving to DB:', {
      propertyId,
      startDate: startDateStr,
      endDate: endDateStr,
      nights: nightsBlocked,
      reason,
    })

    // Get property's organization_id to satisfy RLS policy
    const { data: propertyData, error: propError } = await supabase
      .from('properties')
      .select('organization_id')
      .eq('id', propertyId)
      .single()

    if (propError || !propertyData?.organization_id) {
      console.error('❌ Property lookup error:', propError)
      return NextResponse.json(
        { success: false, error: 'Property not found or has no organization' },
        { status: 404 }
      )
    }

    // Insert block record using start_date/end_date (schema supports date ranges)
    const { data, error } = await supabase
      .from('calendar_blocks')
      .insert({
        property_id: propertyId,
        organization_id: propertyData.organization_id,
        start_date: startDateStr,
        end_date: endDateStr,
        notes: reason,
        block_type: 'manual',
      })
      .select()

    if (error) {
      console.error('❌ Block dates error:', error)
      return NextResponse.json(
        { success: false, error: `Database error: ${error.message}` },
        { status: 500 }
      )
    }

    console.log('✅ Date range blocked successfully:', { blocked: data?.[0]?.id, nights: nightsBlocked })

    return NextResponse.json({
      success: true,
      data: {
        blocked_nights: nightsBlocked,
        start_date: startDateStr,
        end_date: endDateStr,
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
