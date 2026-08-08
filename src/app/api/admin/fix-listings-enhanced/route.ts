import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

interface ListingRepairResult {
  id: string
  property_id: string
  property_name: string
  platform: string
  ical_url: string | null
  sync_enabled: boolean
  last_sync_error: string | null
  status: 'repaired' | 'error'
  reason?: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createAdminClient()
    const results: ListingRepairResult[] = []

    console.log('[fix-listings-enhanced] Starting repair process...')

    // Fetch all listings with NULL name or NULL platform
    const { data: listings, error: listingsError } = await supabase
      .from('property_listings')
      .select('id, name, platform, ical_url, property_id, sync_enabled')
      .or('name.is.null,platform.is.null')

    if (listingsError || !listings?.length) {
      console.log('[fix-listings-enhanced] No listings to repair')
      return NextResponse.json({
        message: 'No listings to repair',
        results: [],
        summary: { repaired: 0, errors: 0, total: 0 }
      })
    }

    console.log(`[fix-listings-enhanced] Found ${listings.length} listings to repair`)

    let repairedCount = 0
    let errorCount = 0

    for (const listing of listings) {
      try {
        // Fetch property name
        const { data: property } = await supabase
          .from('properties')
          .select('name')
          .eq('id', listing.property_id)
          .single()

        const propertyName = property?.name || `Listing ${listing.id}`
        let platform = listing.platform || 'Airbnb'
        let syncEnabled = true
        let lastError = null

        // If iCal URL exists, validate it with HEAD request
        if (listing.ical_url) {
          try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 5000) // 5s timeout

            const urlResponse = await fetch(listing.ical_url, {
              method: 'HEAD',
              signal: controller.signal
            })

            clearTimeout(timeoutId)

            if (!urlResponse.ok && urlResponse.status !== 404) {
              // URL is broken
              syncEnabled = false
              lastError = `HTTP ${urlResponse.status} validating URL`
              console.warn(`[fix-listings-enhanced] ${listing.id}: URL validation failed - ${lastError}`)
            }

            // Infer platform from URL domain if not set
            if (!listing.platform && listing.ical_url) {
              if (listing.ical_url.includes('airbnb')) {
                platform = 'Airbnb'
              } else if (listing.ical_url.includes('booking')) {
                platform = 'Booking'
              } else if (listing.ical_url.includes('flatio')) {
                platform = 'Flatio'
              } else {
                platform = 'Custom'
              }
            }
          } catch (err) {
            // Network timeout or error
            syncEnabled = false
            const errorMsg = err instanceof Error ? err.message : 'Unknown error'
            lastError = errorMsg.includes('abort')
              ? 'Timeout validating URL (>5s)'
              : `Error validating URL: ${errorMsg}`
            console.warn(`[fix-listings-enhanced] ${listing.id}: URL validation error - ${lastError}`)
          }
        } else {
          // No iCal URL
          syncEnabled = false
          lastError = 'URL missing'
          console.log(`[fix-listings-enhanced] ${listing.id}: No iCal URL configured`)
        }

        // Update listing
        const { error: updateError } = await supabase
          .from('property_listings')
          .update({
            name: listing.name || propertyName,
            platform,
            sync_enabled: syncEnabled,
            last_sync_error: lastError,
            sync_error_count: lastError ? 1 : 0
          })
          .eq('id', listing.id)

        if (updateError) {
          throw updateError
        }

        results.push({
          id: listing.id,
          property_id: listing.property_id,
          property_name: propertyName,
          platform,
          ical_url: listing.ical_url,
          sync_enabled: syncEnabled,
          last_sync_error: lastError,
          status: 'repaired',
          reason: lastError || 'Success'
        })

        repairedCount++
        console.log(`[fix-listings-enhanced] ✅ ${listing.id}: ${propertyName} (${platform})`)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        console.error(`[fix-listings-enhanced] ❌ ${listing.id}:`, err)

        results.push({
          id: listing.id,
          property_id: listing.property_id,
          property_name: listing.name || `Listing ${listing.id}`,
          platform: listing.platform || 'Unknown',
          ical_url: listing.ical_url,
          sync_enabled: false,
          last_sync_error: `Repair error: ${errorMessage}`,
          status: 'error',
          reason: errorMessage
        })

        errorCount++
      }
    }

    console.log(`[fix-listings-enhanced] Repair complete: ${repairedCount} repaired, ${errorCount} errors`)

    return NextResponse.json({
      message: 'Repair process completed',
      results,
      summary: {
        total: listings.length,
        repaired: repairedCount,
        errors: errorCount
      }
    })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error('[fix-listings-enhanced] Fatal error:', err)
    return NextResponse.json(
      { error: errorMessage, results: [] },
      { status: 500 }
    )
  }
}
