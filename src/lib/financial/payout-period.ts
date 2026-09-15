import {
  calcularRepasse,
  PayoutCalculationInputError,
  SUPPORTED_PAYOUT_CURRENCIES,
  type DespesaRepasse,
  type RegraRepasse,
  type ReservaRepasse,
  type ResultadoRepasse,
} from './payout-rules'
import type { PayoutDataQualityIssue } from './payout-contract'

const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const DECIMAL_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d+)?$/
const MAX_DATASET_SIZE = 10_000
const MILLISECONDS_PER_DAY = 86_400_000

export type ReservationFinancialLineage = {
  grossRevenueSemantics: 'exclusive_service_fees' | 'unknown'
  serviceFeeSnapshot: boolean
  cleaningFeeAmount: string | null
  otaFeeSnapshot: boolean
}

export type PayoutReservationRow = {
  id: string
  organizationId: string
  propertyId: string
  status: string
  checkIn: string
  checkOut: string
  currency: string | null
  totalAmount: string | null
  serviceFeeAmount: string | null
  platformFee: string | null
  discountAmount: string | null
  lineage: ReservationFinancialLineage
}

export type PayoutExpenseRow = {
  id: string
  organizationId: string
  propertyId: string
  expenseDate: string
  currency: string | null
  amount: string | null
}

export type CivilMonthPeriod = {
  month: string
  inicio: string
  fim: string
}

export class PayoutDataIncompleteError extends Error {
  readonly code = 'PAYOUT_DATA_INCOMPLETE'

  constructor(readonly issues: PayoutDataQualityIssue[]) {
    super('Os dados financeiros do período estão incompletos')
    this.name = 'PayoutDataIncompleteError'
  }
}

function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function parseIsoDate(value: string): Date | null {
  if (!DATE_PATTERN.test(value)) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(date.getTime()) || formatUtcDate(date) !== value ? null : date
}

export function getCivilMonthPeriod(month: string): CivilMonthPeriod {
  const match = MONTH_PATTERN.exec(month)
  if (!match) throw new Error('periodo deve usar o formato YYYY-MM')

  const year = Number(match[1])
  const monthIndex = Number(match[2]) - 1
  const start = new Date(Date.UTC(year, monthIndex, 1))
  const end = new Date(Date.UTC(year, monthIndex + 1, 0))

  return { month, inicio: formatUtcDate(start), fim: formatUtcDate(end) }
}

export function getPreviousCivilMonth(referenceDate: Date = new Date()): CivilMonthPeriod {
  if (Number.isNaN(referenceDate.getTime())) throw new Error('data de referência inválida')
  const previous = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth() - 1, 1))
  const month = `${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, '0')}`
  return getCivilMonthPeriod(month)
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

function countNights(checkIn: Date, checkOut: Date): number {
  return (checkOut.getTime() - checkIn.getTime()) / MILLISECONDS_PER_DAY
}

export function getReservationMonthBuckets(checkInValue: string, checkOutValue: string): {
  totalNights: number
  buckets: { month: string; occupiedNights: number }[]
} {
  const checkIn = parseIsoDate(checkInValue)
  const checkOut = parseIsoDate(checkOutValue)
  if (!checkIn || !checkOut || checkIn >= checkOut) throw new Error('datas da reserva inválidas')

  const totalNights = countNights(checkIn, checkOut)
  if (totalNights <= 30) {
    return { totalNights, buckets: [{ month: monthKey(checkIn), occupiedNights: totalNights }] }
  }
  if (totalNights <= 60) {
    return { totalNights, buckets: [{ month: monthKey(checkOut), occupiedNights: totalNights }] }
  }

  const buckets = new Map<string, number>()
  for (let cursor = new Date(checkIn); cursor < checkOut; cursor = new Date(cursor.getTime() + MILLISECONDS_PER_DAY)) {
    const key = monthKey(cursor)
    buckets.set(key, (buckets.get(key) ?? 0) + 1)
  }
  return {
    totalNights,
    buckets: Array.from(buckets, ([month, occupiedNights]) => ({ month, occupiedNights })),
  }
}

export function parseDecimalToMinor(value: string, field: string): number {
  const normalized = value.trim()
  if (!DECIMAL_PATTERN.test(normalized)) throw new Error(`${field} deve ser um decimal não negativo`)
  const [whole, fraction = ''] = normalized.split('.')
  if (fraction.length > 2) throw new Error(`${field} aceita no máximo duas casas decimais`)
  const minor = BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, '0'))
  if (minor > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error(`${field} excede o intervalo monetário seguro`)
  return Number(minor)
}

export function allocateMinorByMonth(
  totalMinor: number,
  totalNights: number,
  buckets: { month: string; occupiedNights: number }[],
): Map<string, number> {
  if (!Number.isSafeInteger(totalMinor) || totalMinor < 0 || !Number.isSafeInteger(totalNights) || totalNights <= 0) {
    throw new Error('parâmetros de rateio inválidos')
  }
  if (buckets.length === 0 || buckets.reduce((sum, bucket) => sum + bucket.occupiedNights, 0) !== totalNights) {
    throw new Error('buckets de rateio não reconciliam as noites')
  }

  const allocation = new Map<string, number>()
  let allocated = BigInt(0)
  buckets.forEach((bucket, index) => {
    const value = index === buckets.length - 1
      ? BigInt(totalMinor) - allocated
      : BigInt(totalMinor) * BigInt(bucket.occupiedNights) / BigInt(totalNights)
    allocated += value
    allocation.set(bucket.month, Number(value))
  })
  return allocation
}

function issue(
  code: PayoutDataQualityIssue['code'],
  entityType: PayoutDataQualityIssue['entityType'],
  entityId?: string,
  field?: string,
): PayoutDataQualityIssue {
  return { code, entityType, ...(entityId ? { entityId } : {}), ...(field ? { field } : {}) }
}

function normalizeCurrency(
  value: string | null,
  expectedCurrency: string,
  entityType: 'reservation' | 'expense',
  entityId: string,
  issues: PayoutDataQualityIssue[],
): string | null {
  const currency = value?.trim().toUpperCase() ?? ''
  if (!SUPPORTED_PAYOUT_CURRENCIES.has(expectedCurrency)) {
    issues.push(issue('UNSUPPORTED_CURRENCY', 'dataset', undefined, 'currency'))
    return null
  }
  if (!SUPPORTED_PAYOUT_CURRENCIES.has(currency)) {
    issues.push(issue('UNSUPPORTED_CURRENCY', entityType, entityId, 'currency'))
    return null
  }
  if (currency !== expectedCurrency) {
    issues.push(issue('CURRENCY_MISMATCH', entityType, entityId, 'currency'))
    return null
  }
  return currency
}

function financialMinor(
  value: string | null,
  code: PayoutDataQualityIssue['code'],
  entityId: string,
  field: string,
  issues: PayoutDataQualityIssue[],
): number | null {
  if (value === null) {
    issues.push(issue(code, 'reservation', entityId, field))
    return null
  }
  try {
    return parseDecimalToMinor(value, field)
  } catch {
    issues.push(issue('INVALID_FINANCIAL_VALUE', 'reservation', entityId, field))
    return null
  }
}

export function adaptPayoutDataForPeriod(input: {
  organizationId: string
  propertyId: string
  currency: string
  period: CivilMonthPeriod
  reservations: PayoutReservationRow[]
  expenses: PayoutExpenseRow[]
}): { reservas: ReservaRepasse[]; despesas: DespesaRepasse[] } {
  const expectedCurrency = input.currency.trim().toUpperCase()
  const issues: PayoutDataQualityIssue[] = []
  const reservas: ReservaRepasse[] = []
  const despesas: DespesaRepasse[] = []

  if (input.reservations.length > MAX_DATASET_SIZE || input.expenses.length > MAX_DATASET_SIZE) {
    throw new PayoutDataIncompleteError([issue('DATASET_TOO_LARGE', 'dataset')])
  }

  const reservationIds = new Set<string>()
  for (const row of input.reservations) {
    if (row.organizationId !== input.organizationId || row.propertyId !== input.propertyId || row.status !== 'confirmed') continue
    if (reservationIds.has(row.id)) {
      issues.push(issue('DUPLICATE_RESERVATION', 'reservation', row.id))
      continue
    }
    reservationIds.add(row.id)

    let bucketData: ReturnType<typeof getReservationMonthBuckets>
    try {
      bucketData = getReservationMonthBuckets(row.checkIn, row.checkOut)
    } catch {
      issues.push(issue('INVALID_RESERVATION_DATES', 'reservation', row.id))
      continue
    }
    const bucket = bucketData.buckets.find(({ month }) => month === input.period.month)
    if (!bucket) continue

    const currency = normalizeCurrency(row.currency, expectedCurrency, 'reservation', row.id, issues)
    if (row.lineage.grossRevenueSemantics !== 'exclusive_service_fees') {
      issues.push(issue(row.totalAmount === null ? 'MISSING_GROSS_REVENUE' : 'AMBIGUOUS_GROSS_REVENUE', 'reservation', row.id, 'total_amount'))
    }
    if (!row.lineage.serviceFeeSnapshot) {
      issues.push(issue('MISSING_SERVICE_FEE_SNAPSHOT', 'reservation', row.id, 'service_fee_amount'))
    }
    if (row.lineage.cleaningFeeAmount === null) {
      issues.push(issue('MISSING_CLEANING_FEE_BREAKDOWN', 'reservation', row.id, 'cleaning_fee_amount'))
    }
    if (!row.lineage.otaFeeSnapshot || row.platformFee === null) {
      issues.push(issue('MISSING_OTA_FEE', 'reservation', row.id, 'platform_fee'))
    }

    const gross = financialMinor(row.totalAmount, 'MISSING_GROSS_REVENUE', row.id, 'total_amount', issues)
    const service = financialMinor(row.serviceFeeAmount, 'MISSING_SERVICE_FEE_SNAPSHOT', row.id, 'service_fee_amount', issues)
    const cleaning = financialMinor(row.lineage.cleaningFeeAmount, 'MISSING_CLEANING_FEE_BREAKDOWN', row.id, 'cleaning_fee_amount', issues)
    const ota = financialMinor(row.platformFee, 'MISSING_OTA_FEE', row.id, 'platform_fee', issues)
    const discount = financialMinor(row.discountAmount ?? '0', 'INVALID_FINANCIAL_VALUE', row.id, 'discount_amount', issues)

    if (!currency || [gross, service, cleaning, ota, discount].some(value => value === null)) continue
    if (
      row.lineage.grossRevenueSemantics !== 'exclusive_service_fees'
      || !row.lineage.serviceFeeSnapshot
      || row.lineage.cleaningFeeAmount === null
      || !row.lineage.otaFeeSnapshot
    ) continue

    const allocate = (value: number): number => bucketData.totalNights > 60
      ? (allocateMinorByMonth(value, bucketData.totalNights, bucketData.buckets).get(input.period.month) ?? 0)
      : value

    reservas.push({
      id: row.id,
      currency,
      receitaBrutaMinor: allocate(gross as number),
      taxasServicoMinor: allocate(service as number),
      taxaLimpezaMinor: allocate(cleaning as number),
      comissaoOtaMinor: allocate(ota as number),
      descontosMinor: allocate(discount as number),
    })
  }

  const expenseIds = new Set<string>()
  for (const row of input.expenses) {
    if (row.organizationId !== input.organizationId || row.propertyId !== input.propertyId) continue
    if (row.expenseDate < input.period.inicio || row.expenseDate > input.period.fim) continue
    if (expenseIds.has(row.id)) {
      issues.push(issue('DUPLICATE_EXPENSE', 'expense', row.id))
      continue
    }
    expenseIds.add(row.id)
    const currency = normalizeCurrency(row.currency, expectedCurrency, 'expense', row.id, issues)
    let value: number | null = null
    try {
      value = row.amount === null ? null : parseDecimalToMinor(row.amount, 'amount')
    } catch {
      value = null
    }
    if (value === null) issues.push(issue('INVALID_FINANCIAL_VALUE', 'expense', row.id, 'amount'))
    if (currency && value !== null) despesas.push({ id: row.id, currency, valorMinor: value })
  }

  if (issues.length > 0) {
    const unique = Array.from(new Map(issues.map(item => [JSON.stringify(item), item])).values())
    throw new PayoutDataIncompleteError(unique)
  }
  return { reservas, despesas }
}

export function buildPayoutPreview(input: {
  organizationId: string
  propertyId: string
  currency: string
  period: CivilMonthPeriod
  reservations: PayoutReservationRow[]
  expenses: PayoutExpenseRow[]
  rule: RegraRepasse
}): ResultadoRepasse {
  const adapted = adaptPayoutDataForPeriod(input)
  try {
    return calcularRepasse(
      adapted.reservas,
      adapted.despesas,
      input.rule,
      { inicio: input.period.inicio, fim: input.period.fim },
      input.currency,
    )
  } catch (error) {
    if (error instanceof PayoutCalculationInputError) {
      throw new PayoutDataIncompleteError([error.code === 'CLEANING_FEE_EXCEEDS_SERVICE_FEES'
        ? issue('INVALID_FINANCIAL_VALUE', 'reservation', error.reservationId, 'cleaning_fee_amount')
        : issue('INVALID_FINANCIAL_VALUE', 'dataset', undefined, 'commission_base')])
    }
    throw error
  }
}
