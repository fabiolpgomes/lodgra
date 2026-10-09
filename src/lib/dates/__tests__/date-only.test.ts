import { formatDateOnly, toLocalDate } from '../date-only'

describe('toLocalDate', () => {
  it('keeps the calendar day of a date-only value in any time zone', () => {
    const date = toLocalDate('2026-10-11')
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 9, 11])
  })
  it('leaves timestamps and Date objects untouched', () => {
    const instant = '2026-10-11T22:30:00Z'
    expect(toLocalDate(instant).toISOString()).toBe('2026-10-11T22:30:00.000Z')
    const value = new Date()
    expect(toLocalDate(value)).toBe(value)
  })
})

describe('formatDateOnly', () => {
  it('formats a calendar day as DD/MM/YYYY without shifting it', () => {
    expect(formatDateOnly('2026-10-09')).toBe('09/10/2026')
    expect(formatDateOnly('2026-01-01')).toBe('01/01/2026')
    expect(formatDateOnly('2026-12-31')).toBe('31/12/2026')
  })

  it('accepts a midnight ISO timestamp that came from a date column', () => {
    expect(formatDateOnly('2026-10-09T00:00:00Z')).toBe('09/10/2026')
    expect(formatDateOnly('2026-10-09T00:00:00.000Z')).toBe('09/10/2026')
  })

  it('refuses real timestamps and garbage instead of guessing a day', () => {
    expect(formatDateOnly('2026-10-09T23:30:00Z')).toBe('')
    expect(formatDateOnly('09/10/2026')).toBe('')
    expect(formatDateOnly('not a date', '—')).toBe('—')
    expect(formatDateOnly('')).toBe('')
    expect(formatDateOnly(null, '—')).toBe('—')
    expect(formatDateOnly(undefined)).toBe('')
  })

  it('formats a Date object with its local calendar day', () => {
    expect(formatDateOnly(new Date(2026, 9, 9))).toBe('09/10/2026')
    expect(formatDateOnly(toLocalDate('2026-10-09'))).toBe('09/10/2026')
    expect(formatDateOnly(new Date('invalid'), '—')).toBe('—')
  })
})


import { addDaysToDateOnly, daysBetweenDateOnly, dayOfWeekDateOnly } from '../date-only'

describe('aritmética de dias de calendário', () => {
  it('dia da semana não depende do fuso', () => {
    expect(dayOfWeekDateOnly('2026-05-22')).toBe(5) // sexta
    expect(dayOfWeekDateOnly('2026-05-23')).toBe(6) // sábado
    expect(dayOfWeekDateOnly('2026-05-24')).toBe(0) // domingo
  })

  it('soma dias atravessando a mudança de hora PT/ES (2026-10-25) e fim de mês/ano', () => {
    expect(addDaysToDateOnly('2026-10-24', 1)).toBe('2026-10-25')
    expect(addDaysToDateOnly('2026-10-25', 1)).toBe('2026-10-26')
    expect(addDaysToDateOnly('2026-03-28', 2)).toBe('2026-03-30')
    expect(addDaysToDateOnly('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDaysToDateOnly('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('diferença em dias é exata na mudança de hora', () => {
    expect(daysBetweenDateOnly('2026-10-24', '2026-10-27')).toBe(3)
    expect(daysBetweenDateOnly('2026-03-28', '2026-03-31')).toBe(3)
    expect(daysBetweenDateOnly('2026-05-01', '2026-05-01')).toBe(0)
    expect(daysBetweenDateOnly('x', '2026-05-01')).toBeNaN()
  })
})

import { toDateOnly } from '../date-only'

describe('toDateOnly', () => {
  it('devolve o dia local, não o dia UTC (meia-noite local em fusos a leste/oeste)', () => {
    expect(toDateOnly(new Date(2026, 6, 1))).toBe('2026-07-01')
    expect(toDateOnly(new Date(2026, 9, 25))).toBe('2026-10-25')
    expect(toDateOnly(new Date(2026, 0, 1, 23, 59))).toBe('2026-01-01')
  })
})

import { todayInTimeZone, addMonthsToDateOnly } from '../date-only'

describe('todayInTimeZone / addMonthsToDateOnly', () => {
  it('o mesmo instante é dias diferentes em fusos diferentes', () => {
    const instant = new Date('2026-08-01T01:30:00Z')
    expect(todayInTimeZone('America/Sao_Paulo', instant)).toBe('2026-07-31')
    expect(todayInTimeZone('Europe/Lisbon', instant)).toBe('2026-08-01')
    expect(todayInTimeZone('Europe/Madrid', instant)).toBe('2026-08-01')
  })

  it('acompanha a mudança de hora de 2026-10-25 em Lisboa', () => {
    // antes da mudança (UTC+1): 23h30 UTC do dia 24 já é dia 25 em Lisboa
    expect(todayInTimeZone('Europe/Lisbon', new Date('2026-10-24T23:30:00Z'))).toBe('2026-10-25')
    // depois da mudança (UTC+0): 23h30 UTC do dia 25 ainda é dia 25; 00h30 UTC do 26 já é dia 26
    expect(todayInTimeZone('Europe/Lisbon', new Date('2026-10-25T23:30:00Z'))).toBe('2026-10-25')
    expect(todayInTimeZone('Europe/Lisbon', new Date('2026-10-26T00:30:00Z'))).toBe('2026-10-26')
  })

  it('soma meses limitando ao último dia do mês', () => {
    expect(addMonthsToDateOnly('2026-05-31', -3)).toBe('2026-02-28')
    expect(addMonthsToDateOnly('2028-05-31', -3)).toBe('2028-02-29')
    expect(addMonthsToDateOnly('2026-01-15', -3)).toBe('2025-10-15')
    expect(addMonthsToDateOnly('2026-11-30', 3)).toBe('2027-02-28')
  })
})
