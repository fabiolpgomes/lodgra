/**
 * GET /api/commissions/history
 * Returns paginated commission history with booking details
 * Query params: page (1-indexed), limit (default 50)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/requireRole'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(['admin'])
    if (!auth.authorized) return auth.response!

    const { organizationId } = auth
    const { searchParams } = new URL(request.url)

    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50')))
    const offset = (page - 1) * limit

    const supabase = await createClient()

    // Get total count
    const { count } = await supabase
      .from('reservations')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .neq('status', 'cancelled')
      .not('commission_amount', 'is', null)

    // Get paginated data with joins for property details
    const { data: commissions, error } = await supabase
      .from('reservations')
      .select(
        `
        id,
        check_in,
        check_out,
        total_amount,
        commission_rate,
        commission_amount,
        commission_calculated_at,
        guest_name,
        property_listings!inner (
          properties ( id, name )
        )
      `
      )
      .eq('organization_id', organizationId)
      .neq('status', 'cancelled')
      .not('commission_amount', 'is', null)
      .order('commission_calculated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Commission history error:', error)
      return NextResponse.json({ error: 'Erro ao carregar histórico' }, { status: 500 })
    }

    // Transform for API response
    interface CommissionRow {
      id: string
      check_in: string
      check_out: string
      total_amount: number
      commission_rate: number
      commission_amount: number
      commission_calculated_at: string
      guest_name: string
      property_listings: { properties: { id: string; name: string }[] }[]
    }

    const data = (commissions as CommissionRow[]).map((row) => ({
      id: row.id,
      propertyId: row.property_listings?.[0]?.properties?.[0]?.id,
      propertyName: row.property_listings?.[0]?.properties?.[0]?.name || 'Unknown',
      guestName: row.guest_name,
      checkIn: row.check_in,
      checkOut: row.check_out,
      grossRevenue: row.total_amount,
      commissionRate: row.commission_rate,
      commissionAmount: row.commission_amount,
      calculatedAt: row.commission_calculated_at,
    }))

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total: count ?? 0,
        pages: Math.ceil((count ?? 0) / limit),
      },
    })
  } catch (error) {
    console.error('Commission history error:', error)
    return NextResponse.json({ error: 'Erro ao carregar histórico' }, { status: 500 })
  }
}
