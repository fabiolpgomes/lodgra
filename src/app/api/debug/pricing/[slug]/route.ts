/**
 * DEBUG endpoint - Remove in production
 * GET /api/debug/pricing/[slug]?checkin=2026-09-07&checkout=2026-09-09
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseISO, eachDayOfInterval, format } from 'date-fns'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const { searchParams } = new URL(request.url)
  const checkinStr = searchParams.get('checkin')
  const checkoutStr = searchParams.get('checkout')

  if (!checkinStr || !checkoutStr) {
    return NextResponse.json({ error: 'checkin and checkout required' }, { status: 400 })
  }

  const checkIn = parseISO(checkinStr)
  const checkOut = parseISO(checkoutStr)
  const supabase = createAdminClient()

  // Get property
  const { data: property } = await supabase
    .from('properties')
    .select('id, name, base_price, slug')
    .eq('slug', slug)
    .single()

  if (!property) {
    return NextResponse.json({ error: 'Property not found' }, { status: 404 })
  }

  const checkInStr = format(checkIn, 'yyyy-MM-dd')
  const checkOutStr = format(checkOut, 'yyyy-MM-dd')

  // Fetch pricing_rules
  const { data: pricingRulesRaw } = await supabase
    .from('pricing_rules')
    .select('start_date, end_date, price_per_night, name')
    .eq('property_id', property.id)
    .gte('end_date', checkInStr)
    .lte('start_date', checkOutStr)

  // Fetch daily_prices
  const { data: dailyPricesRaw } = await supabase
    .from('daily_prices')
    .select('date, base_price')
    .eq('property_id', property.id)
    .gte('date', checkInStr)
    .lt('date', checkOutStr)

  // Build daily prices map
  const dailyPrices = new Map<string, number>()

  // Layer 1: pricing_rules
  if (pricingRulesRaw) {
    for (const rule of pricingRulesRaw) {
      const startDate = new Date(rule.start_date)
      const endDate = new Date(rule.end_date)
      const daysInRule = eachDayOfInterval({ start: startDate, end: endDate })

      for (const day of daysInRule) {
        const dateStr = format(day, 'yyyy-MM-dd')
        dailyPrices.set(dateStr, rule.price_per_night)
      }
    }
  }

  // Layer 2: daily_prices (overrides)
  if (dailyPricesRaw) {
    for (const daily of dailyPricesRaw) {
      const dateStr = format(new Date(daily.date), 'yyyy-MM-dd')
      dailyPrices.set(dateStr, daily.base_price)
    }
  }

  // Calculate total
  const daysInRange = eachDayOfInterval({ start: checkIn, end: new Date(checkOut.getTime() - 86400000) })
  let total = 0
  const breakdown: Array<{ date: string; price: number }> = []

  for (const day of daysInRange) {
    const dateStr = format(day, 'yyyy-MM-dd')
    const price = dailyPrices.get(dateStr) ?? 0
    breakdown.push({ date: dateStr, price })
    total += price
  }

  return NextResponse.json({
    property: {
      id: property.id,
      name: property.name,
      slug: property.slug,
      base_price: property.base_price,
    },
    request: {
      checkIn: checkInStr,
      checkOut: checkOutStr,
      nights: daysInRange.length,
    },
    pricingRules: pricingRulesRaw || [],
    dailyPricesInRange: dailyPricesRaw || [],
    calculation: {
      breakdown,
      total,
      averagePerNight: daysInRange.length > 0 ? total / daysInRange.length : 0,
    },
  })
}
