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

export interface MonthlyRevenue {
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
  const checkInMonthKey = getMonthKey(checkIn)

  const monthlyBreakdown: RevenueCalculationResult['monthlyBreakdown'] = []

  if (durationDays <= 30) {
    // AC2: Reservas ≤ 30 dias → 100% no mês do CHECK-IN
    // isActual: true (real revenue when guest checks in)
    const month = checkInMonthKey
    const isActual = true
    monthlyBreakdown.push({
      month,
      value: roundTwoDecimals(reservation.totalAmount),
      daysInMonth: getDaysInMonth(checkIn.getUTCFullYear(), checkIn.getUTCMonth()),
      isActual
    })
  } else if (durationDays <= 60) {
    // AC2b: Reservas 30-60 dias → 100% no mês do CHECK-IN
    // isActual: true (real revenue when guest checks in)
    const month = checkInMonthKey
    const isActual = true
    monthlyBreakdown.push({
      month,
      value: roundTwoDecimals(reservation.totalAmount),
      daysInMonth: getDaysInMonth(checkIn.getUTCFullYear(), checkIn.getUTCMonth()),
      isActual
    })
  } else {
    // AC3: Reservas > 60 dias → Distribuição proporcional (Total / dias × dias_do_mês)
    // Valor Real: apenas no mês do CHECK-IN
    // Valor Previsto: nos meses seguintes
    let remainingAmount = reservation.totalAmount
    let remainingDays = durationDays
    let currentDate = new Date(checkIn)
    let isFirstMonth = true

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
        isFirstMonth
          ? daysInCurrentMonth - dayOfMonthStart
          : daysInCurrentMonth
      )

      // AC3 formula: Receita = (Saldo / Dias Restantes) × Dias do Mês
      const monthlyValue = roundTwoDecimals((remainingAmount / remainingDays) * daysToUse)

      // isActual: true only for check-in month (Valor Real)
      const currentMonthKey = getMonthKey(currentDate)
      const isActual = isFirstMonth // Only first month (check-in) is Real

      monthlyBreakdown.push({
        month: currentMonthKey,
        value: monthlyValue,
        daysInMonth: daysInCurrentMonth,
        isActual
      })

      remainingAmount -= monthlyValue
      remainingDays -= daysToUse
      isFirstMonth = false

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

      // Use the isActual flag already calculated in calculateRevenueForReservation
      // For >60 days: isActual=true only for check-in month, false for others
      // For ≤60 days: isActual based on checkout month comparison
      if (monthData.isActual) {
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
 * Returns only the PENDING/PREDICTED revenue (not yet received in current month).
 *
 * For each reservation:
 * - If check-in is in current month: subtract the actual revenue already allocated
 * - If check-in is in future months: include full amount (will be predicted/actual later)
 *
 * Example: Reservation R$17.230 (02/05-04/08):
 * - May (current): allocated R$5.318,08 → forecast shows R$11.728,51 (remaining)
 */
export function calculateForecast(reservations: ReservationData[], referenceDate: Date = new Date()): Map<string, number> {
  const byCurrency = new Map<string, number>()
  const currentMonthKey = `${referenceDate.getUTCFullYear()}-${String(referenceDate.getUTCMonth() + 1).padStart(2, '0')}`

  const confirmedReservations = reservations.filter(r => r.status === 'confirmed')

  for (const reservation of confirmedReservations) {
    // Calculate revenue breakdown to get actual amount in current month
    const revenueBreakdown = calculateRevenueForReservation(reservation)

    // Find how much is allocated to the current month
    const currentMonthValue = revenueBreakdown.monthlyBreakdown
      .find(m => m.month === currentMonthKey)
      ?.value || 0

    // Forecast = Total - Current Month Actual = Pending/Predicted revenue
    const forecastValue = revenueBreakdown.totalAmount - currentMonthValue

    if (forecastValue > 0) {
      const currency = reservation.currency
      const current = byCurrency.get(currency) || 0
      byCurrency.set(currency, current + forecastValue)
    }
  }

  return byCurrency
}
