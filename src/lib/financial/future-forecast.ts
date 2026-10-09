import { daysBetweenDateOnly } from '@/lib/dates/date-only'
import { shiftMonthKey } from '@/lib/dashboard/metrics'

/**
 * Previsão de receita de reservas futuras, em dias de calendário ('YYYY-MM-DD'):
 * sem `Date`, logo igual em Brasil, Portugal e Espanha (inclusive nas mudanças de hora).
 */
export interface ForecastReservation {
  id: string
  check_in: string
  check_out: string
  total_amount: number | string | null
}

/** Noites da estadia dentro da janela [winStart, winEnd) (winEnd exclusivo). */
export function overlapNights(checkIn: string, checkOut: string, winStart: string, winEnd: string): number {
  const start = checkIn < winStart ? winStart : checkIn
  const end = checkOut > winEnd ? winEnd : checkOut
  if (start >= end) return 0
  return daysBetweenDateOnly(start, end)
}

/** Receita (repartida proporcionalmente às noites) e noites que caem na janela [winStart, winEnd). */
export function summarizeHorizon<R extends ForecastReservation>(
  reservations: R[],
  winStart: string,
  winEnd: string,
  currencyOf: (reservation: R) => string
): { revenueByCurrency: Record<string, number>; reservations: number; nights: number } {
  const revenueByCurrency: Record<string, number> = {}
  let nights = 0
  const ids = new Set<string>()
  for (const r of reservations) {
    const totalDays = daysBetweenDateOnly(r.check_in, r.check_out)
    if (!(totalDays > 0)) continue
    const overlap = overlapNights(r.check_in, r.check_out, winStart, winEnd)
    if (overlap <= 0) continue
    const currency = currencyOf(r)
    const amount = r.total_amount ? Number(r.total_amount) : 0
    revenueByCurrency[currency] = (revenueByCurrency[currency] || 0) + amount * (overlap / totalDays)
    nights += overlap
    ids.add(r.id)
  }
  return { revenueByCurrency, reservations: ids.size, nights }
}

/** Agrupa por mês ('YYYY-MM'); cada reserva entra em cada mês que toca, com o valor proporcional às noites desse mês. */
export function groupFutureByMonth<R extends ForecastReservation>(
  reservations: R[],
  monthLabel: (monthKey: string) => string
): Record<string, { month: string; reservations: R[] }> {
  const result: Record<string, { month: string; reservations: R[] }> = {}
  for (const r of reservations) {
    const totalDays = daysBetweenDateOnly(r.check_in, r.check_out)
    let monthStart = `${r.check_in.slice(0, 7)}-01`
    while (monthStart <= r.check_out) {
      const nextMonthStart = shiftMonthKey(monthStart, 1)
      const overlap = overlapNights(r.check_in, r.check_out, monthStart, nextMonthStart)
      if (overlap > 0) {
        const key = monthStart.slice(0, 7)
        if (!result[key]) result[key] = { month: monthLabel(key), reservations: [] }
        const proportionalAmount = totalDays > 0
          ? (r.total_amount ? Number(r.total_amount) : 0) * (overlap / totalDays)
          : 0
        result[key].reservations.push({ ...r, total_amount: proportionalAmount })
      }
      monthStart = nextMonthStart
    }
  }
  return result
}
