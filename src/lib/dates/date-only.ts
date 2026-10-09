/**
 * Stay dates are calendar days ("2026-10-11"), not instants. `new Date('2026-10-11')` is UTC midnight,
 * which browsers west of UTC (Brazil) display as the previous day. Build the date in local time instead.
 */
export function toLocalDate(value: string | Date): Date {
  if (value instanceof Date) return value
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(value)
}

const DATE_ONLY_DISPLAY_RE = /^(\d{4})-(\d{2})-(\d{2})(?:T00:00:00(?:\.0+)?Z?)?$/

/**
 * Mostra um dia de calendário ("2026-10-11") como `11/10/2026` (padrão pt-BR/pt-PT).
 * Lê a string diretamente e nunca cria um `Date`, por isso não depende do fuso do browser.
 * Só para colunas de data (check_in, expense_date…), não para timestamps: o que não for uma
 * data-só devolve `fallback`. Um `Date` recebido é lido em hora local.
 */
export function formatDateOnly(value: string | Date | null | undefined, fallback = ''): string {
  if (!value) return fallback
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return fallback
    const day = String(value.getDate()).padStart(2, '0')
    const month = String(value.getMonth() + 1).padStart(2, '0')
    return `${day}/${month}/${value.getFullYear()}`
  }
  const match = DATE_ONLY_DISPLAY_RE.exec(value.trim())
  return match ? `${match[3]}/${match[2]}/${match[1]}` : fallback
}

/**
 * Aritmética de dias de calendário, sem fuso nem DST: trabalha só com o número do dia (UTC),
 * por isso dá o mesmo resultado em Brasil, Portugal e Espanha, também nas mudanças de hora.
 */
const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})/

function dateOnlyToDayNumber(value: string): number {
  const match = DATE_ONLY_RE.exec(value.trim())
  if (!match) return Number.NaN
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / 86400000
}

function dayNumberToDateOnly(day: number): string {
  return new Date(day * 86400000).toISOString().slice(0, 10)
}

/** Soma `days` (pode ser negativo) a "YYYY-MM-DD". Devolve "YYYY-MM-DD". */
export function addDaysToDateOnly(value: string, days: number): string {
  const day = dateOnlyToDayNumber(value)
  if (Number.isNaN(day)) throw new Error(`Invalid date-only value: ${value}`)
  return dayNumberToDateOnly(day + days)
}

/** Dias entre duas datas-só (b - a). NaN se alguma for inválida. */
export function daysBetweenDateOnly(a: string, b: string): number {
  return dateOnlyToDayNumber(b) - dateOnlyToDayNumber(a)
}

/** Dia da semana de "YYYY-MM-DD": 0 = domingo … 6 = sábado. NaN se inválida. */
export function dayOfWeekDateOnly(value: string): number {
  const day = dateOnlyToDayNumber(value)
  return Number.isNaN(day) ? Number.NaN : (((day + 4) % 7) + 7) % 7
}

/**
 * `Date` (lido em hora local, ex.: meia-noite local de um dia do calendário) → 'YYYY-MM-DD'.
 * Substitui `date.toISOString().split('T')[0]`, que converte para UTC e dá o dia errado em
 * fusos a leste (Portugal/Espanha no verão: meia-noite local = 23h UTC do dia anterior).
 */
export function toDateOnly(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Fuso de negócio por omissão (mercado principal), usado quando a organização não tem `timezone`. */
export const DEFAULT_BUSINESS_TIME_ZONE = 'Europe/Lisbon'

/** O dia de calendário ('YYYY-MM-DD') em que o instante `now` cai no fuso `timeZone`. */
export function todayInTimeZone(timeZone: string = DEFAULT_BUSINESS_TIME_ZONE, now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value ?? ''
  return `${value('year')}-${value('month')}-${value('day')}`
}

/**
 * Soma `months` a "YYYY-MM-DD" mantendo o dia, limitado ao último dia do mês de destino
 * (31 de maio − 3 meses = 28 de fevereiro, não 3 de março).
 */
export function addMonthsToDateOnly(value: string, months: number): string {
  const match = DATE_ONLY_RE.exec(value.trim())
  if (!match) throw new Error(`Invalid date-only value: ${value}`)
  const index = Number(match[1]) * 12 + (Number(match[2]) - 1) + months
  const year = Math.floor(index / 12)
  const month = ((index % 12) + 12) % 12
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const day = Math.min(Number(match[3]), lastDay)
  return `${String(year).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
