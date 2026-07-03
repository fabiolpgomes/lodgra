import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const propertyId = request.nextUrl.searchParams.get('property_id')
  const secret = request.nextUrl.searchParams.get('secret')

  if (!propertyId || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('reservations')
      .select(`
        id,
        check_in,
        check_out,
        source,
        status,
        cancelled_at,
        cancellation_reason,
        property_listing_id,
        property_listings!inner(property_id, properties!inner(name))
      `)
      .eq('property_listings.property_id', propertyId)
      .eq('status', 'cancelled')
      .gte('cancelled_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('cancelled_at', { ascending: false })

    if (error) throw error

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const byReason: Record<string, any[]> = {}
    data?.forEach(r => {
      const reason = r.cancellation_reason || '(sem motivo registrado)'
      if (!byReason[reason]) byReason[reason] = []
      byReason[reason].push(r)
    })

    return NextResponse.json({
      propertyId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      propertyName: (data?.[0]?.property_listings?.[0] as any)?.properties?.[0]?.name,
      totalCancelled: data?.length || 0,
      bySource: {
        booking: data?.filter(r => r.source === 'booking').length || 0,
        airbnb: data?.filter(r => r.source === 'airbnb').length || 0,
        other: data?.filter(r => !['booking', 'airbnb'].includes(r.source || '')).length || 0
      },
      byReason: Object.entries(byReason).map(([reason, items]) => ({
        reason,
        count: items.length,
        samples: items.slice(0, 2).map(r => ({
          id: r.id,
          checkIn: r.check_in,
          checkOut: r.check_out,
          source: r.source,
          cancelledAt: r.cancelled_at
        }))
      })),
      allReservations: data?.map(r => ({
        id: r.id,
        checkIn: r.check_in,
        checkOut: r.check_out,
        source: r.source,
        cancelledAt: r.cancelled_at,
        reason: r.cancellation_reason
      }))
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Investigation error:', error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
