import { CURRENCIES, formatCurrency, type CurrencyCode } from '@/lib/utils/currency'

const KNOWN_CURRENCIES = new Set<CurrencyCode>(Object.keys(CURRENCIES) as CurrencyCode[])

export function resolvePricingCurrency(value: string | null | undefined): CurrencyCode | null {
  if (!value) {
    return null
  }

  const normalized = value.toUpperCase() as CurrencyCode
  return KNOWN_CURRENCIES.has(normalized) ? normalized : null
}

export function formatPricingAmount(amount: number, currency: string | null | undefined): string {
  const resolvedCurrency = resolvePricingCurrency(currency)

  if (resolvedCurrency) {
    return formatCurrency(amount, resolvedCurrency)
  }

  return new Intl.NumberFormat('pt-PT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}
