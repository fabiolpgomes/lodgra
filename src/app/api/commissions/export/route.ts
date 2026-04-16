/**
 * GET /api/commissions/export
 * Exports commission data as CSV
 * Query params: format (csv), startDate, endDate
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/requireRole'

function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

interface CommissionRowForCSV {
  id: string
  propertyName: string
  guestName: string
  checkIn: string
  checkOut: string
  grossRevenue: number
  commissionRate: number
  commissionAmount: number
  calculatedAt: string
}

function generateCSV(rows: CommissionRowForCSV[]): string {
  const headers = [
    'Reserva ID',
    'Propriedade',
    'Hóspede',
    'Check-in',
    'Check-out',
    'Receita Bruta',
    'Taxa Comissão',
    'Comissão',
    'Data Cálculo',
  ]

  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map((row) =>
      [
        row.id,
        row.propertyName,
        row.guestName,
        row.checkIn,
        row.checkOut,
        row.grossRevenue,
        `${(row.commissionRate * 100).toFixed(1)}%`,
        row.commissionAmount,
        new Date(row.calculatedAt).toLocaleDateString('pt-PT'),
      ]
        .map(escapeCSV)
        .join(',')
    ),
  ].join('\n')

  return csvContent
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(['admin'])
    if (!auth.authorized) return auth.response!

    const { organizationId } = auth
    const { searchParams } = new URL(request.url)

    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const supabase = await createClient()

    let query = supabase
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

    if (startDate) {
      query = query.gte('commission_calculated_at', startDate)
    }
    if (endDate) {
      query = query.lte('commission_calculated_at', endDate)
    }

    const { data: commissions, error } = await query.order('commission_calculated_at', {
      ascending: false,
    })

    if (error) {
      console.error('Commission export error:', error)
      return NextResponse.json({ error: 'Erro ao exportar dados' }, { status: 500 })
    }

    // Transform for CSV
    interface CommissionRowFromDB {
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

    const rows = (commissions as CommissionRowFromDB[]).map((row) => ({
      id: row.id,
      propertyName: row.property_listings?.[0]?.properties?.[0]?.name || 'Unknown',
      guestName: row.guest_name,
      checkIn: row.check_in,
      checkOut: row.check_out,
      grossRevenue: row.total_amount,
      commissionRate: row.commission_rate,
      commissionAmount: row.commission_amount,
      calculatedAt: row.commission_calculated_at,
    }))

    const csv = generateCSV(rows)

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="comissoes-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error('Commission export error:', error)
    return NextResponse.json({ error: 'Erro ao exportar dados' }, { status: 500 })
  }
}
