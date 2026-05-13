/**
 * Revenue calculator for proportional distribution across months.
 * Handles both simple (≤30 days) and complex (>30 days) reservation scenarios.
 * Formula: (Total / Days) × 30 for >30 day reservations
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
  return new Date(year, month + 1, 0).getDate()
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
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
  const checkIn = new Date(reservation.checkIn)
  const checkOut = new Date(reservation.checkOut)
  const durationDays = calculateDaysBetween(checkIn, checkOut)

  const monthlyBreakdown: RevenueCalculationResult['monthlyBreakdown'] = []

  if (durationDays <= 30) {
    // AC2: Simple case - entire amount in check-in month
    const month = getMonthKey(checkIn)
    monthlyBreakdown.push({
      month,
      value: roundTwoDecimals(reservation.totalAmount),
      daysInMonth: getDaysInMonth(checkIn.getFullYear(), checkIn.getMonth()),
      isActual: true
    })
  } else {
    // AC3: Complex case - proportional distribution
    let remainingAmount = reservation.totalAmount
    let remainingDays = durationDays
    let currentDate = new Date(checkIn)

    while (remainingDays > 0) {
      const year = currentDate.getFullYear()
      const monthIndex = currentDate.getMonth()
      const daysInCurrentMonth = getDaysInMonth(year, monthIndex)
      const dayOfMonthStart = currentDate.getDate()

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

      monthlyBreakdown.push({
        month: getMonthKey(currentDate),
        value: monthlyValue,
        daysInMonth: daysInCurrentMonth,
        isActual: remainingDays === durationDays // Only first month is "actual"
      })

      remainingAmount -= monthlyValue
      remainingDays -= daysToUse

      // Move to first day of next month
      currentDate = new Date(year, monthIndex + 1, 1)
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
