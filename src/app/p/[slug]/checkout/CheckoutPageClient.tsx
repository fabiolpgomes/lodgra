'use client'

import { useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { differenceInDays, isBefore, isValid, parseISO, startOfDay } from 'date-fns'
import { CheckoutForm } from '@/components/common/public/CheckoutForm'
import { usePropertyPriceQuote } from '@/hooks/usePropertyPriceQuote'

type FeeConfig = {
  cleaningFee: number | null
  cleaningFeeType: string | null
  petFee: number | null
  petFeeType: string | null
}

type CancellationPolicy = {
  id?: string
  policy_type: string
  full_refund_days: number
  partial_refund_days?: number | null
  partial_refund_percent?: number | null
}

interface CheckoutPageClientProps {
  propertyId: string
  slug: string
  propertyName: string
  city?: string | null
  currency?: string | null
  maxGuests?: number | null
  cancellationPolicy?: CancellationPolicy | null
  feeConfig: FeeConfig
}

export function CheckoutPageClient({
  propertyId,
  slug,
  propertyName,
  city,
  currency = 'EUR',
  maxGuests,
  cancellationPolicy,
  feeConfig,
}: CheckoutPageClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const checkin = searchParams.get('checkin') ?? searchParams.get('checkIn')
  const checkout = searchParams.get('checkout') ?? searchParams.get('checkOut')
  const guests = Math.max(1, parseInt(searchParams.get('guests') ?? '1', 10) || 1)
  const { quote, loading: pricingLoading, error: pricingQuoteError } = usePropertyPriceQuote(
    propertyId,
    checkin ?? undefined,
    checkout ?? undefined
  )

  const feeItems = useMemo(() => {
    if (!quote) return []

    const nights = quote.breakdown.length
    const items: { label: string; amount: number }[] = []
    if (feeConfig.cleaningFee != null && feeConfig.cleaningFee > 0) {
      items.push({
        label: 'Taxa de limpeza',
        amount: feeConfig.cleaningFeeType === 'per_night' ? feeConfig.cleaningFee * nights : feeConfig.cleaningFee,
      })
    }
    if (feeConfig.petFee != null && feeConfig.petFee > 0) {
      items.push({
        label: 'Taxa de animais',
        amount: feeConfig.petFeeType === 'per_night' ? feeConfig.petFee * nights : feeConfig.petFee,
      })
    }
    return items
  }, [feeConfig.cleaningFee, feeConfig.cleaningFeeType, feeConfig.petFee, feeConfig.petFeeType, quote])

  useEffect(() => {
    if (!checkin || !checkout) {
      router.replace(`/p/${slug}`)
      return
    }

    const checkinDate = parseISO(checkin)
    const checkoutDate = parseISO(checkout)
    const today = startOfDay(new Date())

    if (
      !isValid(checkinDate) ||
      !isValid(checkoutDate) ||
      isBefore(checkinDate, today) ||
      differenceInDays(checkoutDate, checkinDate) < 1
    ) {
      router.replace(`/p/${slug}`)
      return
    }

    if (maxGuests && guests > maxGuests) {
      router.replace(`/p/${slug}?checkIn=${checkin}&checkOut=${checkout}&guests=${maxGuests}`)
      return
    }
  }, [checkin, checkout, guests, maxGuests, router, slug])

  if (pricingQuoteError && !quote) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        {pricingQuoteError}
      </div>
    )
  }

  if (!quote || !checkin || !checkout) {
    return (
      <div className="rounded-2xl border border-brand-gold/15 bg-brand-white p-5 text-sm text-brand-text-medium shadow-sm">
        A carregar checkout...
      </div>
    )
  }

  const feeTotal = feeItems.reduce((sum, fee) => sum + fee.amount, 0)
  const totalPrice = quote.finalTotal + feeTotal

  return (
    <CheckoutForm
      slug={slug}
      propertyName={propertyName}
      city={city}
      checkin={checkin}
      checkout={checkout}
      guests={guests}
      totalPrice={totalPrice}
      accommodationTotal={quote.baseTotal}
      fees={feeItems}
      currency={currency}
      cancellationPolicy={cancellationPolicy}
      pricingQuote={quote}
      pricingLoading={pricingLoading}
      pricingError={pricingQuoteError}
    />
  )
}
