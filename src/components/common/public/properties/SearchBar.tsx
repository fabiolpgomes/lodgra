'use client'

import { useState, useCallback, useMemo } from 'react'
import { Search } from 'lucide-react'

export interface SearchParams {
  location: string
  checkIn: string
  checkOut: string
  guests: number
}

export interface SearchBarProps {
  onSearch: (params: SearchParams) => void
  isLoading?: boolean
  hideLocation?: boolean
}

interface ValidationErrors {
  location?: string
  checkIn?: string
  checkOut?: string
  guests?: string
}

function validateSearchParams(params: SearchParams): ValidationErrors {
  const errors: ValidationErrors = {}
  if (!params.checkIn) errors.checkIn = 'Data de check-in é obrigatória'
  if (!params.checkOut) errors.checkOut = 'Data de check-out é obrigatória'
  if (params.checkIn && params.checkOut) {
    const checkInDate = new Date(params.checkIn)
    const minCheckOut = new Date(checkInDate)
    minCheckOut.setDate(minCheckOut.getDate() + 1)
    if (new Date(params.checkOut) < minCheckOut) {
      errors.checkOut = 'Check-out deve ser no mínimo 1 dia após check-in'
    }
  }
  if (params.guests < 1 || params.guests > 10) errors.guests = 'Selecione entre 1 e 10 hóspedes'
  return errors
}

const inputClass = (hasError: boolean) =>
  `w-full px-4 py-[13px] min-h-[44px] text-[16px] font-light border focus:outline-none focus:ring-2 focus:ring-brand-gold/30 focus:border-brand-gold transition-colors rounded-xl appearance-none bg-brand-white ${hasError ? 'border-red-500' : 'border-brand-gold/20 text-brand-text-dark'}`

export function SearchBar({ onSearch, isLoading = false, hideLocation = false }: SearchBarProps) {
  const [location, setLocation] = useState('')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guests, setGuests] = useState(1)
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [submitted, setSubmitted] = useState(false)

  const today = useMemo(() => new Date().toISOString().split('T')[0], [])
  const minCheckOutDate = useMemo(() => {
    if (!checkIn) return ''
    const d = new Date(checkIn)
    d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  }, [checkIn])

  const handleSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const params: SearchParams = { location: hideLocation ? '' : location.trim(), checkIn, checkOut, guests }
    const validationErrors = validateSearchParams(params)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      setSubmitted(true)
      return
    }
    setErrors({})
    setSubmitted(false)
    onSearch(params)
  }, [location, checkIn, checkOut, guests, onSearch, hideLocation])

  const handleCheckInChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setCheckIn(val)
    const newErrors = { ...errors }
    if (val) {
      delete newErrors.checkIn
      if (checkOut) {
        const minOut = new Date(val)
        minOut.setDate(minOut.getDate() + 1)
        if (new Date(checkOut) < minOut) { setCheckOut(''); newErrors.checkOut = 'Data inválida' }
      }
    } else { delete newErrors.checkIn; delete newErrors.checkOut }
    setErrors(newErrors)
  }

  const handleCheckOutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setCheckOut(val)
    const newErrors = { ...errors }
    if (val && checkIn) {
      const minOut = new Date(checkIn)
      minOut.setDate(minOut.getDate() + 1)
      if (new Date(val) >= minOut) delete newErrors.checkOut
      else newErrors.checkOut = 'Check-out deve ser após check-in'
    } else if (val && !checkIn) {
      newErrors.checkOut = 'Selecione o check-in primeiro'
    } else { delete newErrors.checkOut }
    setErrors(newErrors)
    if (!submitted) return
  }

  // Desktop with hideLocation: inline row (check-in | check-out | guests | btn)
  // Desktop with location: 4 fields stacked + btn below
  // Mobile: always 1-col stacked + btn below

  const fieldLabel = 'block text-[11px] font-bold text-brand-text-medium uppercase tracking-[0.6px] mb-1.5'
  const btnClass = 'flex items-center justify-center gap-2 h-14 rounded-full bg-brand-blue hover:bg-brand-gold active:bg-brand-blue text-white font-bold text-[14px] uppercase tracking-[1.5px] transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-brand-gold/30 focus:ring-offset-2'

  if (hideLocation) {
    // Compact inline strip for org-specific pages
    return (
      <form onSubmit={handleSubmit} noValidate>
        {/* Desktop: fields + button in one row */}
        <div className="hidden sm:grid sm:grid-cols-[1fr_1fr_1fr_auto] gap-0 overflow-hidden rounded-2xl border border-brand-gold/20 bg-brand-white shadow-sm">
          <div className="px-4 pt-3 pb-2 border-r border-brand-gold/15">
            <label htmlFor="checkin-d" className={fieldLabel}>Check-in</label>
            <input id="checkin-d" type="date" value={checkIn} min={today}
              onChange={handleCheckInChange} disabled={isLoading}
              className="w-full text-[15px] text-brand-text-dark bg-transparent focus:outline-none disabled:opacity-50 pb-2"
              aria-invalid={!!errors.checkIn}
            />
            {errors.checkIn && <p className="text-[11px] text-red-600 font-medium pb-1">{errors.checkIn}</p>}
          </div>
          <div className="px-4 pt-3 pb-2 border-r border-brand-gold/15">
            <label htmlFor="checkout-d" className={fieldLabel}>Check-out</label>
            <input id="checkout-d" type="date" value={checkOut} min={minCheckOutDate}
              onChange={handleCheckOutChange} disabled={isLoading}
              className="w-full text-[15px] text-brand-text-dark bg-transparent focus:outline-none disabled:opacity-50 pb-2"
              aria-invalid={!!errors.checkOut}
            />
            {errors.checkOut && <p className="text-[11px] text-red-600 font-medium pb-1">{errors.checkOut}</p>}
          </div>
          <div className="px-4 pt-3 pb-2 border-r border-brand-gold/15">
            <label htmlFor="guests-d" className={fieldLabel}>Hóspedes</label>
            <select id="guests-d" value={guests}
              onChange={e => setGuests(parseInt(e.target.value))}
              disabled={isLoading}
              className="w-full text-[15px] text-brand-text-dark bg-transparent focus:outline-none disabled:opacity-50 pb-2 appearance-none"
            >
              {Array.from({ length: 10 }).map((_, i) => (
                <option key={i + 1} value={i + 1}>{i + 1} {i + 1 === 1 ? 'hóspede' : 'hóspedes'}</option>
              ))}
            </select>
            {errors.guests && <p className="text-[11px] text-red-600 font-medium pb-1">{errors.guests}</p>}
          </div>
          <button type="submit" disabled={isLoading}
            className={`${btnClass} px-8 whitespace-nowrap`}>
            <Search className="h-4 w-4 shrink-0" />
            <span>{isLoading ? 'A pesquisar...' : 'Pesquisar'}</span>
          </button>
        </div>

        {/* Mobile: stacked */}
        <div className="sm:hidden grid grid-cols-1 gap-3 mb-3">
          <div>
            <label htmlFor="checkin-m" className={fieldLabel}>Check-in</label>
            <input id="checkin-m" type="date" value={checkIn} min={today}
              onChange={handleCheckInChange} disabled={isLoading}
              className={inputClass(!!errors.checkIn)} aria-invalid={!!errors.checkIn}
            />
            {errors.checkIn && <p className="mt-1 text-[11px] text-red-600 font-medium" role="alert">{errors.checkIn}</p>}
          </div>
          <div>
            <label htmlFor="checkout-m" className={fieldLabel}>Check-out</label>
            <input id="checkout-m" type="date" value={checkOut} min={minCheckOutDate}
              onChange={handleCheckOutChange} disabled={isLoading}
              className={inputClass(!!errors.checkOut)} aria-invalid={!!errors.checkOut}
            />
            {errors.checkOut && <p className="mt-1 text-[11px] text-red-600 font-medium" role="alert">{errors.checkOut}</p>}
          </div>
          <div>
            <label htmlFor="guests-m" className={fieldLabel}>Hóspedes</label>
            <select id="guests-m" value={guests}
              onChange={e => setGuests(parseInt(e.target.value))}
              disabled={isLoading} className={inputClass(!!errors.guests)}
            >
              {Array.from({ length: 10 }).map((_, i) => (
                <option key={i + 1} value={i + 1}>{i + 1} {i + 1 === 1 ? 'hóspede' : 'hóspedes'}</option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={isLoading} className={`w-full ${btnClass}`}>
            <Search className="h-4 w-4 shrink-0" />
            <span>{isLoading ? 'A pesquisar...' : 'Pesquisar'}</span>
          </button>
        </div>
      </form>
    )
  }

  // Generic page (with location field)
  const ctaBg = '#10203E'
  const ctaBgHover = '#C9A227'

  return (
    <form onSubmit={handleSubmit} className="w-full" noValidate>
      {/* Desktop: integrated inline strip [location | check-in | check-out | guests | btn] */}
      <div className="hidden sm:grid sm:grid-cols-[1.5fr_1fr_1fr_1fr_auto] gap-0 overflow-hidden rounded-2xl border border-brand-gold/20 bg-brand-white shadow-sm">
        <div className="px-4 pt-3 pb-2 border-r border-brand-gold/15">
          <label htmlFor="location-d" className={fieldLabel}>Para onde?</label>
          <input id="location-d" type="text" placeholder="Cidade, região..."
            value={location}
            onChange={e => { setLocation(e.target.value); if (submitted && e.target.value.trim()) setErrors(p => { const n = {...p}; delete n.location; return n }) }}
            disabled={isLoading}
            className="w-full text-[15px] text-brand-text-dark bg-transparent focus:outline-none disabled:opacity-50 pb-2 placeholder-gray-400"
          />
          {errors.location && <p className="text-[11px] text-red-600 font-medium pb-1">{errors.location}</p>}
        </div>
        <div className="px-4 pt-3 pb-2 border-r border-brand-gold/15">
          <label htmlFor="checkin-d" className={fieldLabel}>Check-in</label>
          <input id="checkin-d" type="date" value={checkIn} min={today}
            onChange={handleCheckInChange} disabled={isLoading}
            className="w-full text-[15px] text-brand-text-dark bg-transparent focus:outline-none disabled:opacity-50 pb-2"
            aria-invalid={!!errors.checkIn}
          />
          {errors.checkIn && <p className="text-[11px] text-red-600 font-medium pb-1">{errors.checkIn}</p>}
        </div>
        <div className="px-4 pt-3 pb-2 border-r border-brand-gold/15">
          <label htmlFor="checkout-d" className={fieldLabel}>Check-out</label>
          <input id="checkout-d" type="date" value={checkOut} min={minCheckOutDate}
            onChange={handleCheckOutChange} disabled={isLoading}
            className="w-full text-[15px] text-brand-text-dark bg-transparent focus:outline-none disabled:opacity-50 pb-2"
            aria-invalid={!!errors.checkOut}
          />
          {errors.checkOut && <p className="text-[11px] text-red-600 font-medium pb-1">{errors.checkOut}</p>}
        </div>
        <div className="px-4 pt-3 pb-2 border-r border-brand-gold/15">
          <label htmlFor="guests-d" className={fieldLabel}>Hóspedes</label>
          <select id="guests-d" value={guests}
            onChange={e => setGuests(parseInt(e.target.value))}
            disabled={isLoading}
            className="w-full text-[15px] text-brand-text-dark bg-transparent focus:outline-none disabled:opacity-50 pb-2 appearance-none"
          >
            {Array.from({ length: 10 }).map((_, i) => (
              <option key={i + 1} value={i + 1}>{i + 1} {i + 1 === 1 ? 'hóspede' : 'hóspedes'}</option>
            ))}
          </select>
          {errors.guests && <p className="text-[11px] text-red-600 font-medium pb-1">{errors.guests}</p>}
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center justify-center gap-2 px-8 whitespace-nowrap font-bold text-[14px] uppercase tracking-[1.5px] text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ backgroundColor: ctaBg }}
          onMouseEnter={e => { if (!isLoading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = ctaBgHover }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = ctaBg }}
        >
          <Search className="h-4 w-4 shrink-0" />
          <span>{isLoading ? 'A pesquisar...' : 'Pesquisar'}</span>
        </button>
      </div>

      {/* Mobile: stacked fields + button */}
      <div className="sm:hidden grid grid-cols-1 gap-3 mb-3">
        <div>
          <label htmlFor="location-m" className={fieldLabel}>Para onde?</label>
          <input id="location-m" type="text" placeholder="Cidade, região..."
            value={location}
            onChange={e => { setLocation(e.target.value); if (submitted && e.target.value.trim()) setErrors(p => { const n = {...p}; delete n.location; return n }) }}
            disabled={isLoading} className={inputClass(!!errors.location)}
          />
          {errors.location && <p className="mt-1 text-[11px] text-red-600 font-medium" role="alert">{errors.location}</p>}
        </div>
        <div>
          <label htmlFor="checkin-m" className={fieldLabel}>Check-in</label>
          <input id="checkin-m" type="date" value={checkIn} min={today}
            onChange={handleCheckInChange} disabled={isLoading}
            className={inputClass(!!errors.checkIn)} aria-invalid={!!errors.checkIn}
          />
          {errors.checkIn && <p className="mt-1 text-[11px] text-red-600 font-medium" role="alert">{errors.checkIn}</p>}
        </div>
        <div>
          <label htmlFor="checkout-m" className={fieldLabel}>Check-out</label>
          <input id="checkout-m" type="date" value={checkOut} min={minCheckOutDate}
            onChange={handleCheckOutChange} disabled={isLoading}
            className={inputClass(!!errors.checkOut)} aria-invalid={!!errors.checkOut}
          />
          {errors.checkOut && <p className="mt-1 text-[11px] text-red-600 font-medium" role="alert">{errors.checkOut}</p>}
        </div>
        <div>
          <label htmlFor="guests-m" className={fieldLabel}>Hóspedes</label>
          <select id="guests-m" value={guests}
            onChange={e => setGuests(parseInt(e.target.value))}
            disabled={isLoading} className={inputClass(false)}
          >
            {Array.from({ length: 10 }).map((_, i) => (
              <option key={i + 1} value={i + 1}>{i + 1} {i + 1 === 1 ? 'hóspede' : 'hóspedes'}</option>
            ))}
          </select>
        </div>
      </div>
      <button
        type="submit"
        disabled={isLoading}
        className="sm:hidden w-full flex items-center justify-center gap-2 h-14 font-bold text-[14px] uppercase tracking-[1.5px] text-white disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ backgroundColor: ctaBg }}
      >
        <Search className="h-4 w-4 shrink-0" />
        <span>{isLoading ? 'A pesquisar...' : 'Pesquisar'}</span>
      </button>
    </form>
  )
}
