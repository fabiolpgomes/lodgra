/**
 * API Endpoint: Property Reservations
 * GET /api/properties/[id]/reservations — Fetch reservations for a property
 * Story 37.1: Calendar with pricing
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: propertyId } = await params

  try {
    const supabase = await createClient()
    console.log('[GET /reservations] START - propertyId:', propertyId)

    // Get current user from session cookie
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    console.log('[GET /reservations] Auth check:', { userId: user?.id, userError: userError?.message })

    if (userError || !user) {
      console.log('[GET /reservations] Auth failed')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify ownership via owners table JOIN
    console.log('[GET /reservations] Fetching property with owners...')
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id, owner_id, owners(id, user_id)')
      .eq('id', propertyId)
      .single()

    console.log('[GET /reservations] Property result (RAW):', {
      property: JSON.stringify(property),
      propertyError: {
        message: propertyError?.message,
        code: propertyError?.code,
        details: propertyError?.details
      }
    })
    console.log('[GET /reservations] Property result (PARSED):', {
      found: !!property,
      owner_id: property?.owner_id,
      owners: property?.owners,
      ownersType: typeof property?.owners
    })

    if (propertyError || !property) {
      console.log('[GET /reservations] Property not found or error')
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      )
    }

    // Verify user owns property by checking owners.user_id
    const owners = Array.isArray(property.owners) ? property.owners[0] : property.owners
    console.log('[GET /reservations] Ownership check:', {
      ownerUserId: owners?.user_id,
      userId: user.id,
      match: owners?.user_id === user.id
    })

    if (owners?.user_id !== user.id) {
      console.log('[GET /reservations] Ownership check FAILED')
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Fetch reservations via property_listings (correct column name)
    console.log('[GET /reservations] Fetching reservations...')
    const { data: reservations, error: reservationsError } = await supabase
      .from('reservations')
      .select('*')
      .in('property_listing_id',
        (await supabase
          .from('property_listings')
          .select('id')
          .eq('property_id', propertyId))
        .data?.map(p => p.id) || []
      )
      .order('start_date', { ascending: true })

    console.log('[GET /reservations] Reservations result:', {
      count: reservations?.length,
      error: {
        message: reservationsError?.message,
        code: reservationsError?.code,
        details: reservationsError?.details,
        hint: reservationsError?.hint
      }
    })

    if (reservationsError) {
      console.error('[GET /reservations] Reservations fetch error (FULL):', JSON.stringify({
        message: reservationsError.message,
        code: reservationsError.code,
        details: reservationsError.details,
        hint: reservationsError.hint
      }))
      return NextResponse.json(
        {
          error: 'Failed to fetch reservations',
          message: reservationsError.message,
          code: reservationsError.code,
          details: reservationsError.details
        },
        { status: 500 }
      )
    }

    console.log('[GET /reservations] SUCCESS')
    return NextResponse.json({
      success: true,
      data: reservations || [],
    })
  } catch (error) {
    console.error('[GET /reservations] EXCEPTION:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
