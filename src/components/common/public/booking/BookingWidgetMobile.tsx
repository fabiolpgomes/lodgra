'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import { differenceInDays, parseISO, isValid, addDays, format, startOfDay, isBefore } from 'date-fns'
import { usePropertyPriceQuote } from '@/hooks/usePropertyPriceQuote'
import { PriceBreakdownCard } from './PriceBreakdownCard'
import { formatCurrency, type CurrencyCode } from '@/lib/utils/currency'

interface PricingRule {
  start_date: string
  end_date: string
  min_nights: number
}

interface BlockedRange {
  start: string
  end: string
}

interface BookingWidgetMobileProps {
  propertyId: string
  propertyName: string
  basePrice: number
  currency: CurrencyCode
  slug: string
  initialCheckIn?: string
  initialCheckOut?: string
  initialGuests?: number
  minNights?: number
  maxGuests?: number
  pricingRules?: PricingRule[]
  blockedRanges?: BlockedRange[]
  cleaningFee?: number | null
  cleaningFeeType?: string | null
  petFee?: number | null
  petFeeType?: string | null
  externalCheckIn?: string
  externalCheckOut?: string
}

function isDateBlocked(date: string, ranges: BlockedRange[]): boolean {
  return ranges.some(r => date >= r.start && date < r.end)
}

function isRangeOverlapping(ci: string, co: string, ranges: BlockedRange[]): boolean {
  return ranges.some(r => ci < r.end && co > r.start)
}

export function BookingWidgetMobile({
  propertyId,
  basePrice,
  currency,
  slug,
  initialCheckIn,
  initialCheckOut,
  initialGuests = 1,
  minNights = 1,
  maxGuests = 10,
  pricingRules = [],
  blockedRanges = [],
  cleaningFee,
  cleaningFeeType,
  petFee,
  petFeeType,
  externalCheckIn,
  externalCheckOut,
}: BookingWidgetMobileProps) {
  const [showPanel, setShowPanel] = useState(false)
  const [checkIn, setCheckIn] = useState(initialCheckIn || '')
  const [checkOut, setCheckOut] = useState(initialCheckOut || '')
  const mountedRef = useRef(false)
  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return }
    if (externalCheckIn !== undefined) {
      setCheckIn(externalCheckIn)
      if (externalCheckIn) setShowPanel(true) // open panel when calendar sets a date
    }
  }, [externalCheckIn])
  useEffect(() => {
    if (externalCheckOut !== undefined) setCheckOut(externalCheckOut)
  }, [externalCheckOut])
  const [guests, setGuests] = useState(Math.min(initialGuests, Math.max(1, maxGuests)))
  const [checkInError, setCheckInError] = useState('')
  const [checkOutError, setCheckOutError] = useState('')
  const { quote, loading: isPriceFetching, error: priceError } = usePropertyPriceQuote(
    propertyId,
    checkIn,
    checkOut
  )

  const today = format(startOfDay(new Date()), 'yyyy-MM-dd')

  // Effective min nights: max of property base and any pricing rule covering the selected check-in date
  const effectiveMinNights = useMemo(() => {
    if (!checkIn || !pricingRules.length) return minNights
    const applicable = pricingRules.filter(r => r.start_date <= checkIn && r.end_date >= checkIn)
    return applicable.length > 0
      ? Math.max(minNights, ...applicable.map(r => r.min_nights))
      : minNights
  }, [checkIn, pricingRules, minNights])

  const minCheckOut = useMemo(() => {
    if (!checkIn) return ''
    return format(addDays(parseISO(checkIn), Math.max(1, effectiveMinNights)), 'yyyy-MM-dd')
  }, [checkIn, effectiveMinNights])

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0
    const d1 = parseISO(checkIn)
    const d2 = parseISO(checkOut)
    if (!isValid(d1) || !isValid(d2)) return 0
    return Math.max(0, differenceInDays(d2, d1))
  }, [checkIn, checkOut])

  useEffect(() => {
    if (!checkIn) {
      setCheckInError('')
      setCheckOutError('')
      return
    }

    setCheckInError(isDateBlocked(checkIn, blockedRanges) ? 'Data indisponível' : '')

    if (!checkOut) {
      setCheckOutError('')
      return
    }

    try {
      const selectedNights = differenceInDays(parseISO(checkOut), parseISO(checkIn))
      if (selectedNights < effectiveMinNights) {
        setCheckOutError(
          effectiveMinNights === 1
            ? 'Check-out deve ser no mínimo 1 dia após check-in'
            : `Esta propriedade exige estadia mínima de ${effectiveMinNights} noites`
        )
      } else if (selectedNights > 90) {
        setCheckOutError('Estadia máxima permitida: 90 noites')
      } else if (isRangeOverlapping(checkIn, checkOut, blockedRanges)) {
        setCheckOutError('Período contém datas reservadas')
      } else {
        setCheckOutError('')
      }
    } catch {
      setCheckOutError('Data inválida')
    }
  }, [blockedRanges, checkIn, checkOut, effectiveMinNights])

  const isReady = !!quote
  const feeItems = useMemo(() => {
    const items: { label: string; amount: number }[] = []
    if (cleaningFee != null && cleaningFee > 0) {
      items.push({
        label: 'Taxa de limpeza',
        amount: cleaningFeeType === 'per_night' ? cleaningFee * nights : cleaningFee,
      })
    }
    if (petFee != null && petFee > 0) {
      items.push({
        label: 'Taxa de animais',
        amount: petFeeType === 'per_night' ? petFee * nights : petFee,
      })
    }
    return items
  }, [cleaningFee, cleaningFeeType, nights, petFee, petFeeType])
  const feeTotal = feeItems.reduce((sum, fee) => sum + fee.amount, 0)
  const displayTotal = (quote?.finalTotal ?? nights * basePrice) + feeTotal
  const accommodationTotal = quote?.baseTotal ?? (quote?.finalTotal ?? nights * basePrice)
  const hasVaryingPrices = quote?.breakdown && quote.breakdown.length > 1
    && quote.breakdown.some(b => b.price !== quote.breakdown![0].price)
  const avgPerNight = nights > 0 ? Math.round(accommodationTotal / nights) : basePrice

  const checkoutHref = useMemo(() => {
    if (!checkIn || !checkOut || nights < 1 || nights < effectiveMinNights) return null

    // Ensure dates are in YYYY-MM-DD format for API
    const normalizeCheckoutDate = (date: string) => {
      if (date.includes('/')) {
        const [day, month, year] = date.split('/')
        if (day && month && year) {
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
        }
      }
      return date // Already in correct format or invalid - pass as-is
    }

    const normalizedCheckIn = normalizeCheckoutDate(checkIn)
    const normalizedCheckOut = normalizeCheckoutDate(checkOut)

    return `/p/${slug}/checkout?checkin=${normalizedCheckIn}&checkout=${normalizedCheckOut}&guests=${guests}`
  }, [slug, checkIn, checkOut, guests, nights, effectiveMinNights])

  const handleCheckInChange = (val: string) => {
    // Handle both YYYY-MM-DD (HTML5 date input) and DD/MM/YYYY (user input)
    let normalizedVal = val
    if (val && val.includes('/')) {
      // Convert DD/MM/YYYY to YYYY-MM-DD
      const [day, month, year] = val.split('/')
      if (day && month && year) {
        normalizedVal = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      }
    }

    setCheckIn(normalizedVal)
    if (normalizedVal && isDateBlocked(normalizedVal, blockedRanges)) {
      setCheckInError('Data indisponível')
    } else {
      setCheckInError('')
    }
    if (checkOut && normalizedVal) {
      try {
        const newMin = addDays(parseISO(normalizedVal), Math.max(1, effectiveMinNights))
        if (isBefore(parseISO(checkOut), newMin)) {
          setCheckOut('')
          setCheckOutError('')
        }
      } catch {
        setCheckInError('Data inválida')
      }
    }
  }

  const handleCheckOutChange = (val: string) => {
    // Handle both YYYY-MM-DD (HTML5 date input) and DD/MM/YYYY (user input)
    let normalizedVal = val
    if (val && val.includes('/')) {
      // Convert DD/MM/YYYY to YYYY-MM-DD
      const [day, month, year] = val.split('/')
      if (day && month && year) {
        normalizedVal = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      }
    }

    setCheckOut(normalizedVal)
    if (normalizedVal && checkIn) {
      try {
        const n = differenceInDays(parseISO(normalizedVal), parseISO(checkIn))
        if (n < effectiveMinNights) {
          setCheckOutError(
            effectiveMinNights === 1
              ? 'Check-out deve ser mínimo 1 dia após check-in'
              : `Estadia mínima: ${effectiveMinNights} noites`
          )
        } else if (isRangeOverlapping(checkIn, normalizedVal, blockedRanges)) {
          setCheckOutError('Período contém datas reservadas')
        } else {
          setCheckOutError('')
        }
      } catch {
        setCheckOutError('Data inválida')
      }
    } else {
      setCheckOutError('')
    }
  }

  return (
    <div className="lg:hidden block mb-20">
      {/* Mobile Widget - Sticky card positioned before footer */}
      <div className="bg-brand-white border border-brand-gold/20 rounded-2xl p-5 mx-4 my-6 shadow-[0_18px_42px_rgba(16,32,62,0.10)]">
        {/* Price Header */}
        <div className="mb-4">
          <p className="text-sm text-brand-text-medium">
            {nights > 0 && isReady ? (hasVaryingPrices ? 'Preço médio' : 'Preço por noite') : 'Preço base'}
          </p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[32px] font-black text-brand-blue">
              {formatCurrency(nights > 0 && isReady ? avgPerNight : basePrice, currency)}
            </span>
            <span className="text-[14px] font-medium text-brand-text-medium">/noite</span>
          </div>
          {effectiveMinNights > 1 && (
            <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 inline-block">
              Mínimo {effectiveMinNights} noites
            </p>
          )}
        </div>

        {/* Dates Section */}
        <div className="mb-4 border border-brand-gold/20 rounded-xl overflow-hidden">
          <p className="px-4 pt-3 pb-1 text-[12px] font-bold text-brand-text-dark bg-brand-bg border-b border-brand-gold/15">
            Seleccione as datas para ver o preço exacto
          </p>
          <div className="grid grid-cols-2">
            <div className="px-4 py-3 border-r border-brand-gold/15">
              <label className="block text-[11px] font-bold text-brand-text-medium uppercase tracking-wide mb-1">Check-in</label>
              <input
                type="date"
                value={checkIn}
                min={today}
                onChange={e => handleCheckInChange(e.target.value)}
                className="w-full text-sm text-brand-text-dark bg-transparent focus:outline-none"
              />
              {checkInError && <p className="mt-1 text-[11px] text-red-600">{checkInError}</p>}
            </div>
            <div className="px-4 py-3">
              <label className="block text-[11px] font-bold text-brand-text-medium uppercase tracking-wide mb-1">Check-out</label>
              <input
                type="date"
                value={checkOut}
                min={minCheckOut || today}
                onChange={e => handleCheckOutChange(e.target.value)}
                disabled={!checkIn}
                className="w-full text-sm text-brand-text-dark bg-transparent focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
              />
              {checkOutError && <p className="mt-1 text-[11px] text-red-600">{checkOutError}</p>}
            </div>
          </div>
        </div>

        {/* Guests */}
        <div className="mb-4 border border-brand-gold/20 rounded-xl px-4 py-3">
          <label className="block text-[11px] font-bold text-brand-text-medium uppercase tracking-wide mb-1">Hóspedes</label>
          <select
            value={guests}
            onChange={e => setGuests(parseInt(e.target.value))}
            className="w-full text-sm text-brand-text-dark bg-transparent focus:outline-none appearance-none cursor-pointer"
          >
            {Array.from({ length: Math.max(1, maxGuests) }, (_, i) => (
              <option key={i + 1} value={i + 1}>{i + 1} {i === 0 ? 'hóspede' : 'hóspedes'}</option>
            ))}
          </select>
        </div>

        {/* Price summary */}
        {nights > 0 && (
          <div className="mb-4 space-y-3">
            <div className="p-3 bg-brand-bg rounded-xl text-sm space-y-1.5">
              {isPriceFetching && !quote ? (
                <div className="flex justify-between text-gray-400 animate-pulse">
                  <span>{nights} noite{nights !== 1 ? 's' : ''}</span>
                  <span className="bg-gray-200 rounded w-16">&nbsp;</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-brand-text-medium">
                    {hasVaryingPrices
                      ? <span>{nights} noite{nights !== 1 ? 's' : ''} · por época</span>
                      : <span>{formatCurrency(avgPerNight, currency)} × {nights} noite{nights !== 1 ? 's' : ''}</span>
                    }
                    <span>{formatCurrency(Math.round(accommodationTotal), currency)}</span>
                  </div>
                  {feeItems.map((fee) => (
                    <div key={fee.label} className="flex justify-between text-brand-text-medium">
                      <span>{fee.label}</span>
                      <span>{formatCurrency(Math.round(fee.amount), currency)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold text-brand-text-dark pt-1.5 border-t border-brand-gold/15">
                    <span>Total</span>
                    <span>{formatCurrency(Math.round(displayTotal), currency)}</span>
                  </div>
                </>
              )}
            </div>

            <PriceBreakdownCard
              quote={quote}
              currency={currency}
              loading={isPriceFetching}
              error={priceError}
              compact
            />
          </div>
        )}

        {/* CTA Button */}
        {checkoutHref && !checkInError && !checkOutError ? (
          <Link
            href={checkoutHref}
            className="booking-widget-btn-active block w-full text-center transition-all mb-3"
          >
            Reservar agora
          </Link>
        ) : (
          <button
            disabled
            className="booking-widget-btn-disabled block w-full text-center mb-3"
          >
            {checkInError || checkOutError
              ? checkOutError || checkInError
              : nights > 0 && nights < effectiveMinNights
              ? `Estadia mínima de ${effectiveMinNights} noites`
              : 'Seleccione as datas'}
          </button>
        )}

        {/* Trust badges */}
        <div className="space-y-1.5 text-[13px] text-brand-text-medium">
          <p className="flex items-center gap-2"><span className="text-emerald-700 font-bold">✓</span>Sem comissões</p>
          <p className="flex items-center gap-2"><span className="text-emerald-700 font-bold">✓</span>Pagamento seguro</p>
          <p className="flex items-center gap-2"><span className="text-emerald-700 font-bold">✓</span>Confirmação instantânea</p>
        </div>
      </div>
    </div>
  )
}
