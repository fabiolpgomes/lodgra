import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    console.log('[sync-logs] Request received')
    const limit = request.nextUrl.searchParams.get('limit') || '50'
    console.log('[sync-logs] Limit:', limit)

    // Dynamic import to avoid circular dependencies
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = await createAdminClient()

    console.log('[sync-logs] Fetching logs...')
    const { data: logs, error } = await supabase
      .from('sync_logs')
      .select('*')
      .order('synced_at', { ascending: false })
      .limit(parseInt(limit))

    if (error) {
      console.error('[sync-logs] Supabase error:', error)
      return NextResponse.json(
        {
          error: true,
          message: `Erro ao buscar logs: ${error.message}`,
          data: [],
        },
        { status: 200 }
      )
    }

    // Enrich with property names
    let enrichedLogs = (logs || []).map((log: any) => ({
      ...log,
      property_name: null,
    }))

    // Get unique property_listing_ids
    const propertyListingIds = [...new Set(
      enrichedLogs
        .map((log: any) => log.property_listing_id)
        .filter((id: string | null) => id !== null)
    )]

    console.log('[sync-logs] Found', propertyListingIds.length, 'unique property listings')

    // Fetch property listings with their property names
    if (propertyListingIds.length > 0) {
      const { data: listings, error: listingsError } = await supabase
        .from('property_listings')
        .select(`
          id,
          properties!inner(name)
        `)
        .in('id', propertyListingIds)

      if (!listingsError && listings) {
        console.log('[sync-logs] Fetched', listings.length, 'property listings')

        const listingNameMap = new Map()
        listings.forEach((listing: any) => {
          const propName = Array.isArray(listing.properties)
            ? listing.properties[0]?.name
            : listing.properties?.name

          if (propName) {
            listingNameMap.set(listing.id, propName)
            console.log(`[sync-logs] Mapped ${listing.id} -> ${propName}`)
          }
        })

        enrichedLogs = enrichedLogs.map((log: any) => ({
          ...log,
          property_name: listingNameMap.get(log.property_listing_id) || null,
        }))
      } else if (listingsError) {
        console.error('[sync-logs] Error fetching property listings:', listingsError)
      }
    }

    console.log('[sync-logs] Returned', enrichedLogs.length, 'logs with property names')
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
