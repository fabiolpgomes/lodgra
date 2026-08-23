/**
 * Story 37.2: Get daily prices for a property
 * GET /api/properties/:id/daily-prices
 *
 * Returns pricing by date using this hierarchy:
 * 1. daily_prices (daily overrides set via admin calendar)
 * 2. weekend_price (Friday/Saturday property fallback)
 * 3. pricing_rules (period-based pricing fallback)
 */

import { authorizePropertyManagement } from '@/lib/auth/authorizePropertyManagement'
import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { eachDayOfInterval, format } from 'date-fns'

function parseLocalDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: propertyId } = await params

  try {
    const access = await authorizePropertyManagement(propertyId)
    if (!access.authorized) return access.response!
    const { admin } = access
    const pricesMap = new Map<string, number>()
    const requestedYear = Number(request.nextUrl.searchParams.get('year'))
    const requestedMonth = Number(request.nextUrl.searchParams.get('month'))
    const now = new Date()
    const year = Number.isInteger(requestedYear) && requestedYear >= 2000 && requestedYear <= 9999
      ? requestedYear
      : now.getFullYear()
    const month = Number.isInteger(requestedMonth) && requestedMonth >= 0 && requestedMonth <= 11
      ? requestedMonth
      : now.getMonth()
    const rangeStart = new Date(year, month, 1)
    const rangeEnd = new Date(year, month + 1, 0)

    // Fetch weekend_price from property_prices table (where it's actually stored)
    const { data: pricing, error: pricingError } = await admin
      .from('property_prices')
      .select('base_price, weekend_price')
      .eq('property_id', propertyId)
      .single()

    // PGRST116 means this property has no pricing row yet, so the empty
    // calendar fallback remains valid. Other database failures must surface.
    if (pricingError && pricingError.code !== 'PGRST116') {
      throw new Error(`Failed to fetch property pricing: ${pricingError.message}`)
    }

    const basePrice = Number(pricing?.base_price) || 0
    const weekendPrice = Number(pricing?.weekend_price) || null

    // Base price applies to every night in the selected calendar month.
    // Weekend pricing follows reservation-validator: Friday and Saturday.
    if (basePrice > 0) {
      for (const day of eachDayOfInterval({ start: rangeStart, end: rangeEnd })) {
        const isWeekend = day.getDay() === 5 || day.getDay() === 6
        pricesMap.set(
          format(day, 'yyyy-MM-dd'),
          isWeekend && weekendPrice ? weekendPrice : basePrice
        )
      }
    }

    // Step 1: Get all pricing_rules for this property (base layer)
    const { data: rules, error: rulesError } = await admin
      .from('pricing_rules')
      .select('start_date, end_date, price_per_night')
      .eq('property_id', propertyId)
      .lte('start_date', format(rangeEnd, 'yyyy-MM-dd'))
      .gte('end_date', format(rangeStart, 'yyyy-MM-dd'))
      .order('start_date', { ascending: true })

    if (rulesError) {
      console.error('[daily-prices] Error fetching pricing_rules:', rulesError)
    }

    // Build base prices from pricing_rules
    if (rules && rules.length > 0) {
      for (const rule of rules) {
        const startDate = parseLocalDate(rule.start_date)
        const endDate = parseLocalDate(rule.end_date)
        const daysInRange = eachDayOfInterval({
          start: startDate < rangeStart ? rangeStart : startDate,
          end: endDate > rangeEnd ? rangeEnd : endDate,
        })

        for (const day of daysInRange) {
          const dateStr = format(day, 'yyyy-MM-dd')
          pricesMap.set(dateStr, rule.price_per_night)
        }
      }
    }

    // Weekend pricing is the property-level fallback used by reservations.
    // Apply it after period rules so the calendar and reservation fallback
    // show the same Friday/Saturday price. Explicit daily prices still win.
    if (weekendPrice) {
      for (const day of eachDayOfInterval({ start: rangeStart, end: rangeEnd })) {
        if (day.getDay() === 5 || day.getDay() === 6) {
          pricesMap.set(format(day, 'yyyy-MM-dd'), weekendPrice)
        }
      }
    }

    // Step 2: Get daily_prices overrides (overlay on top of weekend pricing)
    const { data: dailyPricesRaw, error: dailyError } = await admin
      .from('daily_prices')
      .select('date, base_price')
      .eq('property_id', propertyId)
      .gte('date', format(rangeStart, 'yyyy-MM-dd'))
      .lte('date', format(rangeEnd, 'yyyy-MM-dd'))

    if (dailyError) {
      // Handle missing table gracefully (continue with just pricing_rules)
      if (!(dailyError.code === '42P01' || dailyError.message?.includes('does not exist'))) {
        console.error('[daily-prices] Error fetching daily_prices:', dailyError)
      }
    } else if (dailyPricesRaw) {
      // Override with daily prices
      for (const daily of dailyPricesRaw) {
        const dateStr = format(parseLocalDate(daily.date), 'yyyy-MM-dd')
        pricesMap.set(dateStr, daily.base_price)
      }
    }

    // Rules and daily overrides already sit above the base/weekend fallback.
    const dailyPrices = Array.from(pricesMap.entries()).map(([date, base_price]) => {
      return {
        date,
        base_price,
        weekend_price: weekendPrice,
        final_price: base_price,
      }
    })

    return NextResponse.json(dailyPrices)
  } catch (error) {
    console.error('[daily-prices] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Server error: ${errorMessage}` },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: propertyId } = await params

  try {
    const access = await authorizePropertyManagement(propertyId)
    if (!access.authorized) return access.response!
    const { admin, property } = access

    const body = (await request.json()) as { date?: string; price?: number }
    if (!body.date || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
      return NextResponse.json({ error: 'Invalid date format (YYYY-MM-DD)' }, { status: 422 })
    }

    if (typeof body.price !== 'number' || !Number.isFinite(body.price) || body.price < 0) {
      return NextResponse.json({ error: 'Price must be a non-negative number' }, { status: 422 })
    }

    const { data, error } = await admin
      .from('daily_prices')
      .upsert(
        {
          property_id: propertyId,
          date: body.date,
          base_price: body.price,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'property_id,date' }
      )
      .select('id, property_id, date, base_price, created_at, updated_at')
      .single()

    if (error) throw error

    revalidatePath(`/p/${property.slug}`)
    revalidatePath(`/p/${property.slug}/checkout`)
    revalidatePath('/booking')

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        property_id: data.property_id,
        date: data.date,
        price: data.base_price,
        created_at: data.created_at,
        updated_at: data.updated_at,
      },
    })
  } catch (error) {
    console.error('[daily-prices] POST error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Server error: ${errorMessage}` }, { status: 500 })
  }
}
