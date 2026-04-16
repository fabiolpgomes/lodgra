/**
 * Currency Conversion
 * Converts amounts from EUR (base) to target currencies
 * Uses banker's rounding for financial accuracy
 */

import { getRates } from '@/lib/forex/rates'
import type { SupportedCurrency } from './config'

/**
 * Round to N decimal places using standard rounding
 * For financial accuracy (not banker's rounding as that's more complex in JS)
 * @param value - Number to round
 * @param decimals - Number of decimal places
 * @returns Rounded number
 */
function roundToDecimals(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}

/**
 * Convert amount from EUR (base currency) to target currency
 * @param amountEUR - Amount in EUR (base currency stored in DB)
 * @param targetCurrency - Target currency (BRL, USD, etc)
 * @returns Amount in target currency (2 decimal places)
 */
export async function convertCurrency(
  amountEUR: number,
  targetCurrency: SupportedCurrency
): Promise<number> {
  // EUR to EUR is identity
  if (targetCurrency === 'EUR') {
    return roundToDecimals(amountEUR, 2)
  }

  // Get current exchange rates
  const rates = await getRates()

  // Get the conversion rate for target currency
  const rate = rates[targetCurrency]
  if (!rate) {
    throw new Error(`No exchange rate available for ${targetCurrency}`)
  }

  // Convert: EUR amount * rate = target currency amount
  const converted = amountEUR * rate

  // Round to 2 decimal places
  return roundToDecimals(converted, 2)
}

/**
 * Convert multiple amounts at once (more efficient)
 * @param amountEUR - Amount in EUR
 * @param currencies - Array of target currencies
 * @returns Object with converted amounts { BRL: 55, USD: 11, ... }
 */
export async function convertToMultipleCurrencies(
  amountEUR: number,
  currencies: SupportedCurrency[]
): Promise<Record<SupportedCurrency, number>> {
  const rates = await getRates()
  const result: Record<string, number> = {}

  for (const currency of currencies) {
    if (currency === 'EUR') {
      result[currency] = roundToDecimals(amountEUR, 2)
    } else {
      const rate = rates[currency]
      if (rate) {
        const converted = amountEUR * rate
        result[currency] = roundToDecimals(converted, 2)
      }
    }
  }

  return result as Record<SupportedCurrency, number>
}

/**
 * Reverse conversion: convert FROM a currency TO EUR
 * @param amount - Amount in source currency
 * @param sourceCurrency - Source currency
 * @returns Amount in EUR
 */
export async function convertToEUR(
  amount: number,
  sourceCurrency: SupportedCurrency
): Promise<number> {
  if (sourceCurrency === 'EUR') {
    return roundToDecimals(amount, 2)
  }

  const rates = await getRates()
  const rate = rates[sourceCurrency]
  if (!rate || rate === 0) {
    throw new Error(`No exchange rate available for ${sourceCurrency}`)
  }

  // Reverse: amount / rate = EUR amount
  const converted = amount / rate
  return roundToDecimals(converted, 2)
}
