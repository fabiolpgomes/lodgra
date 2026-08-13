function getIsoMinorUnitDigits(currency: string): number {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency })
      .resolvedOptions().maximumFractionDigits
  } catch {
    throw new RangeError('Invalid Booking monetary value')
  }
}

export function normalizeBookingMoney(amountMinor: number, currency: string): {
  amount: number
  currency: string
} {
  const normalizedCurrency = currency.trim().toUpperCase()
  if (!normalizedCurrency || !Number.isSafeInteger(amountMinor) || amountMinor < 0) {
    throw new RangeError('Invalid Booking monetary value')
  }

  const digits = getIsoMinorUnitDigits(normalizedCurrency)
  const divisor = 10 ** digits
  return {
    amount: amountMinor / divisor,
    currency: normalizedCurrency,
  }
}
