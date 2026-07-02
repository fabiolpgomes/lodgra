import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cancelReservationInBeds24 } from '@/lib/reservations/syncToBeds24'
import { requireRole } from '@/lib/auth/requireRole'

/**
 * POST /api/admin/sync-cancellations
 *
 * Force sync of cancelled reservations to external platforms.
 * Attempts to cancel reservations in Beds24 that have beds24_booking_id set.
 * Useful for recovering from sync failures or catching up after schema changes.
 *
 * Query params:
 * - days_back: number (default: 7) - Sync cancellations from the last N days
 * - limit: number (default: 100) - Max reservations to sync in one request
 *
 * Returns: List of sync results with success/error status
 */
export async function POST(request: NextRequest) {
  const auth = await requireRole(['admin'])
  if (!auth.authorized) return auth.response!

  try {
    const searchParams = request.nextUrl.searchParams
    const daysBack = parseInt(searchParams.get('days_back') || '7', 10)
    const limit = parseInt(searchParams.get('limit') || '100', 10)

    if (daysBack < 0 || daysBack > 90) {
      return NextResponse.json(
        { error: 'days_back must be between 0 and 90' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // Find cancelled reservations with beds24_booking_id that need syncing
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysBack)

    console.log(`[Sync Cancellations] Finding cancelled reservations from last ${daysBack} days (since ${cutoffDate.toISOString()})`)

    const { data: cancelledReservations, error: fetchError } = await adminClient
      .from('reservations')
      .select('id, external_id, status, beds24_booking_id, cancelled_at, check_in, check_out, property_listing_id')
      .eq('status', 'cancelled')
      .gte('cancelled_at', cutoffDate.toISOString())
      .not('beds24_booking_id', 'is', null)
      .limit(limit)
      .order('cancelled_at', { ascending: false })

    if (fetchError) {
      console.error('[Sync Cancellations] Database error:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch cancelled reservations' },
        { status: 500 }
      )
    }

    if (!cancelledReservations || cancelledReservations.length === 0) {
      return NextResponse.json({
        success: true,
        message: `No cancelled reservations found in last ${daysBack} days with beds24_booking_id`,
        synced: [],
        failed: [],
      })
    }

    console.log(`[Sync Cancellations] Found ${cancelledReservations.length} cancelled reservations to sync`)

    // Attempt to sync each cancellation
    const results = {
      synced: [] as typeof cancelledReservations,
      failed: [] as Array<(typeof cancelledReservations)[0] & { error: string }>,
    }

    for (const reservation of cancelledReservations) {
      try {
        console.log(`[Sync Cancellations] Syncing cancellation for reservation ${reservation.id} (beds24: ${reservation.beds24_booking_id})`)

        const beds24Result = await cancelReservationInBeds24(reservation.beds24_booking_id!)

        if (beds24Result.success) {
          results.synced.push(reservation)
          console.log(`[Sync Cancellations] ✓ Synced ${reservation.id}`)
        } else {
          results.failed.push({
            ...reservation,
            error: beds24Result.error || 'Unknown error',
          })
          console.warn(`[Sync Cancellations] ✗ Failed to sync ${reservation.id}: ${beds24Result.error}`)
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        results.failed.push({
          ...reservation,
          error: errorMsg,
        })
        console.error(`[Sync Cancellations] Exception syncing ${reservation.id}:`, error)
      }
    }

    // Log summary
    console.log(`[Sync Cancellations] Summary: ${results.synced.length} synced, ${results.failed.length} failed`)

    return NextResponse.json({
      success: true,
      summary: {
        total: cancelledReservations.length,
        synced: results.synced.length,
        failed: results.failed.length,
        daysBack,
      },
      synced: results.synced.map(r => ({
        id: r.id,
        external_id: r.external_id,
        beds24_booking_id: r.beds24_booking_id,
        cancelled_at: r.cancelled_at,
        check_in: r.check_in,
        check_out: r.check_out,
      })),
      failed: results.failed.map(r => ({
        id: r.id,
        external_id: r.external_id,
        beds24_booking_id: r.beds24_booking_id,
        error: r.error,
        cancelled_at: r.cancelled_at,
        check_in: r.check_in,
        check_out: r.check_out,
      })),
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('[Sync Cancellations] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: errorMsg },
      { status: 500 }
    )
  }
}
