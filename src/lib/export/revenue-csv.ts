import { calculateRevenueForReservation } from '@/lib/financial/revenue-calculator'
import { formatDateOnly } from '@/lib/dates/date-only'

export interface RevenueExportReservation {
  id: string
  totalAmount: number
  /** Dia de calendário 'YYYY-MM-DD'. */
  checkIn: string
  checkOut: string
  currency: string
  status: 'confirmed' | 'cancelled' | 'pending'
}

/**
 * CSV de receita por mês. `exportDate` é o "hoje" da organização ('YYYY-MM-DD'), passado por quem chama:
 * a função não lê o relógio nem o fuso do servidor.
 */
export function generateRevenueCsv(
  reservations: RevenueExportReservation[],
  options: { exportDate: string; currency?: string | null; month?: string | null }
): string {
  const { exportDate, currency, month } = options
  const headers = ['Data', 'Reserva ID', 'Check-in', 'Check-out', 'Duração', 'Moeda', 'Valor total', 'Receita do mês', 'Saldo previsto']
  const rows: string[] = [headers.map(h => `"${h}"`).join(',')]

  for (const reservation of reservations) {
    if (reservation.status !== 'confirmed') continue
    if (currency && reservation.currency !== currency) continue

    const result = calculateRevenueForReservation(reservation)

    for (const monthBreakdown of result.monthlyBreakdown) {
      if (month && monthBreakdown.month !== month) continue

      rows.push([
        formatDateOnly(exportDate),
        `"${result.reservationId}"`,
        formatDateOnly(reservation.checkIn),
        formatDateOnly(reservation.checkOut),
        result.durationDays.toString(),
        result.currency,
        result.totalAmount.toFixed(2),
        monthBreakdown.value.toFixed(2),
        monthBreakdown.value.toFixed(2),
      ].join(','))
    }
  }

  return rows.join('\n')
}
