/**
 * CSV de receita (/api/dashboard/export): datas são dias de calendário e a data de exportação
 * vem da organização, nunca do relógio/fuso do servidor.
 */
import { generateRevenueCsv, type RevenueExportReservation } from '@/lib/export/revenue-csv'

const reservation = (over: Partial<RevenueExportReservation> = {}): RevenueExportReservation => ({
  id: 'res-1', totalAmount: 400, checkIn: '2026-09-25', checkOut: '2026-12-05', currency: 'EUR', status: 'confirmed', ...over,
})

describe('generateRevenueCsv', () => {
  it('tem o cabeçalho e uma linha por mês da estadia', () => {
    const lines = generateRevenueCsv([reservation()], { exportDate: '2026-10-09' }).split('\n')
    expect(lines[0]).toContain('"Check-in"')
    expect(lines).toHaveLength(5) // estadia >60 dias: set, out, nov e dez
  })

  it('mostra os dias guardados e a data de exportação recebida, em DD/MM/AAAA', () => {
    const [, first] = generateRevenueCsv([reservation()], { exportDate: '2026-10-09' }).split('\n')
    const cols = first.split(',')
    expect(cols[0]).toBe('09/10/2026')
    expect(cols[2]).toBe('25/09/2026')
    expect(cols[3]).toBe('05/12/2026')
  })

  it('filtra por filtros de moeda, mês e estado', () => {
    const csv = generateRevenueCsv(
      [reservation(), reservation({ id: 'res-2', currency: 'BRL' }), reservation({ id: 'res-3', status: 'cancelled' })],
      { exportDate: '2026-10-09', currency: 'EUR', month: '2026-12' }
    )
    const lines = csv.split('\n')
    expect(lines).toHaveLength(2)
    expect(lines[1]).toContain('res-1')
    expect(lines[1]).not.toContain('res-2')
    expect(Number(lines[1].split(',')[7])).toBeGreaterThan(0)
  })
})
