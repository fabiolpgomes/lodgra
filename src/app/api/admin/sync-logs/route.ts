import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { getSyncFeedback } from '@/lib/sync/feedback'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const auth = await requireRole(['admin', 'gestor'])
  if (!auth.authorized) return auth.response!

  try {
    const requestedLimit = Number.parseInt(request.nextUrl.searchParams.get('limit') || '50', 10)
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 200) : 50

    // Dynamic import to avoid circular dependencies
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = await createAdminClient()

    const { data: listings, error: listingsError } = await supabase
      .from('property_listings')
      .select(`
        id,
        property_id,
        organization_id,
        properties:properties!property_listings_property_org_fk(name),
        platforms(display_name, name)
      `)
      .eq('organization_id', auth.organizationId)

    if (listingsError) {
      console.error('[sync-logs] Error fetching property listings:', listingsError)
      return NextResponse.json(
        {
          error: true,
          message: `Erro ao identificar os anúncios da organização: ${listingsError.message}`,
          data: [],
        },
        { status: 200 }
      )
    }

    const listingIds = (listings || []).map((listing: any) => listing.id)
    if (listingIds.length === 0) {
      return NextResponse.json({ error: false, data: [] })
    }

    const { data: logs, error } = await supabase
      .from('sync_logs')
      .select('id, property_listing_id, sync_type, direction, status, error_message, records_processed, records_created, records_updated, records_failed, synced_at')
      .in('property_listing_id', listingIds)
      .order('synced_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[sync-logs] Supabase error:', error)
      return NextResponse.json({ error: true, message: `Erro ao buscar logs: ${error.message}`, data: [] }, { status: 200 })
    }

    const listingMap = new Map<string, { propertyId: string; propertyName: string | null; platformName: string | null }>()
    ;(listings || []).forEach((listing: any) => {
      const property = Array.isArray(listing.properties) ? listing.properties[0] : listing.properties
      const platform = Array.isArray(listing.platforms) ? listing.platforms[0] : listing.platforms
      listingMap.set(listing.id, {
        propertyId: listing.property_id,
        propertyName: property?.name || null,
        platformName: platform?.display_name || platform?.name || null,
      })
    })

    const enrichedLogs = (logs || []).flatMap((log: any) => {
      const listing = listingMap.get(log.property_listing_id)
      if (!listing) return []
      return [{
        ...log,
        property_id: listing.propertyId,
        property_name: listing.propertyName,
        platform_name: listing.platformName,
        feedback: getSyncFeedback({
          status: log.status,
          errorMessage: log.error_message,
          recordsCreated: log.records_created,
          recordsUpdated: log.records_updated,
          recordsFailed: log.records_failed,
          platformName: listing.platformName,
        }),
      }]
    })

    return NextResponse.json({
      error: false,
      data: enrichedLogs,
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('[sync-logs] Fatal error:', errorMsg)
    return NextResponse.json(
      {
        error: true,
        message: `Erro fatal: ${errorMsg}`,
        data: [],
      },
      { status: 200 }
    )
  }
}
