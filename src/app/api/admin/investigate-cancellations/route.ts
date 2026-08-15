import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/requireRole'

export async function GET(request: NextRequest) {
  const auth = await requireRole(['admin', 'gestor'])
  if (!auth.authorized) return auth.response!
  if (!auth.organizationId) {
    return NextResponse.json({ error: 'Organização não encontrada' }, { status: 403 })
  }

  const propertyId = request.nextUrl.searchParams.get('property_id')

  if (!propertyId) {
    return NextResponse.json({ error: 'property_id required' }, { status: 400 })
  }

  try {
    const supabase = await createAdminClient()

    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id')
      .eq('id', propertyId)
      .eq('organization_id', auth.organizationId)
      .maybeSingle()

    if (propertyError) throw propertyError
    if (!property) {
      return NextResponse.json({ error: 'Propriedade não encontrada' }, { status: 404 })
    }

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
        property_id,
        property_listing_id
      `)
      .eq('organization_id', auth.organizationId)
      .eq('property_id', propertyId)
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
      property_listing_id: string | null
      property_id: string
    }
    const reservations = (data ?? []) as ReservationGroup[]
    const byReason: Record<string, ReservationGroup[]> = {}
    reservations.forEach((r) => {
      const reason = r.cancellation_reason || '(sem motivo registrado)'
      if (!byReason[reason]) byReason[reason] = []
      byReason[reason].push(r)
    })

    const stats = {
      total: reservations.length,
      byBooking: reservations.filter(r => r.source === 'booking').length,
      byAirbnb: reservations.filter(r => r.source === 'airbnb').length,
      byOther: reservations.filter(r => !['booking', 'airbnb'].includes(r.source || '')).length,
      byReason,
      detail: reservations
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
