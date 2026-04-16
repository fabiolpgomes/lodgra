import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rateLimit'
import { eachDayOfInterval, format, parseISO, startOfDay, endOfMonth, startOfMonth } from 'date-fns'

// GET /api/public/properties/[slug]/availability?year=YYYY&month=MM
// Public — no auth required
// Returns blocked dates for the given month

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const ip = getClientIp(request)

  // Rate limit: 50 req/min per IP
  const allowed = checkRateLimit('public:availability', ip, 50, 60 * 1000)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Muitas requisições. Tente novamente.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    )
  }

  const { searchParams } = request.nextUrl
  const yearParam = searchParams.get('year')
  const monthParam = searchParams.get('month')

  const year = yearParam ? parseInt(yearParam) : new Date().getFullYear()
  const month = monthParam ? parseInt(monthParam) - 1 : new Date().getMonth() // 0-indexed

  if (isNaN(year) || isNaN(month) || month < 0 || month > 11) {
    return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
  }

  const supabase = await createClient()

  // Fetch property by slug (public only)
  const { data: property } = await supabase
    .from('properties')
    .select('id, base_price, min_nights')
    .eq('slug', slug)
    .eq('is_public', true)
    .single()

  if (!property) {
    return NextResponse.json({ error: 'Propriedade não encontrada' }, { status: 404 })
  }

  // Determine month range
  const monthStart = startOfMonth(new Date(year, month, 1))
  const monthEnd = endOfMonth(monthStart)

  const rangeStart = format(monthStart, 'yyyy-MM-dd')
  const rangeEnd = format(monthEnd, 'yyyy-MM-dd')

  // Fetch active reservations overlapping this month via property_listings
  // Use admin client to bypass RLS (property_listings has RLS that blocks public access)
  const adminClient = createAdminClient()
  const { data: listings } = await adminClient
    .from('property_listings')
    .select('id')
    .eq('property_id', property.id)

  const listingIds = (listings ?? []).map((l) => l.id)

  const blockedDates = new Set<string>()
  let reservations: Array<{ check_in: string; check_out: string; status: string }> = []

  if (listingIds.length > 0) {
    const { data: reservationsData } = await adminClient
      .from('reservations')
      .select('check_in, check_out, status')
      .in('property_listing_id', listingIds)
      .in('status', ['confirmed', 'pending_payment'])
      .lte('check_in', rangeEnd)
      .gte('check_out', rangeStart)

    reservations = reservationsData ?? []

    for (const r of reservations) {
      const start = parseISO(r.check_in)
      const end = parseISO(r.check_out)
      // Blocked: check_in inclusive, check_out exclusive (checkout day is free)
      const days = eachDayOfInterval({ start, end: new Date(end.getTime() - 86400000) })
      for (const d of days) {
        blockedDates.add(format(d, 'yyyy-MM-dd'))
      }
    }
  }

  // Always block past dates
  const today = startOfDay(new Date())
  const allMonthDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
  for (const d of allMonthDays) {
    if (d < today) {
      blockedDates.add(format(d, 'yyyy-MM-dd'))
    }
  }

  // Calculate effective minimum nights: max of property's min_nights and any applicable pricing rules
  const { data: pricingRules } = await adminClient
    .from('pricing_rules')
    .select('min_nights')
    .eq('property_id', property.id)
    .lte('start_date', rangeEnd)
    .gte('end_date', rangeStart)

  const propertyMinNights = property.min_nights ?? 1
  const rules = pricingRules ?? []
  const maxRuleMinNights = rules.length > 0
    ? Math.max(...rules.map(r => r.min_nights))
    : 0

  const minNights = Math.max(propertyMinNights, maxRuleMinNights)

  const blocked = Array.from(blockedDates).sort()

  return NextResponse.json({
    blocked,
    base_price: property.base_price ?? 0,
    min_nights: minNights,
  })
}
