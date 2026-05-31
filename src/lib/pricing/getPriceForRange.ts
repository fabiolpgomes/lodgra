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

export interface PricingRule {
  id: string
  name: string
  start_date: string
  end_date: string
  price_per_night: number
  min_nights: number
  created_at: string
}

/**
 * Returns the applicable pricing rule for a given date.
 * If multiple rules overlap, the most recently created one wins.
 * Falls back to null if no rule applies (caller uses base_price).
 */
export function ruleForDate(rules: PricingRule[], date: Date): PricingRule | null {
  const dateStr = format(date, 'yyyy-MM-dd')
  const applicable = rules.filter(
    (r) => r.start_date <= dateStr && r.end_date >= dateStr
  )
  if (applicable.length === 0) return null
  return applicable.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )[0]
}

/**
 * Pure calculation: given rules + basePrice, returns PriceForRange.
 * No DB access — fully testable.
 * propertyMinNights: fallback minimum stay when no rules apply (default 1)
 */
export function calculatePrice(
  rules: PricingRule[],
  basePrice: number,
  checkIn: Date,
  checkOut: Date,
  propertyMinNights: number = 1
): PriceForRange {
  const nights = eachDayOfInterval({ start: checkIn, end: addDays(checkOut, -1) })

  let total = 0
  const breakdown: PriceBreakdownItem[] = []
  let maxMinNights = propertyMinNights

  for (const night of nights) {
    const rule = ruleForDate(rules, night)
    const price = rule ? rule.price_per_night : basePrice
    if (rule && rule.min_nights > maxMinNights) {
      maxMinNights = rule.min_nights
    }
    breakdown.push({ date: format(night, 'yyyy-MM-dd'), price })
    total += price
  }

  return { total, breakdown, minNights: maxMinNights }
}

async function fetchRulesAndBasePrice(
  supabase: { from: (table: string) => unknown },
  propertyId: string,
  checkIn: Date,
  checkOut: Date
): Promise<{ basePrice: number; rules: PricingRule[]; propertyMinNights: number }> {
  const checkInStr = format(checkIn, 'yyyy-MM-dd')
  const checkOutStr = format(checkOut, 'yyyy-MM-dd')

  const db = supabase as {
    from: (t: string) => {
      select: (s: string) => {
        eq: (col: string, val: string) => {
          single: () => Promise<{ data: { base_price?: number; min_nights?: number } | null }>
          lte: (col: string, val: string) => {
            gte: (col: string, val: string) => {
              order: (col: string, opts: { ascending: boolean }) => Promise<{ data: unknown[] | null }>
            }
          }
        }
      }
    }
  }

  const { data: property } = await db
    .from('properties')
    .select('base_price, min_nights')
    .eq('id', propertyId)
    .single()

  const basePrice = property?.base_price ? parseFloat(String(property.base_price)) : 0
  const propertyMinNights = property?.min_nights ? parseInt(String(property.min_nights)) : 1

  const { data: rulesRaw } = await db
    .from('pricing_rules')
    .select('id, name, start_date, end_date, price_per_night, min_nights, created_at')
    .eq('property_id', propertyId)
    .lte('start_date', checkOutStr)
    .gte('end_date', checkInStr)
    .order('created_at', { ascending: false })

  const rules: PricingRule[] = ((rulesRaw ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    start_date: r.start_date as string,
    end_date: r.end_date as string,
    price_per_night: parseFloat(String(r.price_per_night)),
    min_nights: r.min_nights as number,
    created_at: r.created_at as string,
  }))

  return { basePrice, rules, propertyMinNights }
}

/**
 * Internal: calculates price given a supabase client (authenticated or admin).
 */
async function getPriceForRangeInternal(
  supabase: { from: (table: string) => unknown },
  propertyId: string,
  checkIn: Date,
  checkOut: Date
): Promise<PriceForRange> {
  const { basePrice, rules, propertyMinNights } = await fetchRulesAndBasePrice(supabase, propertyId, checkIn, checkOut)
  return calculatePrice(rules, basePrice, checkIn, checkOut, propertyMinNights)
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
