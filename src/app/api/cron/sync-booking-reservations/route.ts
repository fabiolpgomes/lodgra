/**
 * Cron Job: Sync Booking.com Reservations
 *
 * Schedule: Every 4 hours
 * Purpose: Pull reservations from Booking.com API and create/update reservations in Lodgra
 *
 * Pulls from all active channel_listings with Booking.com integration
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchBookingReservations } from '@/lib/channels/booking-api-client'
import { processBookingReservation } from '@/lib/channels/booking-reservation-processor'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Check if Booking channel is enabled
    if (process.env.BOOKING_CHANNEL_ENABLED !== 'true') {
      return NextResponse.json(
        { message: 'Booking channel not enabled' },
        { status: 200 }
      )
    }

    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()

    // Get all active Booking.com channel_listings with credentials
    const { data: channelListings, error: listingsError } = await supabase
      .from('channel_listings')
      .select(`
        id,
        channel_id,
        external_id,
        property_listing_id,
        organization_id,
        channels!inner(name)
      `)
      .eq('is_active', true)
      .eq('channels.name', 'booking')

    if (listingsError || !channelListings) {
      console.error('[Cron Booking Reservations] Error fetching listings:', listingsError)
      return NextResponse.json({ error: listingsError?.message }, { status: 500 })
    }

    if (channelListings.length === 0) {
      return NextResponse.json({
        success: true,
        synced: 0,
        created: 0,
        updated: 0,
        errors: 0,
        timestamp: new Date().toISOString(),
      })
    }

    let totalSynced = 0
    let totalCreated = 0
    let totalUpdated = 0
    let totalErrors = 0

    // Process each channel_listing
    for (const listing of channelListings) {
      try {
        const channelId = listing.channel_id
        const externalId = listing.external_id
        const orgId = listing.organization_id

        // Fetch credentials for this channel
        const { data: cred, error: credError } = await supabase
          .from('channel_credentials')
          .select('api_key, external_property_id')
          .eq('organization_id', orgId)
          .eq('channel_id', channelId)
          .eq('external_property_id', externalId)
          .eq('is_active', true)
          .single()

        if (credError || !cred) {
          console.warn(
            `[Cron Booking Reservations] No credentials for listing ${listing.id}`,
            credError?.message
          )
          totalErrors++
          continue
        }

        // Pull last 90 days of reservations
        const dateTo = new Date()
        const dateFrom = new Date()
        dateFrom.setDate(dateFrom.getDate() - 90)

        const toStr = dateTo.toISOString().slice(0, 10)
        const fromStr = dateFrom.toISOString().slice(0, 10)

        const { reservations, error: pullError } = await fetchBookingReservations(
          cred.external_property_id,
          cred.api_key,
          fromStr,
          toStr
        )

        if (pullError) {
          console.error(
            `[Cron Booking Reservations] Pull failed for listing ${listing.id}:`,
            pullError
          )
          totalErrors++
          continue
        }

        console.log(
          `[Cron Booking Reservations] Pulled ${reservations.length} reservations for listing ${listing.id}`
        )

        // Process each reservation
        let listingCreated = 0
        let listingUpdated = 0

        for (const r of reservations) {
          const result = await processBookingReservation(
            supabase,
            orgId,
            listing.id,
            channelId,
            listing.property_listing_id,
            {
              external_id: r.id,
              property_id: r.property_id,
              guest_name: r.guest.name,
              guest_email: r.guest.email,
              check_in: r.check_in,
              check_out: r.check_out,
              number_of_guests: r.number_of_guests,
              status: r.status,
              total_amount: r.total_price.amount,
              currency: r.total_price.currency,
              raw_data: r as unknown as Record<string, unknown>,
            }
          )

          if (result.success) {
            if (result.isDuplicate) {
              listingUpdated++
            } else {
              listingCreated++
            }
          }
        }

        totalCreated += listingCreated
        totalUpdated += listingUpdated
        totalSynced++

        // Update last_synced_at
        const now = new Date().toISOString()
        await supabase
          .from('channel_listings')
          .update({
            last_synced_at: now,
            sync_count: listingCreated + listingUpdated,
            updated_at: now,
          })
          .eq('id', listing.id)

        console.log(
          `[Cron Booking Reservations] Listing ${listing.id}: ${listingCreated} created, ${listingUpdated} updated`
        )
      } catch (err) {
        console.error(`[Cron Booking Reservations] Error processing listing:`, err)
        totalErrors++
      }
    }

    return NextResponse.json({
      success: true,
      synced: totalSynced,
      created: totalCreated,
      updated: totalUpdated,
      errors: totalErrors,
      timestamp: new Date().toISOString(),
    })
  } catch (error: unknown) {
    console.error('[Cron Booking Reservations] Error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
