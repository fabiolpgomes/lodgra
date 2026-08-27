import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ReservationValidator } from '@/lib/reservations/reservation-validator'

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const { propertyId, checkIn, checkOut, allowMinimumNightsOverride } = body

    // Validate input
    if (!propertyId || !checkIn || !checkOut) {
      return NextResponse.json(
        { error: 'Missing required fields: propertyId, checkIn, checkOut' },
        { status: 400 }
      )
    }

    // Validate dates
    const checkInDate = new Date(checkIn)
    const checkOutDate = new Date(checkOut)

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DD)' },
        { status: 400 }
      )
    }

    if (checkOutDate <= checkInDate) {
      return NextResponse.json(
        { error: 'Check-out must be after check-in' },
        { status: 400 }
      )
    }

    // Run validation
    const result = await ReservationValidator.validate(propertyId, checkIn, checkOut, {
      allowMinimumNightsOverride: allowMinimumNightsOverride === true,
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('[Reservation Validation] Error:', error)
    return NextResponse.json(
      {
        error: 'Validation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
