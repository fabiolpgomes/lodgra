import { formatCurrency, type CurrencyCode } from '@/lib/utils/currency'

export type MoneyMap = Record<string, number>

export type CompanyExpenseRow = {
  id: string
  description: string
  amount?: number | string | null
  currency?: string | null
  category?: string | null
  expense_date?: string | null
  recurrence_type?: string | null
  recurrence_end_date?: string | null
  status?: string | null
  notes?: string | null
}

export const COMPANY_EXPENSE_CATEGORIES = [
  { value: 'software', label: 'Software e sistemas' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'accounting', label: 'Contabilidade' },
  { value: 'salary', label: 'Salários e prestadores' },
  { value: 'tax', label: 'Impostos da empresa' },
  { value: 'bank_fee', label: 'Taxas bancárias' },
  { value: 'legal', label: 'Jurídico' },
  { value: 'office', label: 'Escritório' },
  { value: 'travel', label: 'Deslocações' },
  { value: 'other', label: 'Outros' },
] as const

export const COMPANY_EXPENSE_CATEGORY_LABELS = Object.fromEntries(
  COMPANY_EXPENSE_CATEGORIES.map((item) => [item.value, item.label])
) as Record<string, string>

export const COMPANY_EXPENSE_RECURRENCE_LABELS: Record<string, string> = {
  none: 'Única',
  monthly: 'Mensal',
  yearly: 'Anual',
}

export const COMPANY_EXPENSE_STATUS_LABELS: Record<string, string> = {
  paid: 'Pago',
  pending: 'Pendente',
  planned: 'Planeado',
  cancelled: 'Cancelado',
}

export function addMoney(target: MoneyMap, currency: string, amount: number) {
  target[currency] = (target[currency] || 0) + amount
}

export function subtractMoney(left: MoneyMap, right: MoneyMap) {
  const result = { ...left }
  Object.entries(right).forEach(([currency, amount]) => addMoney(result, currency, -amount))
  return result
}

export function formatMoneyMapText(values: MoneyMap) {
  const entries = Object.entries(values)
    .filter(([, amount]) => Math.abs(amount) > 0.005)
    .sort(([a], [b]) => a.localeCompare(b))

  if (entries.length === 0) return '-'

  return entries
    .map(([currency, amount]) => formatCurrency(amount, currency as CurrencyCode))
    .join(' / ')
}

function parseDate(value?: string | null) {
  if (!value) return null
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function monthStart(year: number, monthIndex: number) {
  return new Date(year, monthIndex, 1)
}

function monthEnd(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0)
}

function isWithin(date: Date, start: Date, end: Date) {
  return date.getTime() >= start.getTime() && date.getTime() <= end.getTime()
}

export function getCompanyExpenseOccurrencesForYear(expense: CompanyExpenseRow, year: number) {
  const startDate = parseDate(expense.expense_date)
  if (!startDate || expense.status === 'cancelled') return []

  const amount = Number(expense.amount || 0)
  if (!Number.isFinite(amount) || amount <= 0) return []

  const currency = (expense.currency || 'EUR').toUpperCase()
  const recurrenceType = expense.recurrence_type || 'none'
  const recurrenceEnd = parseDate(expense.recurrence_end_date)
  const yearStart = new Date(year, 0, 1)
  const yearEnd = new Date(year, 11, 31)
  const activeEnd = recurrenceEnd && recurrenceEnd < yearEnd ? recurrenceEnd : yearEnd

  if (activeEnd < yearStart || startDate > yearEnd) return []

  if (recurrenceType === 'monthly') {
    return Array.from({ length: 12 }, (_, monthIndex) => ({ monthIndex }))
      .filter(({ monthIndex }) => {
        const start = monthStart(year, monthIndex)
        const end = monthEnd(year, monthIndex)
        return startDate <= end && activeEnd >= start
      })
      .map(({ monthIndex }) => ({ monthIndex, currency, amount }))
  }

  if (recurrenceType === 'yearly') {
    const occurrence = new Date(year, startDate.getMonth(), startDate.getDate())
    return isWithin(occurrence, yearStart, activeEnd) && occurrence >= startDate
      ? [{ monthIndex: occurrence.getMonth(), currency, amount }]
      : []
  }

  return startDate.getFullYear() === year
    ? [{ monthIndex: startDate.getMonth(), currency, amount }]
    : []
}

export function sumCompanyExpensesForYear(expenses: CompanyExpenseRow[], year: number) {
  const total: MoneyMap = {}
  const monthly = Array.from({ length: 12 }, () => ({} as MoneyMap))

  expenses.forEach((expense) => {
    getCompanyExpenseOccurrencesForYear(expense, year).forEach(({ monthIndex, currency, amount }) => {
      addMoney(total, currency, amount)
      addMoney(monthly[monthIndex], currency, amount)
    })
  })

  return { total, monthly }
}
