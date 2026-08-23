import { CURRENCIES, formatCurrency, type CurrencyCode } from '@/lib/utils/currency'

export const REPORT_MISSING_CURRENCY_LABEL = 'sem moeda'

const KNOWN_CURRENCIES = new Set<CurrencyCode>(Object.keys(CURRENCIES) as CurrencyCode[])

export function resolveReportCurrency(value: string | null | undefined): CurrencyCode | null {
  if (!value) {
    return null
  }

  const normalized = value.toUpperCase() as CurrencyCode
  return KNOWN_CURRENCIES.has(normalized) ? normalized : null
}

export function formatReportAmount(amount: number, currency: string | null | undefined): string {
  const resolvedCurrency = resolveReportCurrency(currency)

  if (resolvedCurrency) {
    return formatCurrency(amount, resolvedCurrency)
  }

  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function reportCurrencyLabel(currency: string | null | undefined): string {
  return resolveReportCurrency(currency) ?? REPORT_MISSING_CURRENCY_LABEL
}

export function groupReportByCurrency(
  items: Array<{ currency?: string | null; amount: number }>
): Record<string, number> {
  return items.reduce((acc, item) => {
    const currency = reportCurrencyLabel(item.currency)
    acc[currency] = (acc[currency] || 0) + item.amount
    return acc
  }, {} as Record<string, number>)
}
