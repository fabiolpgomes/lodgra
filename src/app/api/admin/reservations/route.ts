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
    const {
      propertyId,
      checkIn,
      checkOut,
      guestName,
      guestEmail,
      guestCount,
      notes,
      finalPrice,
    } = body

    // Validate required fields
    if (!propertyId || !checkIn || !checkOut || !guestName || !guestEmail) {
      return NextResponse.json(
        {
          error: 'Missing required fields: propertyId, checkIn, checkOut, guestName, guestEmail',
        },
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

    // Run overlap validation as safety check
    const validator = ReservationValidator
    const overlapResult = await validator.validateReservationOverlap(
      propertyId,
      checkIn,
      checkOut
    )

    if (overlapResult.hasConflict) {
      const conflictIds = overlapResult.conflictingReservations.map((r) => r.id).join(', ')
      return NextResponse.json(
        { error: `Overlapping reservations found: ${conflictIds}` },
        { status: 400 }
      )
    }

    // Create reservation in database
    const { data: reservation, error: insertError } = await supabase
      .from('reservations')
      .insert([
        {
          property_id: propertyId,
          guest_name: guestName,
          guest_email: guestEmail,
          guest_count: guestCount || 1,
          check_in: checkIn,
          check_out: checkOut,
          final_price: finalPrice || 0,
          notes: notes || null,
          status: 'active',
          created_by: user.id,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single()

    if (insertError) {
      console.error('[Reservation Creation] Database error:', insertError)
      return NextResponse.json(
        { error: `Database error: ${insertError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        reservationId: reservation.id,
        message: `Reserva criada com sucesso para ${guestName}. ID: ${reservation.id}`,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[Reservation Creation] Error:', error)
    return NextResponse.json(
      {
        error: 'Reservation creation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
