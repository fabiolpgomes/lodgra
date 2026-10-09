import { groupFutureByMonth, overlapNights, summarizeHorizon } from '../future-forecast'

const r = (id: string, check_in: string, check_out: string, total_amount: number) => ({ id, check_in, check_out, total_amount })
const eur = () => 'EUR'

describe('future-forecast (dias de calendário)', () => {
  it('overlapNights corta a estadia à janela (fim exclusivo)', () => {
    expect(overlapNights('2026-10-20', '2026-10-30', '2026-10-25', '2026-11-01')).toBe(5)
    expect(overlapNights('2026-10-20', '2026-10-30', '2026-11-01', '2026-12-01')).toBe(0)
    expect(overlapNights('2026-10-24', '2026-10-27', '2026-10-01', '2026-11-01')).toBe(3) // mudança de hora 25/10
  })

  it('summarizeHorizon reparte a receita pelas noites dentro da janela', () => {
    const out = summarizeHorizon([r('a', '2026-10-24', '2026-10-28', 400)], '2026-10-26', '2026-11-05', eur)
    expect(out.nights).toBe(2)
    expect(out.revenueByCurrency.EUR).toBeCloseTo(200)
    expect(out.reservations).toBe(1)
  })

  it('ignora estadias vazias ou inválidas', () => {
    const out = summarizeHorizon([r('a', '2026-10-24', '2026-10-24', 100), r('b', 'x', 'y', 100)], '2026-10-01', '2026-11-01', eur)
    expect(out).toEqual({ revenueByCurrency: {}, reservations: 0, nights: 0 })
  })

  it('groupFutureByMonth divide uma estadia que atravessa o mês proporcionalmente às noites', () => {
    const out = groupFutureByMonth([r('a', '2026-10-30', '2026-11-03', 400)], k => `m${k}`)
    expect(Object.keys(out).sort()).toEqual(['2026-10', '2026-11'])
    expect(out['2026-10'].reservations[0].total_amount).toBeCloseTo(200) // noites de 30 e 31/10: 2 de 4
    expect(out['2026-11'].reservations[0].total_amount).toBeCloseTo(200) // noites de 1 e 2/11
  })
})
