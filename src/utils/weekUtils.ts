// ISO 8601 Week Numbering Utility
export function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

export function getISOWeekStartDate(year: number, week: number): Date {
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const dayNum = jan4.getUTCDay() || 7
  jan4.setUTCDate(jan4.getUTCDate() - dayNum + 1)
  jan4.setUTCDate(jan4.getUTCDate() + (week - 1) * 7)
  return new Date(jan4.getTime())
}

export function getWeekDays(date: Date): Date[] {
  const weekNum = getISOWeekNumber(date)
  const year = date.getFullYear()
  const weekStart = getISOWeekStartDate(year, weekNum)

  // ISO week starts on Monday (day 1), but calendar needs Sunday start (day 0)
  // Backtrack to previous Sunday
  const dayOfWeek = weekStart.getUTCDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const daysToSubtract = dayOfWeek === 0 ? 0 : dayOfWeek // If Monday (1), subtract 1 day

  const sundayStart = new Date(weekStart)
  if (daysToSubtract > 0) {
    sundayStart.setUTCDate(sundayStart.getUTCDate() - daysToSubtract)
  }

  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(sundayStart)
    d.setUTCDate(d.getUTCDate() + i)
    days.push(d)
  }
  return days
}
