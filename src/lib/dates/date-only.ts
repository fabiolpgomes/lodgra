/**
 * Stay dates are calendar days ("2026-10-11"), not instants. `new Date('2026-10-11')` is UTC midnight,
 * which browsers west of UTC (Brazil) display as the previous day. Build the date in local time instead.
 */
export function toLocalDate(value: string | Date): Date {
  if (value instanceof Date) return value
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(value)
}
