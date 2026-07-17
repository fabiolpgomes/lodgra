'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import { differenceInDays, parseISO, isValid, isBefore, startOfDay, addDays, format } from 'date-fns'

interface PricingRule {
  start_date: string
  end_date: string
  min_nights: number
}

type PriceState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; total: number; accommodationTotal?: number; fees?: { label: string; amount: number }[]; breakdown?: { date: string; price: number }[] }

interface BlockedRange {
  start: string
  end: string
}

interface BookingWidgetDesktopProps {
  propertyName: string
  basePrice: number
  currency: string
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
  /** Controlled from outside (e.g. availability calendar) */
  externalCheckIn?: string
  externalCheckOut?: string
  onCheckInChange?: (v: string) => void
  onCheckOutChange?: (v: string) => void
}

function isDateBlocked(date: string, ranges: BlockedRange[]): boolean {
  return ranges.some(r => date >= r.start && date < r.end)
}

function isRangeOverlapping(ci: string, co: string, ranges: BlockedRange[]): boolean {
  return ranges.some(r => ci < r.end && co > r.start)
}

export function BookingWidgetDesktop({
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
  onCheckInChange,
  onCheckOutChange,
}: BookingWidgetDesktopProps) {
  const [checkIn, setCheckIn] = useState(initialCheckIn || '')
  const [checkOut, setCheckOut] = useState(initialCheckOut || '')

  // Sync from calendar — ignore initial mount
  const mountedRef = useRef(false)
  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return }
    if (externalCheckIn !== undefined) setCheckIn(externalCheckIn)
  }, [externalCheckIn])
  useEffect(() => {
    if (externalCheckOut !== undefined) setCheckOut(externalCheckOut)
  }, [externalCheckOut])
  const [guests, setGuests] = useState(Math.min(initialGuests, Math.max(1, maxGuests)))
  const [checkInError, setCheckInError] = useState('')
  const [checkOutError, setCheckOutError] = useState('')
  const [priceState, setPriceState] = useState<PriceState>({ status: 'idle' })

  const currencySymbols: Record<string, string> = { BRL: 'R$', EUR: '€', USD: '$' }
  const symbol = currencySymbols[currency] || currency

  const today = format(startOfDay(new Date()), 'yyyy-MM-dd')

  // Effective min nights: max of property base and any pricing rule covering the selected check-in date
  const effectiveMinNights = useMemo(() => {
    if (!checkIn || !pricingRules.length) return minNights
    const applicable = pricingRules.filter(r => r.start_date <= checkIn && r.end_date >= checkIn)
    return applicable.length > 0
      ? Math.max(minNights, ...applicable.map(r => r.min_nights))
      : minNights
  }, [checkIn, pricingRules, minNights])

  // Minimum checkout = checkin + effectiveMinNights (at least 1)
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

  // Fetch real price from pricing rules API when dates are selected
  const fetchKey = checkIn && checkOut && nights >= 1 ? `${checkIn}|${checkOut}` : null

  useEffect(() => {
    if (!fetchKey) return
    let cancelled = false
    setPriceState({ status: 'loading' })
    const params = new URLSearchParams({
      checkin: checkIn,
      checkout: checkOut,
      ...(cleaningFee !== undefined && cleaningFee !== null && { cleaningFee: cleaningFee.toString() }),
      ...(cleaningFeeType && { cleaningFeeType }),
      ...(petFee !== undefined && petFee !== null && { petFee: petFee.toString() }),
      ...(petFeeType && { petFeeType }),
    })
    fetch(`/api/public/properties/${slug}/pricing?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!cancelled) {
          setPriceState(data ? { status: 'ready', total: data.total, breakdown: data.breakdown } : { status: 'idle' })
        }
      })
      .catch(() => { if (!cancelled) setPriceState({ status: 'idle' }) })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchKey, slug, cleaningFee, cleaningFeeType, petFee, petFeeType])

  const isReady = priceState.status === 'ready' && fetchKey !== null
  const isPriceFetching = priceState.status === 'loading'
  const displayTotal = isReady ? priceState.total : nights * basePrice
  const accommodationTotal = isReady && priceState.accommodationTotal != null
    ? priceState.accommodationTotal
    : displayTotal
  const hasVaryingPrices = isReady && priceState.breakdown && priceState.breakdown.length > 1
    && priceState.breakdown.some(b => b.price !== priceState.breakdown![0].price)
  const avgPerNight = nights > 0 ? Math.round(accommodationTotal / nights) : 0

  const checkoutHref = useMemo(() => {
    if (!checkIn || !checkOut || nights < 1) return null
    return `/p/${slug}/checkout?checkin=${checkIn}&checkout=${checkOut}&guests=${guests}`
  }, [slug, checkIn, checkOut, guests, nights])

  const handleCheckInChange = (val: string) => {
    setCheckIn(val)
    onCheckInChange?.(val)
    if (val && isDateBlocked(val, blockedRanges)) {
      setCheckInError('Data indisponível')
    } else {
      setCheckInError('')
    }
    if (checkOut && val) {
      const newMin = addDays(parseISO(val), Math.max(1, effectiveMinNights))
      if (isBefore(parseISO(checkOut), newMin)) {
        setCheckOut('')
        onCheckOutChange?.('')
        setCheckOutError('')
      }
    }
  }

  const handleCheckOutChange = (val: string) => {
    setCheckOut(val)
    onCheckOutChange?.(val)
    if (val && checkIn) {
      const n = differenceInDays(parseISO(val), parseISO(checkIn))
      if (n < effectiveMinNights) {
        setCheckOutError(
          effectiveMinNights === 1
            ? 'Check-out deve ser no mínimo 1 dia após check-in'
            : `Esta propriedade exige estadia mínima de ${effectiveMinNights} noites`
        )
      } else if (isRangeOverlapping(checkIn, val, blockedRanges)) {
        setCheckOutError('Período contém datas reservadas')
      } else {
        setCheckOutError('')
      }
    } else {
      setCheckOutError('')
    }
  }

  return (
    <div className="bg-brand-white border border-brand-gold/20 rounded-2xl p-6 shadow-[0_18px_42px_rgba(16,32,62,0.10)] transition-all hover:border-brand-gold/45 hover:shadow-[0_18px_42px_rgba(201,162,39,0.14)]">
      {/* Price */}
      <div className="mb-5">
        <p className="text-sm text-brand-text-medium mb-0.5">
          {nights > 0 && isReady && hasVaryingPrices ? 'Preço médio' : 'Preço base'}
        </p>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[36px] font-black text-brand-blue leading-none">
            {symbol}{nights > 0 && isReady ? avgPerNight : basePrice}
          </span>
          <span className="text-[16px] font-medium text-brand-text-medium">/noite</span>
        </div>
        {effectiveMinNights > 1 && (
          <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 inline-block">
            Mínimo {effectiveMinNights} noites
          </p>
        )}
      </div>

      {/* Dates — grouped Holidu-style */}
      <div className="mb-3 border border-brand-gold/20 rounded-xl overflow-hidden">
        <p className="px-4 pt-3 pb-1 text-[12px] font-bold text-brand-text-dark bg-brand-bg border-b border-brand-gold/15">
          Seleccione as datas para ver o preço exacto
        </p>
        <div className="grid grid-cols-2">
          <div className="px-4 py-3 border-r border-brand-gold/15">
            <label className="block text-[11px] font-bold text-brand-text-medium uppercase tracking-wide mb-1">Check-in</label>
            <input
              type="date" value={checkIn} min={today}
              onChange={e => handleCheckInChange(e.target.value)}
              className="w-full text-sm text-brand-text-dark bg-transparent focus:outline-none"
            />
            {checkInError && <p className="mt-1 text-[11px] text-red-600">{checkInError}</p>}
          </div>
          <div className="px-4 py-3">
            <label className="block text-[11px] font-bold text-brand-text-medium uppercase tracking-wide mb-1">Check-out</label>
            <input
              type="date" value={checkOut} min={minCheckOut || today}
              onChange={e => handleCheckOutChange(e.target.value)}
              disabled={!checkIn}
              className="w-full text-sm text-brand-text-dark bg-transparent focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
            />
            {checkOutError && <p className="mt-1 text-[11px] text-red-600">{checkOutError}</p>}
          </div>
        </div>
      </div>

      {/* Guests */}
      <div className="mb-5 border border-brand-gold/20 rounded-xl px-4 py-3">
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
        <div className="mb-4 p-3 bg-brand-bg rounded-xl text-sm space-y-1.5">
          {isPriceFetching ? (
            <div className="flex justify-between text-gray-400 animate-pulse">
              <span>{nights} noite{nights !== 1 ? 's' : ''}</span>
              <span className="bg-gray-200 rounded w-16">&nbsp;</span>
            </div>
          ) : (
            <>
              <div className="flex justify-between text-brand-text-medium">
                {hasVaryingPrices
                  ? <span>{nights} noite{nights !== 1 ? 's' : ''} · por época</span>
                  : <span>{symbol}{avgPerNight} × {nights} noite{nights !== 1 ? 's' : ''}</span>
                }
                <span>{symbol}{Math.round(accommodationTotal)}</span>
              </div>
              {isReady && priceState.fees?.map((fee, i) => (
                <div key={i} className="flex justify-between text-brand-text-medium">
                  <span>{fee.label}</span>
                  <span>{symbol}{Math.round(fee.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-brand-text-dark pt-1.5 border-t border-brand-gold/15">
                <span>Total</span>
                <span>{symbol}{Math.round(displayTotal)}</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* CTA */}
      {checkoutHref && !checkInError && !checkOutError ? (
        <Link
          href={checkoutHref}
          className="block w-full bg-brand-blue hover:bg-brand-gold active:scale-[0.98] text-white font-bold py-4 px-4 rounded-full text-center text-[15px] uppercase tracking-wide transition-all mb-4"
        >
          Reservar agora
        </Link>
      ) : (
        <button
          disabled
          className="block w-full bg-brand-blue text-white font-bold py-4 px-4 rounded-full text-center text-[15px] uppercase tracking-wide cursor-not-allowed opacity-60 mb-4"
        >
          {checkInError || checkOutError ? 'Datas indisponíveis' : 'Seleccione as datas'}
        </button>
      )}

      {/* Trust */}
      <div className="space-y-1.5 text-[13px] text-brand-text-medium">
        <p className="flex items-center gap-2"><span className="text-green-600 font-bold">✓</span>Sem comissões</p>
        <p className="flex items-center gap-2"><span className="text-green-600 font-bold">✓</span>Pagamento seguro</p>
        <p className="flex items-center gap-2"><span className="text-green-600 font-bold">✓</span>Confirmação instantânea</p>
      </div>
    </div>
  )
}
