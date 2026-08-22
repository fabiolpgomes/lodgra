import { addDays, eachDayOfInterval, format } from 'date-fns'
import { createAdminClient } from '@/lib/supabase/admin'

type SupabaseLike = {
  from: (table: string) => {
    select: (columns: string) => any
  }
}

export interface PropertyPriceBreakdownItem {
  date: string
  price: number
}

export interface PropertyPriceCalculationResult {
  baseTotal: number
  discountApplied: boolean
  discountType: 'weekly' | 'monthly' | null
  discountPercentage: number
  discountAmount: number
  finalTotal: number
  breakdown: PropertyPriceBreakdownItem[]
}

export class PropertyPriceCalculationError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message)
    this.name = 'PropertyPriceCalculationError'
  }
}

interface PriceRow {
  base_price?: number | string | null
  weekend_price?: number | string | null
}

interface PropertyRow {
  id: string
  base_price?: number | string | null
}

interface PricingRuleRow {
  start_date: string
  end_date: string
  price_per_night: number | string
}

interface DailyPriceRow {
  date: string
  base_price: number | string
}

interface DiscountRow {
  discount_type: 'weekly' | 'monthly'
  percentage: number | string
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function parseIsoDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false

  const date = parseIsoDate(value)
  return format(date, 'yyyy-MM-dd') === value
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}

function toNumber(value: number | string | null | undefined): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function resolveVolumeDiscount(
  discounts: DiscountRow[],
  nights: number
): { type: 'weekly' | 'monthly'; percentage: number } | null {
  const targetType = nights >= 28 ? 'monthly' : nights >= 7 ? 'weekly' : null

  if (!targetType) {
    return null
  }

  const matching = discounts
    .filter((discount) => discount.discount_type === targetType)
    .map((discount) => ({
      type: discount.discount_type,
      percentage: round(toNumber(discount.percentage)),
    }))
    .filter((discount) => discount.percentage > 0)
    .sort((a, b) => b.percentage - a.percentage)[0]

  return matching ?? null
}

async function resolveClient(
  supabase?: SupabaseLike
): Promise<SupabaseLike> {
  if (supabase) return supabase
  return createAdminClient() as unknown as SupabaseLike
}

export async function calculatePropertyPrice(
  propertyId: string,
  checkInDate: string,
  checkOutDate: string,
  supabase?: SupabaseLike
): Promise<PropertyPriceCalculationResult> {
  if (!propertyId) {
    throw new PropertyPriceCalculationError('propertyId is required', 400)
  }

  if (!isValidIsoDate(checkInDate)) {
    throw new PropertyPriceCalculationError(
      'checkInDate must be a valid ISO date (YYYY-MM-DD)',
      400
    )
  }

  if (!isValidIsoDate(checkOutDate)) {
    throw new PropertyPriceCalculationError(
      'checkOutDate must be a valid ISO date (YYYY-MM-DD)',
      400
    )
  }

  const checkIn = parseIsoDate(checkInDate)
  const checkOut = parseIsoDate(checkOutDate)

  if (checkOut <= checkIn) {
    throw new PropertyPriceCalculationError(
      'checkInDate must be before checkOutDate',
      400
    )
  }

  const client = await resolveClient(supabase)
  const checkOutBoundary = addDays(checkOut, -1)
  const stayDays = eachDayOfInterval({ start: checkIn, end: checkOutBoundary })

  const [
    { data: property, error: propertyError },
    { data: propertyPricing, error: pricingError },
    { data: pricingRules, error: rulesError },
    { data: dailyPrices, error: dailyError },
    { data: discounts, error: discountsError },
  ] = await Promise.all([
    client
      .from('properties')
      .select('id, base_price')
      .eq('id', propertyId)
      .maybeSingle(),
    client
      .from('property_prices')
      .select('base_price, weekend_price')
      .eq('property_id', propertyId)
      .maybeSingle(),
    client
      .from('pricing_rules')
      .select('start_date, end_date, price_per_night')
      .eq('property_id', propertyId)
      .lte('start_date', checkOutDate)
      .gte('end_date', checkInDate)
      .order('start_date', { ascending: true }),
    client
      .from('daily_prices')
      .select('date, base_price')
      .eq('property_id', propertyId)
      .gte('date', checkInDate)
      .lt('date', checkOutDate)
      .order('date', { ascending: true }),
    client
      .from('property_discounts')
      .select('discount_type, percentage')
      .eq('property_id', propertyId)
      .in('discount_type', ['weekly', 'monthly'])
      .order('discount_type', { ascending: true }),
  ])

  const dbErrors = [propertyError, pricingError, rulesError, dailyError, discountsError].filter(
    (error) => error && (error as { code?: string }).code !== 'PGRST116'
  )

  if (dbErrors.length > 0) {
    const firstError = dbErrors[0] as { message?: string }
    throw new PropertyPriceCalculationError(
      firstError.message ?? 'Failed to load pricing data',
      500
    )
  }

  if (!property) {
    throw new PropertyPriceCalculationError('Property not found', 404)
  }

  const basePrice = toNumber((propertyPricing as PriceRow | null)?.base_price ?? (property as PropertyRow | null)?.base_price)
  const weekendPrice = toNumber((propertyPricing as PriceRow | null)?.weekend_price)

  if (basePrice <= 0) {
    throw new PropertyPriceCalculationError(
      'Property pricing is not configured',
      422
    )
  }

  const nightlyPrices = new Map<string, number>()

  for (const day of stayDays) {
    const dateKey = format(day, 'yyyy-MM-dd')
    const isWeekend = day.getDay() === 5 || day.getDay() === 6
    nightlyPrices.set(dateKey, isWeekend && weekendPrice > 0 ? weekendPrice : basePrice)
  }

  for (const rule of (pricingRules ?? []) as PricingRuleRow[]) {
    const ruleStart = parseIsoDate(rule.start_date)
    const ruleEnd = parseIsoDate(rule.end_date)
    const overlapStart = ruleStart > checkIn ? ruleStart : checkIn
    const overlapEnd = ruleEnd < checkOutBoundary ? ruleEnd : checkOutBoundary

    if (overlapStart > overlapEnd) continue

    for (const day of eachDayOfInterval({ start: overlapStart, end: overlapEnd })) {
      nightlyPrices.set(format(day, 'yyyy-MM-dd'), round(toNumber(rule.price_per_night)))
    }
  }

  for (const daily of (dailyPrices ?? []) as DailyPriceRow[]) {
    nightlyPrices.set(format(parseIsoDate(daily.date), 'yyyy-MM-dd'), round(toNumber(daily.base_price)))
  }

  const breakdown: PropertyPriceBreakdownItem[] = []
  for (const day of stayDays) {
    const dateKey = format(day, 'yyyy-MM-dd')
    const price = nightlyPrices.get(dateKey)

    if (price === undefined) {
      throw new PropertyPriceCalculationError(
        `No pricing configured for date ${dateKey}`,
        422
      )
    }

    breakdown.push({
      date: dateKey,
      price: round(price),
    })
  }

  const baseTotal = round(
    breakdown.reduce((sum, item) => sum + item.price, 0)
  )
  const nights = breakdown.length
  const volumeDiscount = resolveVolumeDiscount((discounts ?? []) as DiscountRow[], nights)
  const discountPercentage = volumeDiscount?.percentage ?? 0
  const discountType = volumeDiscount?.type ?? null
  const discountAmount = round((baseTotal * discountPercentage) / 100)
  const finalTotal = round(baseTotal - discountAmount)

  return {
    baseTotal,
    discountApplied: discountAmount > 0,
    discountType,
    discountPercentage,
    discountAmount,
    finalTotal,
    breakdown,
  }
}
