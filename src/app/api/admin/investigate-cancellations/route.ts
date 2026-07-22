import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const propertyId = request.nextUrl.searchParams.get('property_id')

  if (!propertyId) {
    return NextResponse.json({ error: 'property_id required' }, { status: 400 })
  }

  try {
    const supabase = await createAdminClient()

    // Query: Encontrar reservas canceladas
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
        property_listings!inner(property_id)
      `)
      .eq('property_listings.property_id', propertyId)
      .eq('status', 'cancelled')
      .gte('cancelled_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('cancelled_at', { ascending: false })

    if (error) throw error

    // Agrupar por motivo
    interface ReservationGroup {
      id: string
      check_in: string
      check_out: string
      source: string | null
      status: string
      cancelled_at: string | null
      cancellation_reason: string | null
      property_listing_id: string
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      property_listings: any
    }
    const byReason: Record<string, typeof data> = {}
    data?.forEach((r: ReservationGroup) => {
      const reason = r.cancellation_reason || '(sem motivo registrado)'
      if (!byReason[reason]) byReason[reason] = []
      byReason[reason].push(r)
    })

    const stats = {
      total: data?.length || 0,
      byBooking: data?.filter(r => r.source === 'booking').length || 0,
      byAirbnb: data?.filter(r => r.source === 'airbnb').length || 0,
      byOther: data?.filter(r => !['booking', 'airbnb'].includes(r.source || '')).length || 0,
      byReason,
      detail: data || []
    }

    return NextResponse.json({
      propertyId,
      investigation: stats,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Investigation error:', error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
