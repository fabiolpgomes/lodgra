import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { aggregateMonthlyRevenue, calculateProfit, type MonthlyRevenue } from '@/lib/financial/revenue-calculator'
import { cache } from '@/lib/cache/simple-cache'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const currency = searchParams.get('currency')
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7)

    // Check cache first (TTL: 1 hour = 3600 seconds)
    const revenueCacheKey = 'revenue:all'
    let revenueByMonth = cache.get<Map<string, MonthlyRevenue[]>>(revenueCacheKey)

    if (!revenueByMonth) {
      const supabase = await createClient()

      // Fetch confirmed reservations
      const { data: reservations, error: reservError } = await supabase
        .from('reservations')
        .select('id, total_amount, check_in, check_out, currency, status')
        .eq('status', 'confirmed')

      if (reservError) {
        return NextResponse.json(
          { error: `Failed to fetch reservations: ${reservError.message}` },
          { status: 500 }
        )
      }

      // Transform reservations
      const transformedReservations = reservations.map(r => ({
        id: r.id,
        totalAmount: r.total_amount,
        checkIn: new Date(r.check_in),
        checkOut: new Date(r.check_out),
        currency: r.currency,
        status: r.status as 'confirmed' | 'cancelled' | 'pending'
      }))

      // Calculate revenue
      revenueByMonth = aggregateMonthlyRevenue(transformedReservations)

      // Cache result for 1 hour
      cache.set(revenueCacheKey, revenueByMonth, 3600)
    }

    const supabase = await createClient()

    // Fetch expenses for the month
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select('amount, currency')
      .gte('date', `${month}-01`)
      .lt('date', `${month}-99`)

    if (expensesError) {
      return NextResponse.json(
        { error: `Failed to fetch expenses: ${expensesError.message}` },
        { status: 500 }
      )
    }

    // Aggregate expenses by currency
    const expensesByurrency: Record<string, number> = {}
    for (const expense of expenses) {
      const curr = expense.currency
      if (!expensesByurrency[curr]) {
        expensesByurrency[curr] = 0
      }
      expensesByurrency[curr] += expense.amount
    }

    // Calculate profit for each currency
    interface ProfitResponse {
      revenue: number
      expenses: number
      profit: number
    }
    const response: Record<string, ProfitResponse> = {}

    // Union of currencies from both revenue and expenses
    const allCurrencies = new Set([
      ...revenueByMonth.keys(),
      ...Object.keys(expensesByurrency)
    ])

    for (const curr of allCurrencies) {
      const monthlyData = revenueByMonth.get(curr) || []
      const currentMonth = monthlyData.find((item: MonthlyRevenue) => item.month === month)
      const actualRevenue = currentMonth?.actual || 0
      const totalExpenses = expensesByurrency[curr] || 0
      const profit = calculateProfit(actualRevenue, totalExpenses)

      response[curr] = {
        revenue: actualRevenue,
        expenses: totalExpenses,
        profit
      }
    }

    // Filter by currency if specified
    if (currency) {
      const result: Record<string, ProfitResponse> = {}
      if (response[currency]) {
        result[currency] = response[currency]
      }
      return NextResponse.json(result, { status: 200 })
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error('Profit calculation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
