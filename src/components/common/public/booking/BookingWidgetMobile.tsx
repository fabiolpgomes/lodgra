'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { differenceInDays, parseISO, isValid, addDays, format, startOfDay, isBefore } from 'date-fns'

interface BookingWidgetMobileProps {
  propertyName: string
  basePrice: number
  currency: string
  slug: string
  initialCheckIn?: string
  initialCheckOut?: string
  initialGuests?: number
  minNights?: number
}

export function BookingWidgetMobile({
  basePrice,
  currency,
  slug,
  initialCheckIn,
  initialCheckOut,
  initialGuests = 1,
  minNights = 1,
}: BookingWidgetMobileProps) {
  const [showPanel, setShowPanel] = useState(false)
  const [checkIn, setCheckIn] = useState(initialCheckIn || '')
  const [checkOut, setCheckOut] = useState(initialCheckOut || '')
  const [guests, setGuests] = useState(initialGuests)
  const [checkOutError, setCheckOutError] = useState('')

  const currencySymbols: Record<string, string> = { BRL: 'R$', EUR: '€', USD: '$' }
  const symbol = currencySymbols[currency] || currency

  const today = format(startOfDay(new Date()), 'yyyy-MM-dd')

  const minCheckOut = useMemo(() => {
    if (!checkIn) return ''
    return format(addDays(parseISO(checkIn), Math.max(1, minNights)), 'yyyy-MM-dd')
  }, [checkIn, minNights])

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0
    const d1 = parseISO(checkIn)
    const d2 = parseISO(checkOut)
    if (!isValid(d1) || !isValid(d2)) return 0
    return Math.max(0, differenceInDays(d2, d1))
  }, [checkIn, checkOut])

  const checkoutHref = useMemo(() => {
    if (!checkIn || !checkOut || nights < 1) return null
    return `/p/${slug}/checkout?checkin=${checkIn}&checkout=${checkOut}&guests=${guests}`
  }, [slug, checkIn, checkOut, guests, nights])

  const handleCheckInChange = (val: string) => {
    setCheckIn(val)
    if (checkOut && val) {
      const newMin = addDays(parseISO(val), Math.max(1, minNights))
      if (isBefore(parseISO(checkOut), newMin)) {
        setCheckOut('')
        setCheckOutError('')
      }
    }
  }

  const handleCheckOutChange = (val: string) => {
    setCheckOut(val)
    if (val && checkIn) {
      const nights = differenceInDays(parseISO(val), parseISO(checkIn))
      if (nights < minNights) {
        setCheckOutError(
          minNights === 1
            ? 'Check-out deve ser mínimo 1 dia após check-in'
            : `Estadia mínima: ${minNights} noites`
        )
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
            <p className="text-xs text-neutral-600">Preço base</p>
            <p className="font-bold text-neutral-900">
              {symbol}{basePrice}<span className="text-sm font-normal text-neutral-600"> /noite</span>
            </p>
            {nights > 0 && (
              <p className="text-xs text-orange-600 font-semibold">{nights} noite{nights !== 1 ? 's' : ''} · {symbol}{nights * basePrice}</p>
            )}
          </div>

          {checkoutHref ? (
            <Link
              href={checkoutHref}
              className="flex-1 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-semibold py-3 px-4 rounded-lg text-center transition-colors"
            >
              Reservar
            </Link>
          ) : (
            <button
              onClick={() => setShowPanel(true)}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-4 rounded-lg text-center transition-colors"
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
              <h3 className="font-bold text-lg text-neutral-900">Selecionar datas</h3>
              <button onClick={() => setShowPanel(false)} className="text-neutral-500 text-xl">✕</button>
            </div>
            {minNights > 1 && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                Estadia mínima: {minNights} noites
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
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1">Check-out</label>
                <input
                  type="date"
                  value={checkOut}
                  min={minCheckOut || today}
                  onChange={e => handleCheckOutChange(e.target.value)}
                  disabled={!checkIn}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {checkOutError && <p className="mt-1 text-xs text-red-600">{checkOutError}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-1">Hóspedes</label>
              <select
                value={guests}
                onChange={e => setGuests(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                {Array.from({ length: 10 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1} {i === 0 ? 'hóspede' : 'hóspedes'}</option>
                ))}
              </select>
            </div>

            {nights > 0 && (
              <div className="p-3 bg-neutral-50 rounded-lg text-sm space-y-1">
                <div className="flex justify-between text-neutral-700">
                  <span>{symbol}{basePrice} × {nights} noite{nights !== 1 ? 's' : ''}</span>
                  <span>{symbol}{nights * basePrice}</span>
                </div>
                <div className="flex justify-between font-bold text-neutral-900 pt-1 border-t border-neutral-200">
                  <span>Total</span>
                  <span>{symbol}{nights * basePrice}</span>
                </div>
              </div>
            )}

            {checkoutHref ? (
              <Link
                href={checkoutHref}
                className="block w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-4 rounded-lg text-center transition-colors"
                onClick={() => setShowPanel(false)}
              >
                Reservar agora
              </Link>
            ) : (
              <button
                disabled
                className="w-full bg-orange-300 text-white font-semibold py-3 px-4 rounded-lg cursor-not-allowed"
              >
                Selecione check-in e check-out
              </button>
            )}
          </div>
        </>
      )}
    </>
  )
}
