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

function validateSearchParams(params: SearchParams, hideLocation: boolean): ValidationErrors {
  const errors: ValidationErrors = {}
  if (!hideLocation && (!params.location || params.location.trim().length === 0)) {
    errors.location = 'Localização é obrigatória'
  }
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
  `w-full px-4 py-4 text-[16px] font-light border focus:outline-none focus:ring-2 focus:ring-brand-800 focus:border-transparent transition-colors rounded-none appearance-none bg-white
  ${hasError ? 'border-red-500' : 'border-gray-300 text-gray-900'}`

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
    const validationErrors = validateSearchParams(params, hideLocation)
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

  const colCount = hideLocation ? 'sm:grid-cols-3' : 'sm:grid-cols-2 md:grid-cols-4'

  return (
    <form onSubmit={handleSubmit} className="w-full" noValidate>
      {/* Fields */}
      <div className={`grid grid-cols-1 ${colCount} gap-3 mb-3`}>
        {!hideLocation && (
          <div className="sm:col-span-2 md:col-span-1">
            <label htmlFor="location" className="block text-[11px] font-bold text-gray-600 uppercase tracking-[0.6px] mb-1.5">
              Para onde?
            </label>
            <input
              id="location" type="text" placeholder="Cidade, região..."
              value={location} onChange={e => { setLocation(e.target.value); if (submitted && e.target.value.trim()) setErrors(p => { const n = {...p}; delete n.location; return n }) }}
              disabled={isLoading}
              className={inputClass(!!errors.location)}
              aria-invalid={!!errors.location}
            />
            {errors.location && <p className="mt-1 text-[11px] text-red-600 font-medium" role="alert">{errors.location}</p>}
          </div>
        )}

        {/* Check-in */}
        <div>
          <label htmlFor="checkin" className="block text-[11px] font-bold text-gray-600 uppercase tracking-[0.6px] mb-1.5">
            Check-in
          </label>
          <input
            id="checkin" type="date" value={checkIn} min={today}
            onChange={handleCheckInChange} disabled={isLoading}
            className={inputClass(!!errors.checkIn)}
            aria-invalid={!!errors.checkIn}
          />
          {errors.checkIn && <p className="mt-1 text-[11px] text-red-600 font-medium" role="alert">{errors.checkIn}</p>}
        </div>

        {/* Check-out */}
        <div>
          <label htmlFor="checkout" className="block text-[11px] font-bold text-gray-600 uppercase tracking-[0.6px] mb-1.5">
            Check-out
          </label>
          <input
            id="checkout" type="date" value={checkOut} min={minCheckOutDate}
            onChange={handleCheckOutChange} disabled={isLoading}
            className={inputClass(!!errors.checkOut)}
            aria-invalid={!!errors.checkOut}
          />
          {errors.checkOut && <p className="mt-1 text-[11px] text-red-600 font-medium" role="alert">{errors.checkOut}</p>}
        </div>

        {/* Guests */}
        <div>
          <label htmlFor="guests" className="block text-[11px] font-bold text-gray-600 uppercase tracking-[0.6px] mb-1.5">
            Hóspedes
          </label>
          <select
            id="guests" value={guests}
            onChange={e => setGuests(parseInt(e.target.value))}
            disabled={isLoading}
            className={inputClass(!!errors.guests)}
            aria-invalid={!!errors.guests}
          >
            {Array.from({ length: 10 }).map((_, i) => (
              <option key={i + 1} value={i + 1}>{i + 1} {i + 1 === 1 ? 'hóspede' : 'hóspedes'}</option>
            ))}
          </select>
          {errors.guests && <p className="mt-1 text-[11px] text-red-600 font-medium" role="alert">{errors.guests}</p>}
        </div>
      </div>

      {/* CTA */}
      <button
        type="submit" disabled={isLoading}
        className="w-full flex items-center justify-center gap-2 h-14 bg-brand-800 hover:bg-brand-900 active:bg-brand-950 text-white font-bold text-[14px] uppercase tracking-[1.5px] transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-brand-800 focus:ring-offset-2 rounded-none"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="sm:hidden">{isLoading ? 'A pesquisar...' : 'Pesquisar'}</span>
        <span className="hidden sm:inline">{isLoading ? 'A pesquisar...' : 'Pesquisar Propriedades'}</span>
      </button>
    </form>
  )
}
