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

  // Fetch base price from property_prices
  const { data: priceData } = await db
    .from('property_prices')
    .select('base_price')
    .eq('property_id', propertyId)
    .single()

  const basePrice = priceData?.base_price ? parseFloat(String(priceData.base_price)) : 0

  // Fetch daily price overrides from daily_prices
  const { data: dailyOverridesRaw, error: overridesError } = await db
    .from('daily_prices')
    .select('date, base_price:price')
    .eq('property_id', propertyId)
    .gte('date', checkInStr)
    .lte('date', checkOutStr)

  console.log(`[getPriceForRange] Query params:`, { propertyId, checkInStr, checkOutStr })
  console.log(`[getPriceForRange] Daily prices raw results:`, dailyOverridesRaw)

  if (overridesError) {
    console.error(`[getPriceForRange] ERROR fetching daily prices: ${overridesError.message}`)
  }

  // Map daily prices (base or override)
  const dailyPrices = new Map<string, number>()
  const overridesMap = new Map<string, number>()
  if (dailyOverridesRaw && dailyOverridesRaw.length > 0) {
    dailyOverridesRaw.forEach((p: { date: string; price: number }) => {
      const priceValue = parseFloat(String(p.price))
      overridesMap.set(p.date, priceValue)
      console.log(`[getPriceForRange] Daily override: ${p.date} = ${priceValue}`)
    })
  }

  // Build price map with overrides
  const daysInRange = eachDayOfInterval({ start: checkIn, end: addDays(checkOut, -1) })
  for (const day of daysInRange) {
    const dateStr = format(day, 'yyyy-MM-dd')
    const price = overridesMap.get(dateStr) ?? basePrice
    dailyPrices.set(dateStr, price)
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
  console.log(`[getPriceForRange] Base price: ${basePrice}, overrides count: ${overridesMap.size}`)
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
