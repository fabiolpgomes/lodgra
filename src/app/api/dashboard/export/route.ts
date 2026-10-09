import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSessionTimeZone } from '@/lib/dates/business-timezone.server'
import { todayInTimeZone } from '@/lib/dates/date-only'
import { generateRevenueCsv } from '@/lib/export/revenue-csv'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const format = searchParams.get('format') || 'csv'
    const currency = searchParams.get('currency')
    const month = searchParams.get('month')

    // Validate format
    if (!['csv', 'pdf'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format. Must be "csv" or "pdf"' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Fetch confirmed reservations
    const { data: reservations, error } = await supabase
      .from('reservations')
      .select('id, total_amount, check_in, check_out, currency, status')
      .eq('status', 'confirmed')

    if (error) {
      return NextResponse.json(
        { error: `Failed to fetch reservations: ${error.message}` },
        { status: 500 }
      )
    }

    const exportDate = todayInTimeZone(await getSessionTimeZone(supabase))

    // Transform to internal format
    const transformedReservations = reservations.map(r => ({
      id: r.id,
      totalAmount: r.total_amount,
      checkIn: String(r.check_in).slice(0, 10),
      checkOut: String(r.check_out).slice(0, 10),
      currency: r.currency,
      status: r.status as 'confirmed' | 'cancelled' | 'pending'
    }))

    if (format === 'csv') {
      const csv = generateRevenueCsv(transformedReservations, { exportDate, currency, month })

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="revenue-export.csv"'
        }
      })
    }

    // For now, PDF returns CSV (can be enhanced later)
    // In production, use pdf-lib or pdfkit for proper PDF generation
    const csv = generateRevenueCsv(transformedReservations, { exportDate, currency, month })

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="revenue-export.csv"'
      }
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
