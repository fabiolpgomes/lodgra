/**
 * GET /api/commissions/dashboard
 * Returns commission summary metrics for dashboard display
 * - Current month, YTD, all-time totals
 * - Commission breakdown by property
 * - Current plan and commission rate
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/requireRole'
import { startOfMonth, startOfYear } from 'date-fns'

export async function GET() {
  try {
    const auth = await requireRole(['admin'])
    if (!auth.authorized) return auth.response!

    const { organizationId } = auth

    const supabase = await createClient()

    // Get current plan and commission rate
    const { data: org } = await supabase
      .from('organizations')
      .select('plan')
      .eq('id', organizationId)
      .single()

    const currentRate = org?.plan
      ? { starter: 0.2, professional: 0.15, business: 0.1 }[org.plan as string] ?? 0.15
      : 0.15

    // Current month
    const monthStart = startOfMonth(new Date()).toISOString().split('T')[0]
    const { data: monthData } = await supabase
      .from('commission_summary')
      .select('booking_count, total_commission')
      .eq('organization_id', organizationId)
      .gte('commission_date', monthStart)

    const currentMonth = {
      total: monthData?.reduce((sum, row) => sum + (row.total_commission || 0), 0) ?? 0,
      count: monthData?.reduce((sum, row) => sum + (row.booking_count || 0), 0) ?? 0,
      avgPerBooking:
        monthData && monthData.length > 0
          ? (monthData.reduce((sum, row) => sum + (row.total_commission || 0), 0) /
              monthData.reduce((sum, row) => sum + (row.booking_count || 0), 0)) ||
            0
          : 0,
    }

    // Year-to-date
    const yearStart = startOfYear(new Date()).toISOString().split('T')[0]
    const { data: yearData } = await supabase
      .from('commission_summary')
      .select('booking_count, total_commission')
      .eq('organization_id', organizationId)
      .gte('commission_date', yearStart)

    const yearToDate = {
      total: yearData?.reduce((sum, row) => sum + (row.total_commission || 0), 0) ?? 0,
      count: yearData?.reduce((sum, row) => sum + (row.booking_count || 0), 0) ?? 0,
      avgPerBooking:
        yearData && yearData.length > 0
          ? (yearData.reduce((sum, row) => sum + (row.total_commission || 0), 0) /
              yearData.reduce((sum, row) => sum + (row.booking_count || 0), 0)) ||
            0
          : 0,
    }

    // All-time
    const { data: allData } = await supabase
      .from('commission_summary')
      .select('booking_count, total_commission')
      .eq('organization_id', organizationId)

    const allTime = {
      total: allData?.reduce((sum, row) => sum + (row.total_commission || 0), 0) ?? 0,
      count: allData?.reduce((sum, row) => sum + (row.booking_count || 0), 0) ?? 0,
      avgPerBooking:
        allData && allData.length > 0
          ? (allData.reduce((sum, row) => sum + (row.total_commission || 0), 0) /
              allData.reduce((sum, row) => sum + (row.booking_count || 0), 0)) ||
            0
          : 0,
    }

    // By property
    const { data: byProperty } = await supabase
      .from('commission_summary')
      .select('property_id, property_name, booking_count, total_commission')
      .eq('organization_id', organizationId)

    interface PropertyCommission {
      id: string
      name: string
      total: number
      count: number
    }

    const propertyMap = new Map<string, PropertyCommission>()
    ;(byProperty as Array<{ property_id: string; property_name: string | null; booking_count: number; total_commission: number }>).forEach((row) => {
      if (!propertyMap.has(row.property_id)) {
        propertyMap.set(row.property_id, {
          id: row.property_id,
          name: row.property_name || 'Unknown',
          total: 0,
          count: 0,
        })
      }
      const entry = propertyMap.get(row.property_id)
      if (entry) {
        entry.total += row.total_commission || 0
        entry.count += row.booking_count || 0
      }
    })

    return NextResponse.json({
      currentMonth,
      yearToDate,
      allTime,
      currentRate,
      byProperty: Array.from(propertyMap.values()).sort((a, b) => b.total - a.total),
    })
  } catch (error) {
    console.error('Commission dashboard error:', error)
    return NextResponse.json({ error: 'Erro ao carregar comissões' }, { status: 500 })
  }
}
