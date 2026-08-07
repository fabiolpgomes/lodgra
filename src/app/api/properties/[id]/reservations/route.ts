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

    // First, try to get property_listings
    const { data: propertyListings } = await supabase
      .from('property_listings')
      .select('id')
      .eq('property_id', propertyId)

    console.log('[GET /reservations] Property listings:', propertyListings?.length || 0)

    const listingIds = propertyListings?.map(p => p.id) || []

    // If no property_listings, return empty array (no reservations possible)
    if (listingIds.length === 0) {
      console.log('[GET /reservations] No property_listings found, returning empty reservations')
      return NextResponse.json({
        success: true,
        data: [],
      })
    }

    const { data: reservations, error: reservationsError } = await supabase
      .from('reservations')
      .select('*')
      .in('property_listing_id', listingIds)
      .order('check_in', { ascending: true })

    console.log('[GET /reservations] Reservations result:', {
      count: reservations?.length,
      propertyListings: (await supabase
        .from('property_listings')
        .select('id')
        .eq('property_id', propertyId))
      .data?.length,
      error: {
        message: reservationsError?.message,
        code: reservationsError?.code,
        details: reservationsError?.details,
        hint: reservationsError?.hint
      }
    })

    if (reservations && reservations.length > 0) {
      console.log('[GET /reservations] Sample reservations (first 3):',
        JSON.stringify(reservations.slice(0, 3), null, 2)
      )
    }

    if (reservationsError) {
      console.error('[GET /reservations] Reservations fetch error (FULL):', {
        message: reservationsError.message,
        code: reservationsError.code,
        details: reservationsError.details,
        hint: reservationsError.hint,
        listingIds: listingIds
      })
      console.error('[GET /reservations] Full error object:', reservationsError)

      // Return 503 if there's a query issue, but provide data
      return NextResponse.json(
        {
          success: false,
          data: [],
          error: 'Failed to fetch reservations',
          message: reservationsError.message,
          code: reservationsError.code
        },
        { status: 200 }  // Return 200 with empty data instead of 500
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
