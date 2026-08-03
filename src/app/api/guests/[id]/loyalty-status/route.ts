/**
 * GET /api/guests/[id]/loyalty-status
 * Retrieve loyalty status for a guest (Story 37.5)
 * Returns: { is_loyal: boolean, average_rating: float, reservation_count: int }
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: guestId } = await params

  try {
    const supabase = await createAdminClient()

    // Fetch guest data
    const { data: guest, error: guestError } = await supabase
      .from('guests')
      .select('average_rating, reservation_count')
      .eq('id', guestId)
      .single()

    if (guestError && guestError.code !== 'PGRST116') {
      console.error('Guest fetch error:', guestError)
      return NextResponse.json(
        { error: 'Failed to fetch guest data' },
        { status: 500 }
      )
    }

    // If guest not found, return empty loyalty status
    if (!guest) {
      return NextResponse.json({
        success: true,
        data: {
          is_loyal: false,
          average_rating: null,
          reservation_count: 0,
          reason: 'Guest not found in system',
        },
      })
    }

    // Determine loyalty status
    const isLoyal =
      (guest.average_rating === null || guest.average_rating >= 4.8) &&
      (guest.reservation_count > 0)

    return NextResponse.json({
      success: true,
      data: {
        is_loyal: isLoyal,
        average_rating: guest.average_rating,
        reservation_count: guest.reservation_count || 0,
      },
    })
  } catch (error) {
    console.error('GET /api/guests/[id]/loyalty-status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
