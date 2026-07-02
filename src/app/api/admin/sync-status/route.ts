import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/requireRole'

/**
 * GET /api/admin/sync-status
 *
 * Diagnostic endpoint showing sync status of reservations.
 * Shows cancelled reservations and their sync status with Beds24.
 *
 * Query params:
 * - days_back: number (default: 30) - Show data from last N days
 * - property_id: string (optional) - Filter by property
 */
export async function GET(request: NextRequest) {
  const auth = await requireRole(['admin'])
  if (!auth.authorized) return auth.response!

  try {
    const searchParams = request.nextUrl.searchParams
    const daysBack = parseInt(searchParams.get('days_back') || '30', 10)
    const propertyId = searchParams.get('property_id')

    const adminClient = createAdminClient()
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysBack)

    console.log(`[Sync Status] Checking sync status for last ${daysBack} days`)

    // 1. Get cancelled reservations
    let cancelledQuery = adminClient
      .from('reservations')
      .select(`
        id,
        external_id,
        status,
        beds24_booking_id,
        source,
        cancelled_at,
        check_in,
        check_out,
        property_listing_id,
        property_listings(
          id,
          property_id,
          properties(name)
        )
      `)
      .eq('status', 'cancelled')
      .gte('cancelled_at', cutoffDate.toISOString())
      .order('cancelled_at', { ascending: false })

    if (propertyId) {
      cancelledQuery = cancelledQuery.eq('property_listings.property_id', propertyId)
    }

    const { data: cancelled, error: cancelledError } = await cancelledQuery

    if (cancelledError) {
      console.error('[Sync Status] Error fetching cancelled reservations:', cancelledError)
      return NextResponse.json(
        { error: 'Failed to fetch cancelled reservations' },
        { status: 500 }
      )
    }

    // 2. Analyze sync status
    const stats = {
      total_cancelled: cancelled?.length || 0,
      with_beds24_id: 0,
      without_beds24_id: 0,
      by_source: {} as Record<string, number>,
      by_status: {} as Record<string, number>,
    }

    const reservations = {
      synced_to_beds24: [] as typeof cancelled,
      pending_beds24_sync: [] as typeof cancelled,
    }

    cancelled?.forEach(r => {
      if (r.beds24_booking_id) {
        stats.with_beds24_id++
        reservations.synced_to_beds24.push(r)
      } else {
        stats.without_beds24_id++
        reservations.pending_beds24_sync.push(r)
      }

      const source = r.source || 'unknown'
      stats.by_source[source] = (stats.by_source[source] || 0) + 1
    })

    // 3. Get sync logs for cancelled reservations
    const cancelledIds = cancelled?.map(r => r.id) || []
    let syncLogsQuery = adminClient
      .from('sync_logs')
      .select('id, reservation_id, sync_type, direction, status, message, created_at')
      .in('reservation_id', cancelledIds)

    if (propertyId) {
      syncLogsQuery = syncLogsQuery.eq('property_listing_id', propertyId)
    }

    const { data: syncLogs } = await syncLogsQuery

    const syncStatus = {
      total_logs: syncLogs?.length || 0,
      by_type: {} as Record<string, number>,
      by_direction: {} as Record<string, number>,
      by_status: {} as Record<string, number>,
    }

    syncLogs?.forEach(log => {
      syncStatus.by_type[log.sync_type] = (syncStatus.by_type[log.sync_type] || 0) + 1
      syncStatus.by_direction[log.direction] = (syncStatus.by_direction[log.direction] || 0) + 1
      syncStatus.by_status[log.status] = (syncStatus.by_status[log.status] || 0) + 1
    })

    // 4. Recent cancelled reservations sample
    const sample = cancelled?.slice(0, 10).map(r => ({
      id: r.id,
      external_id: r.external_id,
      source: r.source,
      beds24_booking_id: r.beds24_booking_id,
      cancelled_at: r.cancelled_at,
      check_in: r.check_in,
      check_out: r.check_out,
      property_name: (r.property_listings as { properties?: { name?: string } | null } | null)?.properties?.name,
    })) || []

    return NextResponse.json({
      success: true,
      diagnostic: {
        query_period_days: daysBack,
        cutoff_date: cutoffDate.toISOString(),
        filter_property_id: propertyId || null,
      },
      cancelled_reservations: stats,
      sync_logs: syncStatus,
      recent_samples: sample,
      recommendations: generateRecommendations(stats, syncStatus),
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('[Sync Status] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: errorMsg },
      { status: 500 }
    )
  }
}

interface StatsType {
  total_cancelled: number
  with_beds24_id: number
  without_beds24_id: number
  by_source: Record<string, number>
  by_status: Record<string, number>
}

interface SyncStatusType {
  total_logs: number
  by_type: Record<string, number>
  by_direction: Record<string, number>
  by_status: Record<string, number>
}

function generateRecommendations(
  stats: StatsType,
  syncStatus: SyncStatusType
): string[] {
  const recommendations: string[] = []

  if (stats.without_beds24_id > 0) {
    recommendations.push(
      `⚠️ ${stats.without_beds24_id} reservations cancelled without beds24_booking_id. ` +
      `These were likely direct bookings, not synced from Beds24.`
    )
  }

  if (stats.with_beds24_id > 0) {
    recommendations.push(
      `🔴 CRITICAL: ${stats.with_beds24_id} reservations have beds24_booking_id but may not be cancelled in Beds24. ` +
      `Run POST /api/admin/sync-cancellations to sync.`
    )
  }

  if (syncStatus.by_status?.pending > 0) {
    recommendations.push(
      `📋 ${syncStatus.by_status.pending} pending sync logs found. ` +
      `These need to be processed.`
    )
  }

  if (stats.total_cancelled === 0) {
    recommendations.push('✅ No cancelled reservations found in this period.')
  }

  return recommendations
}
