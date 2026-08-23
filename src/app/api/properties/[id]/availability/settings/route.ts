import { NextRequest, NextResponse } from 'next/server'
import { authorizePropertyManagement } from '@/lib/auth/authorizePropertyManagement'

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
 * Only authorized property managers can access.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: propertyId } = await params
    const access = await authorizePropertyManagement(propertyId, [
      'admin',
      'gestor',
      'manager',
      'owner',
      'viewer',
    ])
    if (!access.authorized) return access.response!
    const { admin } = access

    const { data: availability, error } = await admin
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
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: propertyId } = await params
    const access = await authorizePropertyManagement(propertyId, [
      'admin',
      'gestor',
      'manager',
      'owner',
    ])
    if (!access.authorized) return access.response!
    const { admin } = access

    const body: Partial<AvailabilitySettings> = await request.json()

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

    const { data: availability, error: upsertError } = await admin
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
