/**
 * Forex API Client
 * Fetches real-time exchange rates from a free public API
 * Uses exchangerate-api.com (no auth required)
 */

export interface ForexRates {
  EUR: number // Base currency (1 EUR = 1)
  BRL: number // 1 EUR = X BRL
  USD: number // 1 EUR = X USD
}

const FOREX_API_URL = 'https://api.exchangerate-api.com/v4/latest/EUR'

/**
 * Fetch current exchange rates from public API
 * Returns rates with EUR as base (1 EUR = X target currency)
 */
export async function fetchForexRates(): Promise<ForexRates> {
  try {
    const response = await fetch(FOREX_API_URL, {
      // Don't cache - let Redis handle caching
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`)
    }

    const data = await response.json()

    return {
      EUR: 1, // Base is always 1
      BRL: data.rates.BRL,
      USD: data.rates.USD,
    }
  } catch (error) {
    console.error('[forex] Failed to fetch rates:', error)
    throw new Error(`Failed to fetch forex rates: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
