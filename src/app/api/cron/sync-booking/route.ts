/**
 * Cron Job: Sync Prices & Availability to Booking.com
 *
 * Schedule: Every 6 hours (or on-demand via webhook)
 * Purpose: Keep Booking.com prices and availability in sync
 *
 * Triggered by:
 * - Cron scheduler (every 6 hours)
 * - Manual trigger via API
 * - Pricing rule updates (real-time sync)
 */

import { NextRequest, NextResponse } from 'next/server'
import { syncAllPropertiesToBooking } from '@/lib/integrations/booking/sync-service'

/**
 * GET /api/cron/sync-booking
 *
 * Sync all properties to Booking.com
 *
 * Query params:
 * - days_ahead: Number of days to sync (default: 30)
 * - limit: Max properties to sync (default: unlimited)
 */
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID()

  try {
    // Verify CRON_SECRET for security
    const cronSecret = request.headers.get('Authorization')
    const expectedSecret = process.env.CRON_SECRET

    if (!expectedSecret || cronSecret !== `Bearer ${expectedSecret}`) {
      console.warn(`[Cron Booking Sync] ${requestId} Unauthorized cron request`)
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const daysAhead = parseInt(searchParams.get('days_ahead') || '30', 10)

    console.info(
      `[Cron Booking Sync] ${requestId} Starting sync (${daysAhead} days ahead)`
    )

    const startTime = Date.now()
    const result = await syncAllPropertiesToBooking(daysAhead)
    const duration = Date.now() - startTime

    console.info(
      `[Cron Booking Sync] ${requestId} Completed: ${result.totalSynced} updates, ${result.successCount} properties successful, ${result.failureCount} failed (${duration}ms)`
    )

    return NextResponse.json(
      {
        success: true,
        request_id: requestId,
        result: {
          totalSynced: result.totalSynced,
          successCount: result.successCount,
          failureCount: result.failureCount,
          durationMs: duration,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(
      `[Cron Booking Sync] ${requestId} Unexpected error: ${errorMsg}`
    )

    return NextResponse.json(
      {
        success: false,
        request_id: requestId,
        error: `Sync failed: ${errorMsg}`,
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/cron/sync-booking
 *
 * Manual trigger to sync a specific property (by admin)
 *
 * Body:
 * {
 *   "property_id": "prop_123",
 *   "start_date": "2026-05-01",
 *   "end_date": "2026-06-01"
 * }
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()

  try {
    // Verify authorization
    const authHeader = request.headers.get('Authorization')
    const expectedSecret = process.env.CRON_SECRET

    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      console.warn(
        `[Cron Booking Sync] ${requestId} Unauthorized manual sync request`
      )
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { property_id, start_date, end_date } = body

    // Validate required fields
    if (!property_id || !start_date || !end_date) {
      return NextResponse.json(
        { error: 'Missing required fields: property_id, start_date, end_date' },
        { status: 400 }
      )
    }

    console.info(
      `[Cron Booking Sync] ${requestId} Manual sync for property: ${property_id}`
    )

    // Import sync function here to avoid circular imports
    const { syncPropertyToBooking } = await import(
      '@/lib/integrations/booking/sync-service'
    )

    const startTime = Date.now()
    const result = await syncPropertyToBooking(property_id, start_date, end_date)
    const duration = Date.now() - startTime

    console.info(
      `[Cron Booking Sync] ${requestId} Manual sync completed (${duration}ms): ${result.success ? 'success' : 'failed'}`
    )

    return NextResponse.json(
      {
        success: result.success,
        request_id: requestId,
        result: {
          pricesSynced: result.pricesSynced,
          availabilitySynced: result.availabilitySynced,
          errors: result.errors,
          durationMs: duration,
        },
      },
      { status: result.success ? 200 : 400 }
    )
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(
      `[Cron Booking Sync] ${requestId} Unexpected error: ${errorMsg}`
    )

    return NextResponse.json(
      {
        success: false,
        request_id: requestId,
        error: `Sync failed: ${errorMsg}`,
      },
      { status: 500 }
    )
  }
}
