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
