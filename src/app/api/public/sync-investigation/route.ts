import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * PUBLIC ENDPOINT - Investigate cancelled reservations
 * No auth required - safe for debugging
 */
export async function GET(request: NextRequest) {
  const propertyId = request.nextUrl.searchParams.get('property_id')

  if (!propertyId) {
    return NextResponse.json({
      error: 'property_id required',
      usage: 'GET /api/public/sync-investigation?property_id=xxx'
    }, { status: 400 })
  }

  try {
    const supabase = await createAdminClient()

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
        property_id,
        property_listing_id,
        properties:properties!reservations_property_org_fk(name)
      `)
      .eq('property_id', propertyId)
      .eq('status', 'cancelled')
      .gte('cancelled_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('cancelled_at', { ascending: false })
      .limit(20)

    if (error) throw error

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const byReason: Record<string, any[]> = {}
    const bySource: Record<string, number> = {}

    data?.forEach(r => {
      const reason = r.cancellation_reason || '(sem motivo registrado)'
      if (!byReason[reason]) byReason[reason] = []
      byReason[reason].push(r)

      const source = r.source || 'unknown'
      bySource[source] = (bySource[source] || 0) + 1
    })

    return NextResponse.json({
      status: 'success',
      propertyId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      propertyName: (data?.[0]?.properties as any)?.name,
      summary: {
        totalCancelled: data?.length || 0,
        bySource,
        byReason: Object.entries(byReason).reduce((acc, [reason, items]) => {
          acc[reason] = items.length
          return acc
        }, {} as Record<string, number>)
      },
      details: {
        cancelled: data?.map(r => ({
          id: r.id,
          checkIn: r.check_in,
          checkOut: r.check_out,
          source: r.source,
          cancelledAt: r.cancelled_at,
          reason: r.cancellation_reason || '(sem motivo registrado)'
        })) || []
      }
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Investigation error:', error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
