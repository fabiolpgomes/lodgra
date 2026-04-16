/**
 * Pricing Conversion Helper
 * Converts pricing results from EUR to user's target currency
 */

import { convertCurrency, convertToMultipleCurrencies } from '@/lib/currency/convert'
import type { SupportedCurrency } from '@/lib/currency/config'

/**
 * Pricing breakdown item
 */
export interface PriceBreakdownItem {
  date: string
  price: number
}

/**
 * Pricing result structure from the database
 * Matches PriceForRange from getPriceForRange.ts
 */
export interface PricingResult {
  total: number // Total price in EUR
  breakdown?: PriceBreakdownItem[] // Optional breakdown by date
  minNights?: number // Minimum nights requirement
  currency?: string // Original currency (should be 'EUR')
}

/**
 * Convert pricing result to a specific currency
 * @param pricing - Original pricing (in EUR)
 * @param targetCurrency - Target currency
 * @returns Pricing converted to target currency
 */
export async function convertPricingResult(
  pricing: PricingResult,
  targetCurrency: SupportedCurrency
): Promise<PricingResult> {
  // If target is EUR, return as-is
  if (targetCurrency === 'EUR') {
    return { ...pricing, currency: 'EUR' }
  }

  // Convert total amount
  const convertedTotal = await convertCurrency(pricing.total, targetCurrency)

  // Convert breakdown items if present
  let convertedBreakdown = pricing.breakdown
  if (pricing.breakdown && pricing.breakdown.length > 0) {
    convertedBreakdown = await Promise.all(
      pricing.breakdown.map(async (item) => ({
        date: item.date,
        price: await convertCurrency(item.price, targetCurrency),
      }))
    )
  }

  return {
    total: convertedTotal,
    breakdown: convertedBreakdown,
    minNights: pricing.minNights,
    currency: targetCurrency,
  }
}

/**
 * Return pricing in multiple currencies
 * Useful for UI that shows conversion preview
 * @param pricingEUR - Pricing in EUR
 * @param currencies - Target currencies
 * @returns Object with pricing in each currency
 */
export async function convertPricingToMultipleCurrencies(
  pricingEUR: PricingResult,
  _currencies: SupportedCurrency[]
): Promise<Record<SupportedCurrency, PricingResult>> {
  const result: Record<string, PricingResult> = {}

  for (const currency of _currencies) {
    result[currency] = await convertPricingResult(pricingEUR, currency)
  }

  return result as Record<SupportedCurrency, PricingResult>
}
