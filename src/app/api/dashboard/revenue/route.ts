import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { aggregateMonthlyRevenue } from '@/lib/financial/revenue-calculator'
import { cache } from '@/lib/cache/simple-cache'

interface MonthlyRevenue {
  month: string
  actual: number
  predicted: number
}

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const currency = searchParams.get('currency')
    const month = searchParams.get('month')

    // Check cache first (TTL: 1 hour = 3600 seconds)
    const cacheKey = 'revenue:all'
    let revenueByMonth = cache.get<Map<string, MonthlyRevenue[]>>(cacheKey)

    if (!revenueByMonth) {
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

      // Calculate aggregated revenue
      revenueByMonth = aggregateMonthlyRevenue(transformedReservations)

      // Cache result for 1 hour
      cache.set(cacheKey, revenueByMonth, 3600)
    }

    // Filter by currency if specified
    const response: Record<string, MonthlyRevenue[]> = {}
    if (currency) {
      const monthlyData = revenueByMonth.get(currency)
      if (!monthlyData) {
        response[currency] = []
      } else {
        response[currency] = monthlyData
      }
    } else {
      // Return all currencies
      for (const [curr, data] of revenueByMonth.entries()) {
        response[curr] = data
      }
    }

    // Filter by month if specified
    if (month) {
      for (const curr in response) {
        response[curr] = response[curr].filter(item => item.month === month)
      }
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error('Revenue calculation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
