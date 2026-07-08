import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

interface AuditResult {
  suspiciousReservations: Array<{
    id: string
    external_id: string | null
    checkInOut: string
    guestName: string
    bookingSource: string
    notes: string
  }>
  suspiciousBlocks: Array<{
    id: string
    external_uid: string | null
    dateRange: string
    notes: string
    blockType: string
  }>
  summary: {
    totalSuspiciousReservations: number
    totalSuspiciousBlocks: number
    recommendations: string[]
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const adminSecret = process.env.ADMIN_SECRET
    if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()

    // ─── AUDIT RESERVATIONS ───────────────────────────────────────────────
    // Look for reservations that might actually be blocks

    const { data: suspiciousReservations } = await supabase.rpc('get_suspicious_ical_reservations')

    // Fallback query if RPC doesn't exist
    type ReservationRow = {
      id: string
      external_id: string | null
      check_in: string
      check_out: string
      booking_source: string
      guests: { first_name: string; last_name: string } | null
    }

    let reservations: ReservationRow[] = []

    if (suspiciousReservations) {
      reservations = suspiciousReservations
    } else {
      const { data: rawData } = await supabase
        .from('reservations')
        .select('id, external_id, check_in, check_out, booking_source, guests(first_name, last_name)')
        .eq('booking_source', 'ical_auto_sync')
        .not('external_id', 'is', null)
        .limit(100)

      reservations = (rawData || []).map((r: any) => ({
        id: r.id,
        external_id: r.external_id,
        check_in: r.check_in,
        check_out: r.check_out,
        booking_source: r.booking_source,
        guests: Array.isArray(r.guests) ? r.guests[0] : r.guests,
      }))
    }

    // Filter for suspicious patterns
    const suspiciousReservationsList = reservations
      .filter(r => {
        // Booking.com without structured guest data
        if (r.external_id?.includes('@booking.com')) {
          const hasGuestName =
            r.guests?.first_name &&
            r.guests.first_name !== 'Hóspede' &&
            !r.guests.first_name.match(/^imported-/)
          return !hasGuestName
        }

        // Airbnb with generic description
        if (r.external_id?.includes('@airbnb.com')) {
          const hasGuestName =
            r.guests?.first_name &&
            r.guests.first_name !== 'Hóspede' &&
            !r.guests.first_name.match(/^imported-/)
          return !hasGuestName
        }

        return false
      })
      .map(r => ({
        id: r.id,
        external_id: r.external_id,
        checkInOut: `${r.check_in} → ${r.check_out}`,
        guestName: `${r.guests?.first_name || 'N/A'} ${r.guests?.last_name || ''}`.trim(),
        bookingSource: r.booking_source,
        notes: 'Default guest name suggests block misclassified as reservation',
      }))

    // ─── AUDIT BLOCKS ─────────────────────────────────────────────────────
    // Look for blocks that might actually be reservations

    const { data: blocks } = await supabase
      .from('calendar_blocks')
      .select('id, external_uid, start_date, end_date, notes, block_type')
      .eq('block_type', 'platform_sync')
      .not('external_uid', 'is', null)
      .limit(100)

    const suspiciousBlocksList = (blocks || [])
      .filter(b => {
        // Booking.com with structured data pattern in notes = might be reservation
        if (b.external_uid?.includes('@booking.com')) {
          return /BOOKING\s*ID|PHONE|COUNTRY|GUESTS/i.test(b.notes || '')
        }

        // Airbnb "Reserved" in notes = might be reservation
        if (b.external_uid?.includes('@airbnb.com')) {
          return b.notes?.toLowerCase().includes('reserved')
        }

        return false
      })
      .map(b => ({
        id: b.id,
        external_uid: b.external_uid,
        dateRange: `${b.start_date} → ${b.end_date}`,
        notes: b.notes || 'No notes',
        blockType: b.block_type,
      }))

    // ─── GENERATE RECOMMENDATIONS ─────────────────────────────────────────

    const recommendations: string[] = []

    if (suspiciousReservationsList.length > 0) {
      recommendations.push(
        `⚠️ Found ${suspiciousReservationsList.length} reservations with default guest names (might be misclassified blocks)`
      )
    }

    if (suspiciousBlocksList.length > 0) {
      recommendations.push(
        `⚠️ Found ${suspiciousBlocksList.length} blocks with structured data in notes (might be misclassified reservations)`
      )
    }

    if (suspiciousReservationsList.length === 0 && suspiciousBlocksList.length === 0) {
      recommendations.push('✅ No suspicious patterns detected in recent iCal sync data')
    }

    recommendations.push('📋 Review flagged items and check original iCal feeds for verification')
    recommendations.push('🔄 Re-run sync-ical cron with fixed isBlockedEvent() logic after review')

    const result: AuditResult = {
      suspiciousReservations: suspiciousReservationsList,
      suspiciousBlocks: suspiciousBlocksList,
      summary: {
        totalSuspiciousReservations: suspiciousReservationsList.length,
        totalSuspiciousBlocks: suspiciousBlocksList.length,
        recommendations,
      },
    }

    console.log('[Audit] iCal data audit complete', {
      suspiciousReservations: result.summary.totalSuspiciousReservations,
      suspiciousBlocks: result.summary.totalSuspiciousBlocks,
    })

    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error('[Audit] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Audit failed' },
      { status: 500 }
    )
  }
}
