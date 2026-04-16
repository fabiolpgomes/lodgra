// Utilitários para formatação de moedas

export const CURRENCIES = {
  EUR: { symbol: '€', name: 'Euro', locale: 'pt-PT' },
  BRL: { symbol: 'R$', name: 'Real Brasileiro', locale: 'pt-BR' },
  USD: { symbol: '$', name: 'Dólar Americano', locale: 'en-US' },
  GBP: { symbol: '£', name: 'Libra Esterlina', locale: 'en-GB' },
  CHF: { symbol: 'CHF', name: 'Franco Suíço', locale: 'de-CH' },
  JPY: { symbol: '¥', name: 'Iene Japonês', locale: 'ja-JP' },
  CAD: { symbol: 'C$', name: 'Dólar Canadense', locale: 'en-CA' },
  AUD: { symbol: 'A$', name: 'Dólar Australiano', locale: 'en-AU' },
} as const

export type CurrencyCode = keyof typeof CURRENCIES

/**
 * Formata um valor monetário de acordo com a moeda
 * @param amount - Valor numérico
 * @param currency - Código da moeda (EUR, BRL, USD, etc)
 * @param showSymbol - Se deve mostrar o símbolo da moeda
 * @returns String formatada (ex: "€1.234,56" ou "R$ 1.234,56")
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  currency: CurrencyCode = 'EUR',
  showSymbol: boolean = true
): string {
  if (amount === null || amount === undefined || amount === '') {
    return '-'
  }

  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount

  if (isNaN(numAmount)) {
    return '-'
  }

  const currencyInfo = CURRENCIES[currency] || CURRENCIES.EUR
  
  try {
    const formatted = new Intl.NumberFormat(currencyInfo.locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numAmount)

    return formatted
  } catch {
    // Fallback se Intl falhar
    return showSymbol 
      ? `${currencyInfo.symbol} ${numAmount.toFixed(2)}`
      : numAmount.toFixed(2)
  }
}

/**
 * Retorna apenas o símbolo da moeda
 * @param currency - Código da moeda
 * @returns Símbolo (ex: "€", "R$", "$")
 */
export function getCurrencySymbol(currency: CurrencyCode = 'EUR'): string {
  return CURRENCIES[currency]?.symbol || '€'
}

/**
 * Retorna o nome completo da moeda
 * @param currency - Código da moeda
 * @returns Nome (ex: "Euro", "Real Brasileiro")
 */
export function getCurrencyName(currency: CurrencyCode = 'EUR'): string {
  return CURRENCIES[currency]?.name || 'Euro'
}

/**
 * Retorna lista de moedas para usar em select
 * @returns Array de opções
 */
export function getCurrencyOptions() {
  return Object.entries(CURRENCIES).map(([code, info]) => ({
    value: code,
    label: `${info.symbol} ${info.name} (${code})`,
    symbol: info.symbol,
    name: info.name,
  }))
}

/**
 * Agrupa valores por moeda
 * @param items - Array de items com currency e amount
 * @returns Objeto com totais por moeda
 */
export function groupByCurrency(
  items: Array<{ currency: CurrencyCode; amount: number }>
): Record<CurrencyCode, number> {
  return items.reduce((acc, item) => {
    const currency = item.currency || 'EUR'
    acc[currency] = (acc[currency] || 0) + item.amount
    return acc
  }, {} as Record<CurrencyCode, number>)
}

/**
 * Formata múltiplos totais por moeda
 * @param totals - Objeto com totais por moeda
 * @returns String formatada (ex: "€1.000 + R$5.000 + $2.000")
 */
export function formatMultiCurrencyTotals(
  totals: Record<string, number>
): string {
  const formatted = Object.entries(totals)
    .filter(([, amount]) => amount > 0)
    .map(([currency, amount]) => 
      formatCurrency(amount, currency as CurrencyCode)
    )
    .join(' + ')
  
  return formatted || '-'
}
