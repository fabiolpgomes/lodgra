'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { differenceInDays, isBefore, isValid, parseISO, startOfDay } from 'date-fns'
import { CheckoutForm } from '@/components/common/public/CheckoutForm'

type FeeConfig = {
  cleaningFee: number | null
  cleaningFeeType: string | null
  petFee: number | null
  petFeeType: string | null
}

interface CheckoutPageClientProps {
  slug: string
  propertyName: string
  city?: string | null
  currency?: string | null
  maxGuests?: number | null
  feeConfig: FeeConfig
}

type PricingResult = {
  total: number
  accommodationTotal?: number
  fees?: { label: string; amount: number }[]
}

export function CheckoutPageClient({
  slug,
  propertyName,
  city,
  currency = 'EUR',
  maxGuests,
  feeConfig,
}: CheckoutPageClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pricing, setPricing] = useState<PricingResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const checkin = searchParams.get('checkin') ?? searchParams.get('checkIn')
  const checkout = searchParams.get('checkout') ?? searchParams.get('checkOut')
  const guests = Math.max(1, parseInt(searchParams.get('guests') ?? '1', 10) || 1)

  const feeQuery = useMemo(() => {
    const params = new URLSearchParams()
    if (feeConfig.cleaningFee != null) params.set('cleaningFee', String(feeConfig.cleaningFee))
    if (feeConfig.cleaningFeeType) params.set('cleaningFeeType', feeConfig.cleaningFeeType)
    if (feeConfig.petFee != null) params.set('petFee', String(feeConfig.petFee))
    if (feeConfig.petFeeType) params.set('petFeeType', feeConfig.petFeeType)
    return params
  }, [feeConfig.cleaningFee, feeConfig.cleaningFeeType, feeConfig.petFee, feeConfig.petFeeType])

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

    const controller = new AbortController()
    setError(null)
    setPricing(null)

    const params = new URLSearchParams({
      checkin,
      checkout,
      ...Object.fromEntries(feeQuery.entries()),
    })

    fetch(`/api/public/properties/${slug}/pricing?${params.toString()}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = await res.json().catch(() => null)
        if (!res.ok) {
          throw new Error(data?.error || 'Erro ao calcular o preço')
        }
        return data as PricingResult
      })
      .then((data) => setPricing(data))
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          const message = err instanceof Error ? err.message : 'Erro ao calcular o preço'
          setError(message)
        }
      })

    return () => controller.abort()
  }, [checkin, checkout, guests, feeQuery, maxGuests, router, slug])

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    )
  }

  if (!pricing || !checkin || !checkout) {
    return (
      <div className="rounded-2xl border border-brand-gold/15 bg-brand-white p-5 text-sm text-brand-text-medium shadow-sm">
        A carregar checkout...
      </div>
    )
  }

  const fees = pricing.fees ?? []
  const totalPrice = pricing.total

  return (
    <CheckoutForm
      slug={slug}
      propertyName={propertyName}
      city={city}
      checkin={checkin}
      checkout={checkout}
      guests={guests}
      totalPrice={totalPrice}
      accommodationTotal={pricing.accommodationTotal ?? totalPrice}
      fees={fees}
      currency={currency}
    />
  )
}
