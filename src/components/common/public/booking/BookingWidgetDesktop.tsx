'use client'

import { useState, useMemo, useEffect } from 'react'
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
  | { status: 'ready'; total: number; breakdown?: { date: string; price: number }[] }

interface BookingWidgetDesktopProps {
  propertyName: string
  basePrice: number
  currency: string
  slug: string
  initialCheckIn?: string
  initialCheckOut?: string
  initialGuests?: number
  minNights?: number
  pricingRules?: PricingRule[]
}

export function BookingWidgetDesktop({
  basePrice,
  currency,
  slug,
  initialCheckIn,
  initialCheckOut,
  initialGuests = 1,
  minNights = 1,
  pricingRules = [],
}: BookingWidgetDesktopProps) {
  const [checkIn, setCheckIn] = useState(initialCheckIn || '')
  const [checkOut, setCheckOut] = useState(initialCheckOut || '')
  const [guests, setGuests] = useState(initialGuests)
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
    fetch(`/api/public/properties/${slug}/pricing?checkin=${checkIn}&checkout=${checkOut}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!cancelled) {
          setPriceState(data ? { status: 'ready', total: data.total, breakdown: data.breakdown } : { status: 'idle' })
        }
      })
      .catch(() => { if (!cancelled) setPriceState({ status: 'idle' }) })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchKey, slug])

  const isReady = priceState.status === 'ready' && fetchKey !== null
  const isPriceFetching = priceState.status === 'loading'
  const displayTotal = isReady ? priceState.total : nights * basePrice
  const hasVaryingPrices = isReady && priceState.breakdown && priceState.breakdown.length > 1
    && priceState.breakdown.some(b => b.price !== priceState.breakdown![0].price)
  const avgPerNight = nights > 0 ? Math.round(displayTotal / nights) : 0

  const checkoutHref = useMemo(() => {
    if (!checkIn || !checkOut || nights < 1) return null
    return `/p/${slug}/checkout?checkin=${checkIn}&checkout=${checkOut}&guests=${guests}`
  }, [slug, checkIn, checkOut, guests, nights])

  const handleCheckInChange = (val: string) => {
    setCheckIn(val)
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
            ? 'Check-out deve ser no mínimo 1 dia após check-in'
            : `Esta propriedade exige estadia mínima de ${effectiveMinNights} noites`
        )
      } else {
        setCheckOutError('')
      }
    } else {
      setCheckOutError('')
    }
  }

  return (
    <div className="sticky top-24 bg-white border border-neutral-200 rounded-xl p-6 shadow-lg">
      {/* Price header */}
      <div className="mb-5">
        <p className="text-sm text-neutral-600 mb-1">
          {nights > 0 && isReady && hasVaryingPrices ? 'Preço médio' : 'Preço base'}
        </p>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-neutral-900">
            {symbol}{nights > 0 && isReady ? avgPerNight : basePrice}
          </span>
          <span className="text-neutral-600">/noite</span>
        </div>
        {effectiveMinNights > 1 && (
          <p className="mt-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 inline-block">
            Mínimo {effectiveMinNights} noites
          </p>
        )}
      </div>

      {/* Date pickers */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-1">Check-in</label>
          <input
            type="date"
            value={checkIn}
            min={today}
            onChange={e => handleCheckInChange(e.target.value)}
            className="w-full px-2 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-lodgra-green"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-neutral-700 mb-1">Check-out</label>
          <input
            type="date"
            value={checkOut}
            min={minCheckOut || today}
            onChange={e => handleCheckOutChange(e.target.value)}
            disabled={!checkIn}
            className="w-full px-2 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-lodgra-green disabled:opacity-50 disabled:cursor-not-allowed"
          />
          {checkOutError && (
            <p className="mt-1 text-xs text-red-600">{checkOutError}</p>
          )}
        </div>
      </div>

      {/* Guests */}
      <div className="mb-5">
        <label className="block text-xs font-semibold text-neutral-700 mb-1">Hóspedes</label>
        <select
          value={guests}
          onChange={e => setGuests(parseInt(e.target.value))}
          className="w-full px-2 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-lodgra-green"
        >
          {Array.from({ length: 10 }, (_, i) => (
            <option key={i + 1} value={i + 1}>{i + 1} {i === 0 ? 'hóspede' : 'hóspedes'}</option>
          ))}
        </select>
      </div>

      {/* Price summary */}
      {nights > 0 && (
        <div className="mb-4 p-3 bg-neutral-50 rounded-lg text-sm space-y-1">
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
                <span>{symbol}{Math.round(displayTotal)}</span>
              </div>
              {hasVaryingPrices && (
                <p className="text-xs text-neutral-500">Inclui regras de preço por época</p>
              )}
              <div className="flex justify-between font-bold text-neutral-900 pt-1 border-t border-neutral-200">
                <span>Total</span>
                <span>{symbol}{Math.round(displayTotal)}</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* CTA */}
      {checkoutHref ? (
        <Link
          href={checkoutHref}
          className="block w-full text-white font-semibold py-3 px-4 rounded-lg text-center transition-all mb-4 hover:opacity-90 active:scale-[0.98]"
          style={{ backgroundColor: '#059669' }}
        >
          Reservar agora
        </Link>
      ) : (
        <button
          disabled
          className="block w-full text-white font-semibold py-3 px-4 rounded-lg text-center cursor-not-allowed mb-4 opacity-50"
          style={{ backgroundColor: '#059669' }}
        >
          Selecione as datas
        </button>
      )}

      {/* Trust Info */}
      <div className="space-y-2 text-sm">
        <p className="flex items-center gap-2 text-neutral-700"><span>✓</span>Sem comissões</p>
        <p className="flex items-center gap-2 text-neutral-700"><span>✓</span>Pagamento seguro</p>
        <p className="flex items-center gap-2 text-neutral-700"><span>✓</span>Confirmação instantânea</p>
      </div>
    </div>
  )
}
