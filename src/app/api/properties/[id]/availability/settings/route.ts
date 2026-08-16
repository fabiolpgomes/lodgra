import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface AvailabilitySettings {
  minNights: number
  maxNights: number
  advanceNoticeDays: number
  allowLastMinuteBookings: boolean
  availabilityWindowMonths: number
  allowBookingsBeyondWindow: boolean
}

/**
 * GET /api/properties/[id]/availability/settings
 *
 * Fetch availability configuration for a property.
 * Only property owner can access.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: propertyId } = await params
    const supabase = await createClient()

    // Verify ownership
    const { data: property, error: propError } = await supabase
      .from('properties')
      .select('id, owner_id, owners(id, user_id)')
      .eq('id', propertyId)
      .single()

    if (propError || !property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      )
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()
    const owners = Array.isArray(property.owners) ? property.owners[0] : property.owners
    if (!user || owners?.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Fetch availability settings
    const { data: availability, error } = await supabase
      .from('property_availability')
      .select(
        `
        id,
        min_nights,
        max_nights,
        advance_notice_days,
        allow_last_minute_bookings,
        availability_window_months,
        allow_bookings_beyond_window
      `
      )
      .eq('property_id', propertyId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No record exists, return defaults
        return NextResponse.json({
          minNights: 1,
          maxNights: 365,
          advanceNoticeDays: 0,
          allowLastMinuteBookings: false,
          availabilityWindowMonths: 12,
          allowBookingsBeyondWindow: false,
        })
      }
      throw error
    }

    return NextResponse.json({
      minNights: availability.min_nights,
      maxNights: availability.max_nights,
      advanceNoticeDays: availability.advance_notice_days,
      allowLastMinuteBookings: availability.allow_last_minute_bookings,
      availabilityWindowMonths: availability.availability_window_months,
      allowBookingsBeyondWindow: availability.allow_bookings_beyond_window,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[GET /api/properties/[id]/availability/settings]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * POST /api/properties/[id]/availability/settings
 *
 * Epic 43: Update availability configuration for a property.
 * Creates or updates the property_availability record.
 *
 * Request body:
 * {
 *   minNights: number (1-365)
 *   maxNights: number (1-365)
 *   advanceNoticeDays: number (0, 1, 2, 7)
 *   allowLastMinuteBookings: boolean
 *   availabilityWindowMonths: number (3, 6, 9, 12, 24)
 *   allowBookingsBeyondWindow: boolean
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: propertyId } = await params
    const supabase = await createClient()
    const body: Partial<AvailabilitySettings> = await request.json()

    // Verify ownership
    const { data: property, error: propError } = await supabase
      .from('properties')
      .select('id, owner_id, owners(id, user_id)')
      .eq('id', propertyId)
      .single()

    if (propError || !property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      )
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()
    const owners = Array.isArray(property.owners) ? property.owners[0] : property.owners
    if (!user || owners?.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Validate inputs
    if (
      body.minNights !== undefined &&
      (body.minNights < 1 || body.minNights > 365)
    ) {
      return NextResponse.json(
        { error: 'minNights must be between 1 and 365' },
        { status: 400 }
      )
    }

    if (
      body.maxNights !== undefined &&
      (body.maxNights < 1 || body.maxNights > 365)
    ) {
      return NextResponse.json(
        { error: 'maxNights must be between 1 and 365' },
        { status: 400 }
      )
    }

    if (body.minNights && body.maxNights && body.minNights > body.maxNights) {
      return NextResponse.json(
        { error: 'minNights must be <= maxNights' },
        { status: 400 }
      )
    }

    if (
      body.advanceNoticeDays !== undefined &&
      ![0, 1, 2, 7].includes(body.advanceNoticeDays)
    ) {
      return NextResponse.json(
        { error: 'advanceNoticeDays must be 0, 1, 2, or 7' },
        { status: 400 }
      )
    }

    if (
      body.availabilityWindowMonths !== undefined &&
      ![3, 6, 9, 12, 24].includes(body.availabilityWindowMonths)
    ) {
      return NextResponse.json(
        { error: 'availabilityWindowMonths must be 3, 6, 9, 12, or 24' },
        { status: 400 }
      )
    }

    // Upsert availability settings
    const { data: availability, error: upsertError } = await supabase
      .from('property_availability')
      .upsert(
        {
          property_id: propertyId,
          min_nights: body.minNights ?? 1,
          max_nights: body.maxNights ?? 365,
          advance_notice_days: body.advanceNoticeDays ?? 0,
          allow_last_minute_bookings: body.allowLastMinuteBookings ?? false,
          availability_window_months: body.availabilityWindowMonths ?? 12,
          allow_bookings_beyond_window: body.allowBookingsBeyondWindow ?? false,
        },
        { onConflict: 'property_id' }
      )
      .select()
      .single()

    if (upsertError) {
      throw upsertError
    }

    return NextResponse.json(
      {
        minNights: availability.min_nights,
        maxNights: availability.max_nights,
        advanceNoticeDays: availability.advance_notice_days,
        allowLastMinuteBookings: availability.allow_last_minute_bookings,
        availabilityWindowMonths: availability.availability_window_months,
        allowBookingsBeyondWindow: availability.allow_bookings_beyond_window,
      },
      { status: 200 }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[POST /api/properties/[id]/availability/settings]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
