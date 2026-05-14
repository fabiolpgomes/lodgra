import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPriceForRangePublic } from '@/lib/pricing/getPriceForRange'
import { convertPricingResult } from '@/lib/pricing/convertPricing'
import { checkRateLimit } from '@/lib/rateLimit'
import { isSupportedCurrency, type SupportedCurrency } from '@/lib/currency/config'
import { parseISO, isValid, differenceInDays } from 'date-fns'
import type { PricingResult } from '@/lib/pricing/convertPricing'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const ip = request.headers.get('x-forwarded-for') ?? 'anonymous'
  const allowed = checkRateLimit('pricing', ip, 30, 60 * 1000)
  if (!allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { slug } = await params
  const { searchParams } = new URL(request.url)
  const checkinStr = searchParams.get('checkin')
  const checkoutStr = searchParams.get('checkout')
  const currencyParam = searchParams.get('currency')
  const cleaningFeeStr = searchParams.get('cleaningFee')
  const cleaningFeeTypeStr = searchParams.get('cleaningFeeType')
  const petFeeStr = searchParams.get('petFee')
  const petFeeTypeStr = searchParams.get('petFeeType')

  if (!checkinStr || !checkoutStr) {
    return NextResponse.json({ error: 'checkin and checkout are required' }, { status: 400 })
  }

  const checkIn = parseISO(checkinStr)
  const checkOut = parseISO(checkoutStr)

  if (!isValid(checkIn) || !isValid(checkOut) || differenceInDays(checkOut, checkIn) < 1) {
    return NextResponse.json({ error: 'Invalid date range' }, { status: 400 })
  }

  // Validate and parse currency parameter (defaults to EUR)
  const targetCurrency = (currencyParam && isSupportedCurrency(currencyParam)) ? currencyParam : 'EUR'

  // Parse fees
  const cleaningFee = cleaningFeeStr ? parseFloat(cleaningFeeStr) : 0
  const petFee = petFeeStr ? parseFloat(petFeeStr) : 0
  const nights = differenceInDays(checkOut, checkIn)

  const supabase = createAdminClient()

  const { data: property } = await supabase
    .from('properties')
    .select('id')
    .eq('slug', slug)
    .eq('is_public', true)
    .single()

  if (!property) {
    return NextResponse.json({ error: 'Property not found' }, { status: 404 })
  }

  try {
    const result = await getPriceForRangePublic(property.id, checkIn, checkOut)

    // Convert pricing to requested currency
    const convertedResult = await convertPricingResult(result as PricingResult, targetCurrency as SupportedCurrency)

    // Build fees array
    const fees: { label: string; amount: number }[] = []
    if (cleaningFee > 0) {
      const amount = cleaningFeeTypeStr === 'per_night' ? cleaningFee * nights : cleaningFee
      fees.push({ label: 'Taxa de limpeza', amount })
    }
    if (petFee > 0) {
      const amount = petFeeTypeStr === 'per_night' ? petFee * nights : petFee
      fees.push({ label: 'Taxa de animais', amount })
    }

    const feesTotal = fees.reduce((sum, f) => sum + f.amount, 0)

    // Add fees to the total
    const finalResult = {
      ...convertedResult,
      accommodationTotal: convertedResult.total || 0,
      fees,
      total: (convertedResult.total || 0) + feesTotal,
    }

    return NextResponse.json(finalResult)
  } catch (err) {
    console.error('[pricing] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
