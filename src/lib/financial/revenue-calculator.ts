/**
 * Revenue calculator for proportional distribution across months.
 * Handles both simple (≤30 days) and complex (>30 days) reservation scenarios.
 * Formula: (Total / Days) × 30 for >30 day reservations
 *
 * TIMEZONE: All date calculations use UTC to ensure consistency across timezones.
 * Check-in/check-out dates are always interpreted as UTC dates, regardless of browser/server timezone.
 * This prevents edge cases where a user in UTC+8 gets different month distribution than UTC-8.
 */

interface ReservationData {
  id: string
  totalAmount: number
  checkIn: Date | string
  checkOut: Date | string
  currency: string
  status: 'confirmed' | 'cancelled' | 'pending'
}

interface MonthlyRevenue {
  month: string
  actual: number
  predicted: number
}

interface RevenueCalculationResult {
  currency: string
  reservationId: string
  totalAmount: number
  durationDays: number
  monthlyBreakdown: {
    month: string
    value: number
    daysInMonth: number
    isActual: boolean
  }[]
}

function roundTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100
}

function getDaysInMonth(year: number, month: number): number {
  // UTC-safe: Get last day of month using UTC dates
  const lastDay = new Date(Date.UTC(year, month + 1, 0))
  return lastDay.getUTCDate()
}

function getMonthKey(date: Date): string {
  // UTC-safe: Use UTC components for month key
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

function calculateDaysBetween(checkIn: Date, checkOut: Date): number {
  const oneDay = 24 * 60 * 60 * 1000
  return Math.ceil((checkOut.getTime() - checkIn.getTime()) / oneDay)
}

/**
 * Calculate monthly revenue breakdown for a single reservation.
 * AC2: ≤30 days → 100% in check-in month
 * AC3: >30 days → Proportional distribution using formula: (Total / Days) × daysInMonth
 */
export function calculateRevenueForReservation(
  reservation: ReservationData
): RevenueCalculationResult {
  // Parse dates as UTC (treat input strings as UTC dates)
  const checkInStr = typeof reservation.checkIn === 'string' ? reservation.checkIn : reservation.checkIn.toISOString().split('T')[0]
  const checkOutStr = typeof reservation.checkOut === 'string' ? reservation.checkOut : reservation.checkOut.toISOString().split('T')[0]

  const checkIn = new Date(`${checkInStr}T00:00:00Z`)
  const checkOut = new Date(`${checkOutStr}T00:00:00Z`)
  const durationDays = calculateDaysBetween(checkIn, checkOut)
  const checkOutMonthKey = getMonthKey(checkOut)

  const monthlyBreakdown: RevenueCalculationResult['monthlyBreakdown'] = []

  if (durationDays <= 30) {
    // AC2: Reservas < 30 dias → 100% no mês do checkout
    // isActual: true se mês >= checkout month (pagamento no mês do checkout ou depois)
    const month = checkOutMonthKey
    const isActual = month >= checkOutMonthKey // True if month is checkout month or later
    monthlyBreakdown.push({
      month,
      value: roundTwoDecimals(reservation.totalAmount),
      daysInMonth: getDaysInMonth(checkOut.getUTCFullYear(), checkOut.getUTCMonth()),
      isActual
    })
  } else if (durationDays <= 60) {
    // AC2b: Reservas 30-60 dias → 100% no mês do checkout
    // isActual: true se mês >= checkout month
    const month = checkOutMonthKey
    const isActual = month >= checkOutMonthKey // True if month is checkout month or later
    monthlyBreakdown.push({
      month,
      value: roundTwoDecimals(reservation.totalAmount),
      daysInMonth: getDaysInMonth(checkOut.getUTCFullYear(), checkOut.getUTCMonth()),
      isActual
    })
  } else {
    // AC3: Reservas > 60 dias → Distribuição proporcional (Total / 30 dias considerando leap years)
    let remainingAmount = reservation.totalAmount
    let remainingDays = durationDays
    let currentDate = new Date(checkIn)

    while (remainingDays > 0) {
      const year = currentDate.getUTCFullYear()
      const monthIndex = currentDate.getUTCMonth()
      const daysInCurrentMonth = getDaysInMonth(year, monthIndex)
      const dayOfMonthStart = currentDate.getUTCDate()

      // Days in this month
      // For first month: exclude check-in day itself, count rest = daysInMonth - dayOfCheckin
      // For other months: count all days = daysInMonth
      const daysToUse = Math.min(
        remainingDays,
        monthlyBreakdown.length === 0
          ? daysInCurrentMonth - dayOfMonthStart
          : daysInCurrentMonth
      )

      // AC3 formula: Receita = (Saldo / Dias Restantes) × Dias do Mês
      const monthlyValue = roundTwoDecimals((remainingAmount / remainingDays) * daysToUse)

      // isActual: true se mês >= checkout month (pagamento proporcional a partir do checkout)
      const currentMonthKey = getMonthKey(currentDate)
      const isActual = currentMonthKey >= checkOutMonthKey

      monthlyBreakdown.push({
        month: currentMonthKey,
        value: monthlyValue,
        daysInMonth: daysInCurrentMonth,
        isActual
      })

      remainingAmount -= monthlyValue
      remainingDays -= daysToUse

      // Move to first day of next month (UTC-safe)
      currentDate = new Date(Date.UTC(year, monthIndex + 1, 1))
    }
  }

  return {
    currency: reservation.currency,
    reservationId: reservation.id,
    totalAmount: reservation.totalAmount,
    durationDays,
    monthlyBreakdown
  }
}

/**
 * Aggregate revenue across multiple reservations grouped by currency and month.
 * Returns actual (current month) and predicted (future months) values.
 */
export function aggregateMonthlyRevenue(
  reservations: ReservationData[],
  referenceDate: Date = new Date()
): Map<string, MonthlyRevenue[]> {
  const byCurrency = new Map<string, Map<string, { actual: number; predicted: number }>>()

  // Filter confirmed reservations only (AC3: exclude cancelled)
  const confirmedReservations = reservations.filter(r => r.status === 'confirmed')

  for (const reservation of confirmedReservations) {
    const result = calculateRevenueForReservation(reservation)
    const currency = result.currency

    if (!byCurrency.has(currency)) {
      byCurrency.set(currency, new Map())
    }

    const currencyData = byCurrency.get(currency)!

    for (const monthData of result.monthlyBreakdown) {
      if (!currencyData.has(monthData.month)) {
        currencyData.set(monthData.month, { actual: 0, predicted: 0 })
      }

      const existing = currencyData.get(monthData.month)!
      const currentMonthKey = getMonthKey(referenceDate)

      if (monthData.month === currentMonthKey) {
        existing.actual += monthData.value
      } else {
        existing.predicted += monthData.value
      }
    }
  }

  // Convert to array format for API response
  const result = new Map<string, MonthlyRevenue[]>()
  for (const [currency, monthData] of byCurrency.entries()) {
    const monthlyArray = Array.from(monthData.entries())
      .sort(([monthA], [monthB]) => monthA.localeCompare(monthB))
      .map(([month, { actual, predicted }]) => ({
        month,
        actual: roundTwoDecimals(actual),
        predicted: roundTwoDecimals(predicted)
      }))
    result.set(currency, monthlyArray)
  }

  return result
}

/**
 * Calculate profit (revenue - expenses) for a specific month and currency.
 * AC5: Lucro Real = Receita (valor real) - Despesas
 */
export function calculateProfit(
  revenue: number,
  expenses: number
): number {
  return roundTwoDecimals(revenue - expenses)
}

/**
 * AC1: Aggregate all reservations by currency to show booking forecast.
 */
export function calculateForecast(reservations: ReservationData[]): Map<string, number> {
  const byCurrency = new Map<string, number>()

  const confirmedReservations = reservations.filter(r => r.status === 'confirmed')

  for (const reservation of confirmedReservations) {
    const current = byCurrency.get(reservation.currency) || 0
    byCurrency.set(reservation.currency, current + reservation.totalAmount)
  }

  return byCurrency
}
