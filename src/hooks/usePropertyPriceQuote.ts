'use client'

import { useEffect, useMemo, useState } from 'react'
import { differenceInDays, isValid, parseISO } from 'date-fns'

export interface PropertyPriceQuote {
  baseTotal: number
  discountApplied: boolean
  discountType: 'weekly' | 'monthly' | null
  discountPercentage: number
  discountAmount: number
  finalTotal: number
  breakdown: { date: string; price: number }[]
}

interface UsePropertyPriceQuoteResult {
  quote: PropertyPriceQuote | null
  loading: boolean
  error: string | null
}

function isValidDateRange(checkIn?: string, checkOut?: string): boolean {
  if (!checkIn || !checkOut) return false

  const start = parseISO(checkIn)
  const end = parseISO(checkOut)

  if (!isValid(start) || !isValid(end)) return false

  return differenceInDays(end, start) >= 1
}

export function usePropertyPriceQuote(
  propertyId?: string,
  checkIn?: string,
  checkOut?: string
): UsePropertyPriceQuoteResult {
  const [quote, setQuote] = useState<PropertyPriceQuote | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchKey = useMemo(() => {
    if (!propertyId || !isValidDateRange(checkIn, checkOut)) return null
    return `${propertyId}:${checkIn}:${checkOut}`
  }, [checkIn, checkOut, propertyId])

  useEffect(() => {
    if (!fetchKey || !propertyId || !checkIn || !checkOut) {
      setLoading(false)
      setError(null)
      return
    }

    const controller = new AbortController()
    const timeoutId = window.setTimeout(async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/properties/${propertyId}/calculate-price`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            checkInDate: checkIn,
            checkOutDate: checkOut,
          }),
          signal: controller.signal,
        })

        const data = await response.json().catch(() => null)

        if (!response.ok) {
          throw new Error(data?.error || 'Erro ao calcular o preço')
        }

        setQuote(data as PropertyPriceQuote)
      } catch (err) {
        if (controller.signal.aborted) return
        setError(err instanceof Error ? err.message : 'Erro ao calcular o preço')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 500)

    return () => {
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [checkIn, checkOut, fetchKey, propertyId])

  return { quote, loading, error }
}
