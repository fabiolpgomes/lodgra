import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/requireRole'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(['admin', 'gestor', 'viewer'])
    if (!auth.authorized) return auth.response!

    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('property_id')
    const fromDate = searchParams.get('from')
    const toDate = searchParams.get('to')

    const supabase = await createClient()

    let query = supabase
      .from('reservations')
      .select(
        'id, status, cancelled_at, cancellation_reason, check_in, check_out, property_listing_id, guests(first_name, last_name), property_listings(property_id, properties(name))'
      )
      .eq('status', 'cancelled')

    if (propertyId) {
      query = query.eq('property_listings.property_id', propertyId)
    }

    if (fromDate) {
      query = query.gte('cancelled_at', fromDate)
    }

    if (toDate) {
      query = query.lte('cancelled_at', toDate)
    }

    const { data: cancellations, error } = await query.order('cancelled_at', {
      ascending: false,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calculate statistics
    const stats = {
      total: cancellations?.length || 0,
      byReason: {} as Record<string, number>,
      bySource: {} as Record<string, number>,
      totalNightsCancelled: 0,
      averageCancellationValue: 0,
    }

    if (cancellations && cancellations.length > 0) {
      // Group by cancellation reason
      cancellations.forEach((c) => {
        const reason = c.cancellation_reason || 'Sem motivo'
        stats.byReason[reason] = (stats.byReason[reason] || 0) + 1

        // Calculate nights
        const nights = Math.ceil(
          (new Date(c.check_out).getTime() - new Date(c.check_in).getTime()) /
          (1000 * 60 * 60 * 24)
        )
        stats.totalNightsCancelled += nights
      })

      // Extract source from reason (e.g., "calendar_manual", "calendar_bulk", "ical_auto_sync")
      cancellations.forEach((c) => {
        if (c.cancellation_reason?.includes('calendário')) {
          stats.bySource['calendário'] = (stats.bySource['calendário'] || 0) + 1
        } else if (c.cancellation_reason?.includes('plataforma')) {
          stats.bySource['plataforma'] = (stats.bySource['plataforma'] || 0) + 1
        } else if (c.cancellation_reason?.includes('hóspede')) {
          stats.bySource['hóspede'] = (stats.bySource['hóspede'] || 0) + 1
        } else {
          stats.bySource['outro'] = (stats.bySource['outro'] || 0) + 1
        }
      })
    }

    return NextResponse.json({
      success: true,
      stats,
      details: cancellations?.map((c) => ({
        id: c.id,
        guest: (() => {
          const guest = c.guests as { first_name?: string; last_name?: string } | null
          return guest ? `${guest.first_name || ''} ${guest.last_name || ''}`.trim() : 'Desconhecido'
        })(),
        property: (
          c.property_listings as { properties?: { name?: string } | null } | null
        )?.properties?.name || 'Propriedade',
        period: `${c.check_in} até ${c.check_out}`,
        cancelledAt: c.cancelled_at,
        reason: c.cancellation_reason,
      })),
    })
  } catch (error) {
    console.error('[Analytics API] Exception:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar analytics' },
      { status: 500 }
    )
  }
}
