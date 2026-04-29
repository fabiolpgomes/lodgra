'use client'

import { useState, useCallback, useMemo } from 'react'

export interface SearchParams {
  location: string
  checkIn: string
  checkOut: string
  guests: number
}

export interface SearchBarProps {
  onSearch: (params: SearchParams) => void
  isLoading?: boolean
}

interface ValidationErrors {
  location?: string
  checkIn?: string
  checkOut?: string
  guests?: string
}

function validateSearchParams(params: SearchParams): ValidationErrors {
  const errors: ValidationErrors = {}

  if (!params.location || params.location.trim().length === 0) {
    errors.location = 'Localização é obrigatória'
  }

  if (!params.checkIn) {
    errors.checkIn = 'Data de check-in é obrigatória'
  }

  if (!params.checkOut) {
    errors.checkOut = 'Data de check-out é obrigatória'
  }

  if (params.checkIn && params.checkOut) {
    const checkInDate = new Date(params.checkIn)
    const checkOutDate = new Date(params.checkOut)
    const minCheckOut = new Date(checkInDate)
    minCheckOut.setDate(minCheckOut.getDate() + 1)

    // Checkout must be at least 1 day after check-in
    if (checkOutDate < minCheckOut) {
      errors.checkOut = 'Check-out deve ser no mínimo 1 dia após check-in'
    }
  }

  if (params.guests < 1 || params.guests > 10) {
    errors.guests = 'Selecione entre 1 e 10 hóspedes'
  }

  return errors
}

export function SearchBar({ onSearch, isLoading = false }: SearchBarProps) {
  const [location, setLocation] = useState('')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guests, setGuests] = useState(1)
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [submitted, setSubmitted] = useState(false)

  const minCheckOutDate = useMemo(() => {
    if (!checkIn) return ''
    const checkInDate = new Date(checkIn)
    checkInDate.setDate(checkInDate.getDate() + 1)
    return checkInDate.toISOString().split('T')[0]
  }, [checkIn])

  const handleSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const params: SearchParams = {
      location: location.trim(),
      checkIn,
      checkOut,
      guests,
    }

    const validationErrors = validateSearchParams(params)

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      setSubmitted(true)
      return
    }

    setErrors({})
    setSubmitted(false)
    onSearch(params)
  }, [location, checkIn, checkOut, guests, onSearch])

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocation(e.target.value)
    if (submitted) {
      const newErrors = { ...errors }
      if (e.target.value.trim().length > 0) {
        delete newErrors.location
      }
      setErrors(newErrors)
    }
  }

  const handleCheckInChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCheckIn = e.target.value
    setCheckIn(newCheckIn)

    const newErrors = { ...errors }

    if (newCheckIn) {
      delete newErrors.checkIn

      // Clear checkout if it's invalid for the new check-in date
      if (checkOut) {
        const checkOutDate = new Date(checkOut)
        const checkInDate = new Date(newCheckIn)
        const minCheckOut = new Date(checkInDate)
        minCheckOut.setDate(minCheckOut.getDate() + 1)

        if (checkOutDate < minCheckOut) {
          setCheckOut('')
          newErrors.checkOut = 'Data de check-out inválida para este check-in'
        }
      }
    } else {
      delete newErrors.checkIn
      delete newErrors.checkOut
    }

    setErrors(newErrors)
  }

  const handleCheckOutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCheckOut = e.target.value
    setCheckOut(newCheckOut)

    const newErrors = { ...errors }

    if (newCheckOut && checkIn) {
      const checkOutDate = new Date(newCheckOut)
      const checkInDate = new Date(checkIn)
      const minCheckOut = new Date(checkInDate)
      minCheckOut.setDate(minCheckOut.getDate() + 1)

      if (checkOutDate >= minCheckOut) {
        delete newErrors.checkOut
      } else {
        newErrors.checkOut = 'Check-out deve ser no mínimo 1 dia após check-in'
      }
    } else if (newCheckOut && !checkIn) {
      newErrors.checkOut = 'Selecione o check-in primeiro'
    } else if (!newCheckOut) {
      delete newErrors.checkOut
    }

    setErrors(newErrors)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full bg-white rounded-xl border border-hs-neutral-200 p-4 md:p-6 shadow-sm"
    >
      {/* Inputs: 2-col on mobile, 4-col on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4">
        {/* Location Input */}
        <div className="col-span-2 md:col-span-1">
          <label htmlFor="location" className="block text-sm font-semibold text-hs-neutral-900 mb-1">
            Para onde?
          </label>
          <input
            id="location"
            type="text"
            placeholder="Cidade, país..."
            value={location}
            onChange={handleLocationChange}
            disabled={isLoading}
            className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-hs-brand-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${errors.location ? 'border-red-500 focus:ring-red-500' : 'border-hs-neutral-300'}`}
            aria-invalid={!!errors.location}
            aria-describedby={errors.location ? 'location-error' : undefined}
          />
          {errors.location && (
            <p id="location-error" className="mt-1 text-xs text-red-600 font-semibold" role="alert">
              {errors.location}
            </p>
          )}
        </div>

        {/* Check-in Date */}
        <div>
          <label htmlFor="checkin" className="block text-sm font-semibold text-hs-neutral-900 mb-1">
            Check-in
          </label>
          <input
            id="checkin"
            type="date"
            value={checkIn}
            onChange={handleCheckInChange}
            disabled={isLoading}
            className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-hs-brand-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${errors.checkIn ? 'border-red-500 focus:ring-red-500' : 'border-hs-neutral-300'}`}
            aria-invalid={!!errors.checkIn}
            aria-describedby={errors.checkIn ? 'checkin-error' : undefined}
          />
          {errors.checkIn && (
            <p id="checkin-error" className="mt-1 text-xs text-red-600 font-semibold" role="alert">
              {errors.checkIn}
            </p>
          )}
        </div>

        {/* Check-out Date */}
        <div>
          <label htmlFor="checkout" className="block text-sm font-semibold text-hs-neutral-900 mb-1">
            Check-out
          </label>
          <input
            id="checkout"
            type="date"
            value={checkOut}
            onChange={handleCheckOutChange}
            disabled={isLoading}
            min={minCheckOutDate}
            className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-hs-brand-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${errors.checkOut ? 'border-red-500 focus:ring-red-500' : 'border-hs-neutral-300'}`}
            aria-invalid={!!errors.checkOut}
            aria-describedby={errors.checkOut ? 'checkout-error' : undefined}
          />
          {errors.checkOut && (
            <p id="checkout-error" className="mt-1 text-xs text-red-600 font-semibold" role="alert">
              {errors.checkOut}
            </p>
          )}
        </div>

        {/* Guests Dropdown */}
        <div>
          <label htmlFor="guests" className="block text-sm font-semibold text-hs-neutral-900 mb-1">
            Hóspedes
          </label>
          <select
            id="guests"
            value={guests}
            onChange={(e) => setGuests(parseInt(e.target.value))}
            disabled={isLoading}
            className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-hs-brand-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${errors.guests ? 'border-red-500 focus:ring-red-500' : 'border-hs-neutral-300'}`}
            aria-invalid={!!errors.guests}
            aria-describedby={errors.guests ? 'guests-error' : undefined}
          >
            {Array.from({ length: 10 }).map((_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1} {i + 1 === 1 ? 'hóspede' : 'hóspedes'}
              </option>
            ))}
          </select>
          {errors.guests && (
            <p id="guests-error" className="mt-1 text-xs text-red-600 font-semibold" role="alert">
              {errors.guests}
            </p>
          )}
        </div>
      </div>

      {/* Search Button — always full-width, always visible */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-hs-brand-400 text-white font-bold text-base rounded-lg hover:bg-hs-brand-500 active:bg-hs-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-hs-brand-400 focus:ring-offset-2"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            A pesquisar...
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            Pesquisar propriedades
          </>
        )}
      </button>
    </form>
  )
}
