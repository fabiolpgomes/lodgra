/**
 * Multi-Currency Configuration
 * Maps locales to currencies and provides formatting rules
 */

import type { Locale } from '@/i18n.config'

export type SupportedCurrency = 'EUR' | 'BRL' | 'USD'

export interface CurrencyConfig {
  code: SupportedCurrency
  symbol: string
  name: string
  locale: Locale
}

/**
 * Mapping of supported currencies
 */
export const CURRENCY_CONFIG: Record<SupportedCurrency, CurrencyConfig> = {
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    locale: 'pt',
  },
  BRL: {
    code: 'BRL',
    symbol: 'R$',
    name: 'Real Brasileiro',
    locale: 'pt-BR',
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'Dólar Americano',
    locale: 'en-US',
  },
}

/**
 * Map i18n locale to currency code
 * Example: 'pt' → 'EUR', 'pt-BR' → 'BRL', 'en-US' → 'USD'
 */
export function getLocaleCurrency(locale: Locale): SupportedCurrency {
  switch (locale) {
    case 'pt':
      return 'EUR'
    case 'pt-BR':
      return 'BRL'
    case 'en-US':
      return 'USD'
    default:
      return 'EUR' // Default fallback
  }
}

/**
 * Get currency code for a given locale
 * @param locale - i18n locale (e.g., 'pt', 'pt-BR', 'en-US')
 * @returns Currency code (EUR, BRL, USD)
 */
export function getCurrencyByLocale(locale: Locale): SupportedCurrency {
  return getLocaleCurrency(locale)
}

/**
 * Get currency symbol for a currency code
 */
export function getCurrencySymbol(currency: SupportedCurrency): string {
  return CURRENCY_CONFIG[currency]?.symbol || '€'
}

/**
 * Get all supported currencies
 */
export function getSupportedCurrencies(): SupportedCurrency[] {
  return Object.keys(CURRENCY_CONFIG) as SupportedCurrency[]
}

/**
 * Check if a currency is supported
 */
export function isSupportedCurrency(currency: string): currency is SupportedCurrency {
  return currency in CURRENCY_CONFIG
}
