'use client'

import { useState, useEffect, useRef } from 'react'
import { formatPricingAmount } from '@/lib/utils/pricing-currency'

interface PriceBreakdownData {
  base_price: number
  loyalty_discount_amount: number
  loyalty_discount_percent: number
  last_minute_discount: {
    applied: boolean
    amount: number
    percent?: number
  }
  extended_stay_discount: {
    applied: boolean
    amount: number
    percent?: number
  }
  early_bird_discount: {
    applied: boolean
    amount: number
    percent?: number
  }
  seasonal_adjustment: {
    applied: boolean
    amount: number
    percent?: number
  }
  total_discounts_amount: number
  final_price: number
  discount_breakdown: string
}

interface PriceBreakdownTooltipProps {
  base_price: number
  currency?: string
  check_in?: string // ISO date
  check_out?: string // ISO date
  guest_id?: string // Current logged-in user
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function PriceBreakdownTooltip({
  base_price,
  currency,
  check_in,
  check_out,
  guest_id,
  open = false,
  onOpenChange,
}: PriceBreakdownTooltipProps) {
  const [isOpen, setIsOpen] = useState(open)
  const [breakdown, setBreakdown] = useState<PriceBreakdownData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Update parent state
  useEffect(() => {
    onOpenChange?.(isOpen)
  }, [isOpen, onOpenChange])

  // Fetch price breakdown when dates change
  useEffect(() => {
    if (!isOpen || !check_in || !check_out) {
      return
    }

    const fetchBreakdown = async () => {
      setLoading(true)
      setError(null)

      try {
        // Calculate nights
        const checkInDate = new Date(check_in)
        const checkOutDate = new Date(check_out)
        const nights = Math.ceil(
          (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
        )

        if (nights < 1) {
          if (!cancelled) {
            setError('Please select valid dates')
            setBreakdown(null)
          }
          return
        }

        // Get loyalty discount if user is logged in
        let loyaltyDiscount = 0
        if (guest_id) {
          try {
            const tierRes = await fetch(`/api/guests/${guest_id}/tier`)
            if (tierRes.ok) {
              const tierData = await tierRes.json()
              loyaltyDiscount = tierData.base_discount_percent || 0
            }
          } catch (err) {
            console.error('Failed to fetch guest tier:', err)
            // Continue without loyalty discount
          }
        }

        // Call calculate-price API
        const response = await fetch('/api/reservations/calculate-price', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base_price,
            loyalty_discount_percent: loyaltyDiscount,
            check_in,
            check_out,
            nights_total: nights,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to calculate price')
        }

        const data = await response.json()
        if (!cancelled) {
          setBreakdown(data)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Price calculation error:', err)
          setError('Unable to calculate price breakdown')
          setBreakdown(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    let cancelled = false
    const debounceTimer = setTimeout(fetchBreakdown, 300)
    return () => {
      cancelled = true
      clearTimeout(debounceTimer)
    }
  }, [isOpen, check_in, check_out, base_price, guest_id])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isOpen &&
        tooltipRef.current &&
        buttonRef.current &&
        !tooltipRef.current.contains(e.target as Node) &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className="relative inline-block">
      {/* Toggle Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition"
        aria-label="Show price breakdown"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        💰 Show Breakdown
      </button>

      {/* Tooltip */}
      {isOpen && (
        <div
          ref={tooltipRef}
          className="absolute z-50 mt-2 w-80 max-w-[90vw] bg-white border border-gray-200 rounded-lg shadow-lg p-4"
          role="dialog"
          aria-label="Price breakdown"
        >
          {loading && (
            <div className="text-center text-sm text-gray-600">
              Calculating price...
            </div>
          )}

          {error && (
            <div className="text-center text-sm text-red-600">
              {error}
            </div>
          )}

          {breakdown && !loading && !error && (
            <div className="space-y-2 text-sm">
              {/* Base Price */}
              <div className="flex justify-between font-semibold text-gray-900">
                <span>Preço Base</span>
                <span>{formatPricingAmount(breakdown.base_price, currency)}</span>
              </div>

              {/* Loyalty Discount */}
              {breakdown.loyalty_discount_amount > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>- Desconto Fidelidade</span>
                  <span>-{formatPricingAmount(breakdown.loyalty_discount_amount, currency)}</span>
                </div>
              )}

              {/* Early-Bird Discount */}
              {breakdown.early_bird_discount.applied && (
                <div className="flex justify-between text-gray-700">
                  <span>- Desconto Antecipado</span>
                  <span>-{formatPricingAmount(breakdown.early_bird_discount.amount, currency)}</span>
                </div>
              )}

              {/* Extended Stay Discount */}
              {breakdown.extended_stay_discount.applied && (
                <div className="flex justify-between text-gray-700">
                  <span>- Estadia Estendida</span>
                  <span>-{formatPricingAmount(breakdown.extended_stay_discount.amount, currency)}</span>
                </div>
              )}

              {/* Last-Minute Discount */}
              {breakdown.last_minute_discount.applied && (
                <div className="flex justify-between text-gray-700">
                  <span>- Last-Minute</span>
                  <span>-{formatPricingAmount(breakdown.last_minute_discount.amount, currency)}</span>
                </div>
              )}

              {/* Seasonal Adjustment */}
              {breakdown.seasonal_adjustment.applied && (
                <div className="flex justify-between text-gray-700">
                  <span>
                    {breakdown.seasonal_adjustment.amount > 0 ? '+ ' : '- '}
                    Ajuste Sazonal
                  </span>
                  <span>
                    {breakdown.seasonal_adjustment.amount > 0 ? '+' : '-'}
                    {formatPricingAmount(Math.abs(breakdown.seasonal_adjustment.amount), currency)}
                  </span>
                </div>
              )}

              {/* Divider */}
              <div className="border-t border-gray-300 my-2" />

              {/* Total Discount */}
              {breakdown.total_discounts_amount > 0 && (
                <div className="flex justify-between text-gray-700 text-xs">
                  <span>Desconto Total</span>
                  <span>-{formatPricingAmount(breakdown.total_discounts_amount, currency)}</span>
                </div>
              )}

              {/* Final Price */}
              <div className="flex justify-between font-bold text-lg text-emerald-700">
                <span>Preço Final</span>
                <span>{formatPricingAmount(breakdown.final_price, currency)}</span>
              </div>

              {/* Hidden for screen readers */}
              <div className="sr-only">
                {`Price breakdown: Base price ${formatPricingAmount(breakdown.base_price, currency)}.
                Total discounts: ${formatPricingAmount(breakdown.total_discounts_amount, currency)}.
                Final price: ${formatPricingAmount(breakdown.final_price, currency)}.`}
              </div>
            </div>
          )}

          {!loading && !error && !breakdown && check_in && check_out && (
            <div className="text-center text-sm text-gray-600">
              No data available
            </div>
          )}
        </div>
      )}
    </div>
  )
}
