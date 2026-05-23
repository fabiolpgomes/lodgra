'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { differenceInDays, parseISO, isValid, addDays, format, startOfDay, isBefore } from 'date-fns'

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

interface BookingWidgetMobileProps {
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
}

function isDateBlocked(date: string, ranges: BlockedRange[]): boolean {
  return ranges.some(r => date >= r.start && date < r.end)
}

function isRangeOverlapping(ci: string, co: string, ranges: BlockedRange[]): boolean {
  return ranges.some(r => ci < r.end && co > r.start)
}

export function BookingWidgetMobile({
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
}: BookingWidgetMobileProps) {
  const [showPanel, setShowPanel] = useState(false)
  const [checkIn, setCheckIn] = useState(initialCheckIn || '')
  const [checkOut, setCheckOut] = useState(initialCheckOut || '')
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
  const avgPerNight = nights > 0 ? Math.round(accommodationTotal / nights) : basePrice

  const checkoutHref = useMemo(() => {
    if (!checkIn || !checkOut || nights < 1) return null
    return `/p/${slug}/checkout?checkin=${checkIn}&checkout=${checkOut}&guests=${guests}`
  }, [slug, checkIn, checkOut, guests, nights])

  const handleCheckInChange = (val: string) => {
    setCheckIn(val)
    if (val && isDateBlocked(val, blockedRanges)) {
      setCheckInError('Data indisponível')
    } else {
      setCheckInError('')
    }
    if (checkOut && val) {
      const newMin = addDays(parseISO(val), Math.max(1, effectiveMinNights))
      if (isBefore(parseISO(checkOut), newMin)) {
        setCheckOut('')
        setCheckOutError('')
      }
    }
  }

  const handleCheckOutChange = (val: string) => {
    setCheckOut(val)
    if (val && checkIn) {
      const n = differenceInDays(parseISO(val), parseISO(checkIn))
      if (n < effectiveMinNights) {
        setCheckOutError(
          effectiveMinNights === 1
            ? 'Check-out deve ser mínimo 1 dia após check-in'
            : `Estadia mínima: ${effectiveMinNights} noites`
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
    <>
      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-white border-t border-neutral-200 shadow-lg z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-neutral-600">
              {nights > 0 && isReady ? (hasVaryingPrices ? 'Preço médio' : 'Por noite') : 'Preço base'}
            </p>
            <p className="text-xl font-black text-neutral-900">
              {symbol}{nights > 0 && isReady ? avgPerNight : basePrice}
              <span className="text-sm font-medium text-neutral-600"> /noite</span>
            </p>
            {nights > 0 && (
              <p className="text-xs text-lodgra-green font-semibold">
                {isPriceFetching
                  ? 'A calcular…'
                  : `${nights} noite${nights !== 1 ? 's' : ''} · ${symbol}${Math.round(displayTotal)}`
                }
              </p>
            )}
          </div>

          {checkoutHref && !checkInError && !checkOutError ? (
            <Link
              href={checkoutHref}
              className="flex-1 bg-[#1E3A8A] hover:brightness-110 active:scale-[0.98] font-bold py-3 px-4 rounded-lg text-center transition-all"
              style={{ color: '#ffffff' }}
            >
              Reservar
            </Link>
          ) : (
            <button
              onClick={() => setShowPanel(true)}
              className="flex-1 bg-[#1E3A8A] hover:brightness-110 font-bold py-3 px-4 rounded-lg text-center transition-all"
              style={{ color: '#ffffff' }}
            >
              Selecionar datas
            </button>
          )}
        </div>
      </div>

      {/* Date selection panel */}
      {showPanel && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50 lg:hidden"
            onClick={() => setShowPanel(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white rounded-t-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold text-lg text-neutral-900">Selecionar datas</h2>
              <button onClick={() => setShowPanel(false)} className="text-neutral-500 text-xl">✕</button>
            </div>
            {effectiveMinNights > 1 && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                Estadia mínima: {effectiveMinNights} noites
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1">Check-in</label>
                <input
                  type="date"
                  value={checkIn}
                  min={today}
                  onChange={e => handleCheckInChange(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lodgra-green"
                />
                {checkInError && <p className="mt-1 text-xs text-red-600">{checkInError}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1">Check-out</label>
                <input
                  type="date"
                  value={checkOut}
                  min={minCheckOut || today}
                  onChange={e => handleCheckOutChange(e.target.value)}
                  disabled={!checkIn}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lodgra-green disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {checkOutError && <p className="mt-1 text-xs text-red-600">{checkOutError}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-1">Hóspedes</label>
              <select
                value={guests}
                onChange={e => setGuests(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lodgra-green"
              >
                {Array.from({ length: Math.max(1, maxGuests) }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1} {i === 0 ? 'hóspede' : 'hóspedes'}</option>
                ))}
              </select>
            </div>

            {nights > 0 && (
              <div className="p-3 bg-neutral-50 rounded-lg text-sm space-y-1">
                {isPriceFetching ? (
                  <>
                    <div className="flex justify-between text-neutral-400 animate-pulse">
                      <span>{nights} noite{nights !== 1 ? 's' : ''}</span>
                      <span className="bg-neutral-200 rounded w-16">&nbsp;</span>
                    </div>
                    <div className="flex justify-between font-bold text-neutral-300 pt-1 border-t border-neutral-200 animate-pulse">
                      <span>Total</span>
                      <span className="bg-neutral-200 rounded w-20">&nbsp;</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-neutral-700">
                      {hasVaryingPrices ? (
                        <span>{nights} noite{nights !== 1 ? 's' : ''} · preço por época</span>
                      ) : (
                        <span>{symbol}{avgPerNight} × {nights} noite{nights !== 1 ? 's' : ''}</span>
                      )}
                      <span>{symbol}{Math.round(accommodationTotal)}</span>
                    </div>
                    {hasVaryingPrices && (
                      <p className="text-xs text-neutral-500">Inclui regras de preço por época</p>
                    )}
                    {isReady && priceState.fees?.map((fee, i) => (
                      <div key={i} className="flex justify-between text-neutral-700">
                        <span>{fee.label}</span>
                        <span>{symbol}{Math.round(fee.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-bold text-neutral-900 pt-1 border-t border-neutral-200">
                      <span>Total</span>
                      <span>{symbol}{Math.round(displayTotal)}</span>
                    </div>
                  </>
                )}
              </div>
            )}

            {checkoutHref && !checkInError && !checkOutError ? (
              <Link
                href={checkoutHref}
                className="block w-full bg-[#1E3A8A] hover:brightness-110 font-bold py-3 px-4 rounded-lg text-center transition-all"
                style={{ color: '#ffffff' }}
                onClick={() => setShowPanel(false)}
              >
                Reservar agora
              </Link>
            ) : (
              <button
                disabled
                className="w-full bg-[#1E3A8A] opacity-80 font-bold py-3 px-4 rounded-lg cursor-not-allowed"
                style={{ color: '#ffffff' }}
              >
                {checkInError || checkOutError ? 'Datas indisponíveis' : 'Selecione check-in e check-out'}
              </button>
            )}
          </div>
        </>
      )}
    </>
  )
}
