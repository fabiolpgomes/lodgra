import { createClient } from '@/lib/supabase/server'
import { addDays, eachDayOfInterval, format, differenceInDays } from 'date-fns'

export interface PriceBreakdownItem {
  date: string
  price: number
}

export interface PriceForRange {
  total: number
  breakdown: PriceBreakdownItem[]
  minNights: number
  maxNights?: number
}


async function fetchDailyPrices(
  supabase: { from: (table: string) => unknown },
  propertyId: string,
  checkIn: Date,
  checkOut: Date
): Promise<{ dailyPrices: Map<string, number>; propertyMinNights: number; maxNights?: number }> {
  const checkInStr = format(checkIn, 'yyyy-MM-dd')
  const checkOutStr = format(checkOut, 'yyyy-MM-dd')
  const nights = differenceInDays(checkOut, checkIn)

  const db = supabase as any

  // Fetch property min/max nights from property_availability
  const { data: availability } = await db
    .from('property_availability')
    .select('min_nights, max_nights')
    .eq('property_id', propertyId)
    .maybeSingle()

  const propertyMinNights = availability?.min_nights ? parseInt(String(availability.min_nights)) : 1
  const propertyMaxNights = availability?.max_nights ? parseInt(String(availability.max_nights)) : 90

  // Validate nights are within range
  if (nights < propertyMinNights) {
    throw new Error(`Minimum ${propertyMinNights} nights required`)
  }
  if (nights > propertyMaxNights) {
    throw new Error(`Maximum ${propertyMaxNights} nights allowed`)
  }

  // Fetch pricing rules (source of truth for daily prices)
  const { data: pricingRulesRaw, error: rulesError } = await db
    .from('pricing_rules')
    .select('start_date, end_date, price_per_night')
    .eq('property_id', propertyId)
    .gte('end_date', checkInStr)
    .lte('start_date', checkOutStr)

  console.log(`[getPriceForRange] Query params:`, { propertyId, checkInStr, checkOutStr })
  console.log(`[getPriceForRange] Pricing rules raw results:`, pricingRulesRaw)

  if (rulesError) {
    console.error(`[getPriceForRange] ERROR fetching pricing rules: ${rulesError.message}`)
    throw new Error(`Failed to fetch pricing: ${rulesError.message}`)
  }

  // Build daily prices from pricing rules (NO FALLBACK)
  const dailyPrices = new Map<string, number>()

  if (pricingRulesRaw && pricingRulesRaw.length > 0) {
    for (const rule of pricingRulesRaw) {
      const ruleStartDate = new Date(rule.start_date)
      const ruleEndDate = new Date(rule.end_date)
      const daysInRule = eachDayOfInterval({ start: ruleStartDate, end: ruleEndDate })

      for (const day of daysInRule) {
        const dateStr = format(day, 'yyyy-MM-dd')
        const price = parseFloat(String(rule.price_per_night))
        dailyPrices.set(dateStr, price)
        console.log(`[getPriceForRange] Pricing rule: ${dateStr} = ${price}`)
      }
    }
  }

  // Verify all dates in range have pricing
  const daysInRange = eachDayOfInterval({ start: checkIn, end: addDays(checkOut, -1) })
  for (const day of daysInRange) {
    const dateStr = format(day, 'yyyy-MM-dd')
    if (!dailyPrices.has(dateStr)) {
      throw new Error(`No pricing configured for date ${dateStr}`)
    }
  }

  // Apply discounts from property_discounts based on nights
  let appliedDiscount = 0
  if (nights >= 28) {
    appliedDiscount = 20 // 20% for 28+ nights
  } else if (nights >= 7) {
    appliedDiscount = 10 // 10% for 7+ nights
  }

  // Apply discount to all daily prices if applicable
  if (appliedDiscount > 0) {
    for (const [date, price] of dailyPrices.entries()) {
      const discountedPrice = price * (1 - appliedDiscount / 100)
      dailyPrices.set(date, discountedPrice)
    }
  }

  console.log(`[getPriceForRange] Calculation: ${nights} nights, min=${propertyMinNights}, max=${propertyMaxNights}`)
  console.log(`[getPriceForRange] Pricing rules count: ${pricingRulesRaw?.length || 0}`)
  console.log(`[getPriceForRange] Daily prices:`, Array.from(dailyPrices.entries()))

  return { dailyPrices, propertyMinNights, maxNights: propertyMaxNights }
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
  const { dailyPrices, propertyMinNights, maxNights = 90 } = await fetchDailyPrices(supabase, propertyId, checkIn, checkOut)

  const nights = eachDayOfInterval({ start: checkIn, end: addDays(checkOut, -1) })

  let total = 0
  const breakdown: PriceBreakdownItem[] = []

  for (const night of nights) {
    const dateStr = format(night, 'yyyy-MM-dd')
    const price = dailyPrices.get(dateStr) ?? 0
    breakdown.push({ date: dateStr, price })
    total += price
  }

  return { total, breakdown, minNights: propertyMinNights, maxNights }
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
