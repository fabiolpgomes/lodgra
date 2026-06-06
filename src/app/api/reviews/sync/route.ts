/**
 * API Route: /api/reviews/sync
 * Syncs reviews from OTAs (Booking, Airbnb, Google)
 * Can be triggered manually or via Vercel Cron
 *
 * NOTE: Temporarily disabled pending dependency installation
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'

// Disabled imports due to missing dependencies (booking-client, airbnb-client, google-client, review-aggregator)
// import { createAdminClient } from '@/lib/supabase/admin'
// import { BookingClient } from '@/lib/reviews/booking-client'
// import { AirbnbClient } from '@/lib/reviews/airbnb-client'
// import { GoogleClient } from '@/lib/reviews/google-client'
// import { ReviewAggregator } from '@/lib/reviews/review-aggregator'

export async function POST(request: NextRequest) {
  try {
    // Temporarily disabled pending dependency installation
    return NextResponse.json(
      {
        success: false,
        error: 'Reviews sync API is temporarily disabled. Dependencies pending installation.',
        status: 'pending',
      },
      { status: 503 }
    )

    /* Disabled code below pending dependencies
    // Verify authorization (Vercel Cron has x-vercel-cron header)
    const isCron = request.headers.get('x-vercel-cron') === 'true'
    const isAuthorized = isCron || request.headers.get('authorization') === `Bearer ${process.env.REVIEWS_SYNC_SECRET}`

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()
    */

    /* Disabled code below pending dependencies
    // Get all active properties with OTA integrations
    const { data: properties, error: fetchError } = await supabase
      .from('properties')
      .select('id, slug, booking_id, airbnb_id, google_gmb_id')
      .eq('is_active', true)
      .or('booking_id.not.is.null,airbnb_id.not.is.null,google_gmb_id.not.is.null')
      .limit(100) // Sync 100 properties per call

    if (fetchError) {
      throw new Error(`Failed to fetch properties: ${fetchError.message}`)
    }

    let syncedCount = 0
    let errorCount = 0
    const errors: Array<{ propertyId: string; error: string }> = []

    // Sync reviews for each property
    for (const property of properties || []) {
      try {
        const bookingReviews = property.booking_id ? await fetchBookingReviews(property.booking_id) : []
        const airbnbReviews = property.airbnb_id ? await fetchAirbnbReviews(property.airbnb_id) : []
        const googleReviews = property.google_gmb_id ? await fetchGoogleReviews(property.google_gmb_id) : []

        // Aggregate and deduplicate
        const { reviews } = ReviewAggregator.aggregateReviews(bookingReviews, airbnbReviews, googleReviews)

        // Save to database
        if (reviews.length > 0) {
          const { error: insertError } = await supabase.from('property_reviews').upsert(
            reviews.map((r) => ({
              property_id: property.id,
              reviewer_name: r.reviewer_name,
              rating: r.rating,
              comment: r.comment,
              source: r.source,
              review_date: r.review_date,
              last_synced: new Date().toISOString(),
            })),
            { onConflict: 'property_id,source,review_date,reviewer_name' }
          )

          if (insertError) {
            throw new Error(`Failed to insert reviews: ${insertError.message}`)
          }
        }

        syncedCount++
      } catch (error) {
        errorCount++
        errors.push({
          propertyId: property.id,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    // Log results
    console.log(`[Reviews Sync] Completed. Synced: ${syncedCount}, Errors: ${errorCount}`)

    return NextResponse.json(
      {
        success: true,
        synced: syncedCount,
        errors: errorCount,
        details: errors,
      },
      { status: 200 }
    )
    */
  } catch (error) {
    console.error('[Reviews Sync] Fatal error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

/**
 * Private helpers (simplified for MVP)
 */
async function fetchBookingReviews(bookingId: string): Promise<Array<any>> {
  if (!process.env.BOOKING_HOTEL_ID || !process.env.BOOKING_API_KEY) {
    console.warn('Booking.com credentials not configured')
    return []
  }
  const client = new BookingClient(process.env.BOOKING_HOTEL_ID, process.env.BOOKING_API_KEY)
  return await client.fetchReviews(bookingId, 50)
}

async function fetchAirbnbReviews(airbnbId: string): Promise<Array<any>> {
  if (!process.env.AIRBNB_ACCESS_TOKEN) {
    console.warn('Airbnb credentials not configured')
    return []
  }
  const client = new AirbnbClient(process.env.AIRBNB_ACCESS_TOKEN)
  return await client.fetchReviews(airbnbId, 50)
}

async function fetchGoogleReviews(googleGmbId: string): Promise<Array<any>> {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_PATH) {
    console.warn('Google My Business credentials not configured')
    return []
  }
  const client = new GoogleClient(process.env.GOOGLE_SERVICE_ACCOUNT_PATH)
  // Parse GMB ID (format: accountId|locationId)
  const [accountId, locationId] = googleGmbId.split('|')
  return await client.fetchReviews(accountId, locationId, 50)
}
