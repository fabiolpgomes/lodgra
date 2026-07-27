import { createClient } from '@/lib/supabase/server'
import { addDays, eachDayOfInterval, format } from 'date-fns'

export interface PriceBreakdownItem {
  date: string
  price: number
}

export interface PriceForRange {
  total: number
  breakdown: PriceBreakdownItem[]
  minNights: number
}


async function fetchDailyPrices(
  supabase: { from: (table: string) => unknown },
  propertyId: string,
  checkIn: Date,
  checkOut: Date
): Promise<{ dailyPrices: Map<string, number>; propertyMinNights: number }> {
  const checkInStr = format(checkIn, 'yyyy-MM-dd')
  const checkOutStr = format(checkOut, 'yyyy-MM-dd')

  const db = supabase as {
    from: (t: string) => {
      select: (s: string) => {
        eq: (col: string, val: string) => {
          single: () => Promise<{ data: { min_nights?: number } | null }>
          gte: (col: string, val: string) => {
            lte: (col: string, val: string) => Promise<{ data: Array<{ date: string; base_price: number }> | null }>
          }
        }
      }
    }
  }

  // Fetch property min_nights
  const { data: property } = await db
    .from('properties')
    .select('min_nights')
    .eq('id', propertyId)
    .single()

  const propertyMinNights = property?.min_nights ? parseInt(String(property.min_nights)) : 1

  // Fetch daily prices for the date range
  const { data: pricesRaw } = await db
    .from('daily_prices')
    .select('date, base_price')
    .eq('property_id', propertyId)
    .gte('date', checkInStr)
    .lte('date', checkOutStr)

  // Map to easy lookup
  const dailyPrices = new Map<string, number>()
  if (pricesRaw) {
    pricesRaw.forEach((p: { date: string; base_price: number }) => {
      dailyPrices.set(p.date, parseFloat(String(p.base_price)))
    })
  }

  return { dailyPrices, propertyMinNights }
}

/**
 * Internal: calculates price given a supabase client (authenticated or admin).
 * Story 37.2: Now uses daily_prices table instead of pricing_rules
 */
async function getPriceForRangeInternal(
  supabase: { from: (table: string) => unknown },
  propertyId: string,
  checkIn: Date,
  checkOut: Date
): Promise<PriceForRange> {
  const { dailyPrices, propertyMinNights } = await fetchDailyPrices(supabase, propertyId, checkIn, checkOut)

  const nights = eachDayOfInterval({ start: checkIn, end: addDays(checkOut, -1) })

  let total = 0
  const breakdown: PriceBreakdownItem[] = []

  for (const night of nights) {
    const dateStr = format(night, 'yyyy-MM-dd')
    const price = dailyPrices.get(dateStr) ?? 0
    breakdown.push({ date: dateStr, price })
    total += price
  }

  return { total, breakdown, minNights: propertyMinNights }
}

/**
 * Calculates price for a stay. Uses authenticated server client (respects RLS).
 * For use in authenticated server-side contexts.
 */
export async function getPriceForRange(
  propertyId: string,
  checkIn: Date,
  checkOut: Date
): Promise<PriceForRange> {
  const supabase = await createClient()
  return getPriceForRangeInternal(supabase, propertyId, checkIn, checkOut)
}

/**
 * Calculates price for a stay. Uses admin client (bypasses RLS).
 * For use in public API endpoints where there is no auth context.
 */
export async function getPriceForRangePublic(
  propertyId: string,
  checkIn: Date,
  checkOut: Date
): Promise<PriceForRange> {
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const supabase = createAdminClient()
  return getPriceForRangeInternal(supabase, propertyId, checkIn, checkOut)
}
