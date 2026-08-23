export type ReservationCurrencyInput = {
  currency?: string | null
  propertyId?: string | null
}

export function resolveReservationCurrency(
  reservation: ReservationCurrencyInput,
  propertyCurrencies: Record<string, string>,
  organizationCurrency?: string | null
): string | null {
  const reservationCurrency = reservation.currency?.trim().toUpperCase()
  if (reservationCurrency) return reservationCurrency

  const propertyCurrency = reservation.propertyId
    ? propertyCurrencies[reservation.propertyId]?.trim().toUpperCase()
    : undefined

  return propertyCurrency || organizationCurrency?.trim().toUpperCase() || null
}
