// Currency code to symbol mapping
export const currencySymbols: Record<string, string> = {
  'EUR': '€',
  'BRL': 'R$',
  'USD': '$',
  'GBP': '£',
  'JPY': '¥',
  'CNY': '¥',
  'INR': '₹',
  'MXN': '$',
  'AUD': '$',
  'CAD': '$',
  'CHF': 'CHF',
  'SEK': 'kr',
  'NOK': 'kr',
  'DKK': 'kr',
  'NZD': '$',
  'SGD': '$',
  'HKD': '$',
  'ZAR': 'R',
  'AED': 'د.إ',
  'SAR': 'ر.س',
}

export function getCurrencySymbol(currencyCode: string | null | undefined = 'EUR'): string {
  if (!currencyCode) return currencySymbols['EUR']
  return currencySymbols[currencyCode.toUpperCase()] || currencyCode
}
