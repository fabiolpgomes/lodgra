jest.mock('server-only', () => ({}))

import { isPendingPaymentStale, pendingPaymentStaleCutoff, PENDING_PAYMENT_STALE_MINUTES } from '../availability-conflict.server'

const NOW = Date.parse('2027-07-01T12:00:00.000Z')
const minutesBefore = (m: number) => new Date(NOW - m * 60 * 1000).toISOString()

describe('isPendingPaymentStale', () => {
  it('dentro do prazo não é velha', () => {
    expect(isPendingPaymentStale(minutesBefore(5), NOW)).toBe(false)
    expect(isPendingPaymentStale(minutesBefore(PENDING_PAYMENT_STALE_MINUTES - 1), NOW)).toBe(false)
  })

  it('passado o prazo é velha', () => {
    expect(isPendingPaymentStale(minutesBefore(PENDING_PAYMENT_STALE_MINUTES + 1), NOW)).toBe(true)
  })

  it('aceita o formato com microssegundos e offset do Postgres', () => {
    expect(isPendingPaymentStale('2027-07-01T11:00:00.123456+00:00', NOW)).toBe(true)
    expect(isPendingPaymentStale('2027-07-01T11:59:00.123456+00:00', NOW)).toBe(false)
  })

  it('data ilegível conta como velha (não bloqueia datas por engano)', () => {
    expect(isPendingPaymentStale('não-é-data', NOW)).toBe(true)
  })

  it('o corte é o mesmo que o filtro de disponibilidade usa', () => {
    expect(pendingPaymentStaleCutoff(NOW)).toBe(minutesBefore(PENDING_PAYMENT_STALE_MINUTES))
  })
})
