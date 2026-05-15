import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateRevenueForReservation } from '@/lib/financial/revenue-calculator'

export const dynamic = 'force-dynamic'

interface ReservationData {
  id: string
  totalAmount: number
  checkIn: Date | string
  checkOut: Date | string
  currency: string
  status: 'confirmed' | 'cancelled' | 'pending'
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('pt-BR')
}

function generateCSV(
  reservations: ReservationData[],
  currency?: string | null,
  month?: string | null
): string {
  // CSV header
  const headers = ['Data', 'Reserva ID', 'Check-in', 'Check-out', 'Duração', 'Moeda', 'Valor Total', 'Receita Mês', 'Saldo Previsto']
  const rows: string[] = [headers.map(h => `"${h}"`).join(',')]

  // Process each reservation
  for (const reservation of reservations) {
    // Skip if status is not confirmed
    if (reservation.status !== 'confirmed') continue

    // Filter by currency if specified
    if (currency && reservation.currency !== currency) continue

    // Calculate revenue breakdown
    const result = calculateRevenueForReservation(reservation)

    // Format dates
    const checkInStr = typeof reservation.checkIn === 'string' ? reservation.checkIn : reservation.checkIn.toISOString().split('T')[0]
    const checkOutStr = typeof reservation.checkOut === 'string' ? reservation.checkOut : reservation.checkOut.toISOString().split('T')[0]

    // Extract duration
    const durationDays = result.durationDays

    // Process each month in breakdown
    for (const monthBreakdown of result.monthlyBreakdown) {
      // Filter by month if specified
      if (month && monthBreakdown.month !== month) continue

      const row = [
        new Date().toLocaleDateString('pt-BR'), // Data (export date)
        `"${result.reservationId}"`, // Reserva ID
        formatDate(checkInStr), // Check-in
        formatDate(checkOutStr), // Check-out
        durationDays.toString(), // Duração
        result.currency, // Moeda
        result.totalAmount.toFixed(2), // Valor Total
        monthBreakdown.value.toFixed(2), // Receita Mês
        monthBreakdown.value.toFixed(2) // Saldo Previsto (for this month)
      ]

      rows.push(row.join(','))
    }
  }

  return rows.join('\n')
}

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

    // Transform to internal format
    const transformedReservations = reservations.map(r => ({
      id: r.id,
      totalAmount: r.total_amount,
      checkIn: new Date(r.check_in),
      checkOut: new Date(r.check_out),
      currency: r.currency,
      status: r.status as 'confirmed' | 'cancelled' | 'pending'
    }))

    if (format === 'csv') {
      const csv = generateCSV(transformedReservations, currency, month)

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
    const csv = generateCSV(transformedReservations, currency, month)

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
