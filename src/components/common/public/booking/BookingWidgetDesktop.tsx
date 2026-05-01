'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { differenceInDays, parseISO, isValid, isBefore, startOfDay, addDays, format } from 'date-fns'

interface BookingWidgetDesktopProps {
  propertyName: string
  basePrice: number
  currency: string
  slug: string
  initialCheckIn?: string
  initialCheckOut?: string
  initialGuests?: number
  minNights?: number
}

export function BookingWidgetDesktop({
  basePrice,
  currency,
  slug,
  initialCheckIn,
  initialCheckOut,
  initialGuests = 1,
  minNights = 1,
}: BookingWidgetDesktopProps) {
  const [checkIn, setCheckIn] = useState(initialCheckIn || '')
  const [checkOut, setCheckOut] = useState(initialCheckOut || '')
  const [guests, setGuests] = useState(initialGuests)
  const [checkOutError, setCheckOutError] = useState('')

  const currencySymbols: Record<string, string> = { BRL: 'R$', EUR: '€', USD: '$' }
  const symbol = currencySymbols[currency] || currency

  const today = format(startOfDay(new Date()), 'yyyy-MM-dd')

  // Minimum checkout = checkin + minNights (at least 1)
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

  const totalPrice = nights * basePrice

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
            ? 'Check-out deve ser no mínimo 1 dia após check-in'
            : `Esta propriedade exige estadia mínima de ${minNights} noites`
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
      {/* Price */}
      <div className="mb-5">
        <p className="text-sm text-neutral-600 mb-1">Preço base</p>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-neutral-900">{symbol}{basePrice}</span>
          <span className="text-neutral-600">/noite</span>
        </div>
        {minNights > 1 && (
          <p className="mt-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 inline-block">
            Mínimo {minNights} noites
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
          <div className="flex justify-between text-neutral-700">
            <span>{symbol}{basePrice} × {nights} noite{nights !== 1 ? 's' : ''}</span>
            <span>{symbol}{totalPrice}</span>
          </div>
          <div className="flex justify-between font-bold text-neutral-900 pt-1 border-t border-neutral-200">
            <span>Total</span>
            <span>{symbol}{totalPrice}</span>
          </div>
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
