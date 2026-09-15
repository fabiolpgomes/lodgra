import type { PayoutDataQualityIssue } from './payout-contract'
import {
  allocateMinorByUnits,
  calcularRepasse,
  SUPPORTED_PAYOUT_CURRENCIES,
  type ComponenteFinanceiro,
  type DespesaRepasse,
  type FatosFinanceirosReservaDetalhadosV2,
  type FatosFinanceirosReservaV2,
  type ModoLiquidacaoCustoCanal,
  type RegraRepasseV2,
  type ResultadoRepasseV2,
} from './payout-rules'
import {
  getCivilMonthPeriod,
  parseDecimalToMinor,
  PayoutDataIncompleteError,
  type CivilMonthPeriod,
  type PayoutExpenseRow,
} from './payout-period'

const COMPONENTS: readonly ComponenteFinanceiro[] = [
  'accommodation', 'cleaning_fee', 'municipal_tax', 'other_guest_fees',
  'discount', 'ota_commission', 'payment_processing_fee',
]

type NullableComponentValues = Record<ComponenteFinanceiro, string | null>

export type CanonicalFinancialSnapshotRow = {
  reservationId: string
  organizationId: string
  propertyId: string
  version: number
  status: 'pending' | 'complete' | 'needs_review'
  factMode: 'component_breakdown' | 'declared_owner_base'
  checkIn: string
  checkOut: string
  currency: string
  values: NullableComponentValues
  declaredOwnerBaseAmount: string | null
  platformAdjustmentAmount: string | null
  otaCommissionBaseAmount: string | null
  managerCleaningCostAmount: string | null
  guestTotalAmount: string | null
  channelNetPayoutAmount: string | null
  otaCommissionSettlement: ModoLiquidacaoCustoCanal | 'unknown'
  paymentProcessingSettlement: ModoLiquidacaoCustoCanal | 'unknown'
  sourceKind: 'manual' | 'ical' | 'channel_api' | 'channel_csv' | 'import'
  provider: string | null
  externalReference: string | null
  capturedAt: string
  sourceMappingVersion: string | null
  sourceMetadata: Record<string, unknown>
}

export type PayoutRecognitionSliceRow = {
  allocationId: string
  reservationId: string
  organizationId: string
  propertyId: string
  payoutAt: string
  reconciliationStatus: 'pending' | 'reconciled' | 'needs_review'
  allocationType: 'reservation' | 'adjustment' | 'refund'
  currency: string
  allocationNetAmount: string
  values: NullableComponentValues
  otaCommissionSettlement: ModoLiquidacaoCustoCanal | 'unknown'
  paymentProcessingSettlement: ModoLiquidacaoCustoCanal | 'unknown'
}

function issue(
  code: PayoutDataQualityIssue['code'],
  entityType: PayoutDataQualityIssue['entityType'],
  entityId?: string,
  field?: string,
): PayoutDataQualityIssue {
  return { code, entityType, ...(entityId ? { entityId } : {}), ...(field ? { field } : {}) }
}

function inPeriod(date: string, period: CivilMonthPeriod): boolean {
  return date >= period.inicio && date <= period.fim
}

function payoutDate(value: string): string | null {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString().slice(0, 10)
}

function civilDayNumber(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const parsed = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return null
  return parsed.getTime() / 86_400_000
}

function getProrataSlice(
  checkIn: string,
  checkOut: string,
  period: CivilMonthPeriod,
): { totalUnits: number; startUnit: number; selectedUnits: number } | null {
  const checkInDay = civilDayNumber(checkIn)
  const checkOutDay = civilDayNumber(checkOut)
  const periodStartDay = civilDayNumber(period.inicio)
  const periodEndDay = civilDayNumber(period.fim)
  if (checkInDay === null || checkOutDay === null || periodStartDay === null || periodEndDay === null) return null
  const totalUnits = checkOutDay - checkInDay
  if (totalUnits <= 0) return null
  const overlapStart = Math.max(checkInDay, periodStartDay)
  const overlapEnd = Math.min(checkOutDay, periodEndDay + 1)
  return {
    totalUnits,
    startUnit: Math.max(0, overlapStart - checkInDay),
    selectedUnits: Math.max(0, overlapEnd - overlapStart),
  }
}

function signedDecimalToMinor(value: string, field: string): number {
  const trimmed = value.trim()
  const negative = trimmed.startsWith('-')
  const absolute = negative ? trimmed.slice(1) : trimmed
  const minor = parseDecimalToMinor(absolute, field)
  return negative ? -minor : minor
}

function normalizeCurrency(
  value: string,
  expected: string,
  entityType: PayoutDataQualityIssue['entityType'],
  entityId: string,
  issues: PayoutDataQualityIssue[],
): string | null {
  const normalized = value.trim().toUpperCase()
  if (!SUPPORTED_PAYOUT_CURRENCIES.has(expected) || !SUPPORTED_PAYOUT_CURRENCIES.has(normalized)) {
    issues.push(issue('UNSUPPORTED_CURRENCY', entityType, entityId, 'currency'))
    return null
  }
  if (normalized !== expected) {
    issues.push(issue('CURRENCY_MISMATCH', entityType, entityId, 'currency'))
    return null
  }
  return normalized
}

function parseComponents(
  values: NullableComponentValues,
  rule: RegraRepasseV2,
  entityType: 'reservation' | 'allocation',
  entityId: string,
  issues: PayoutDataQualityIssue[],
): Partial<Record<ComponenteFinanceiro, number>> | null {
  const parsed: Partial<Record<ComponenteFinanceiro, number>> = {}
  let valid = true
  for (const component of COMPONENTS) {
    const value = values[component]
    const policy = rule.componentes.find(item => item.componente === component)
    const required = !policy
      || policy.efeitoNaBaseComissao !== 'ignore'
      || policy.efeitoNoExtratoProprietario !== 'ignore'
    if (value === null) {
      if (!required) continue
      issues.push(issue(
        component === 'accommodation' ? 'MISSING_ACCOMMODATION_AMOUNT' : 'MISSING_COMPONENT_BREAKDOWN',
        entityType,
        entityId,
        component,
      ))
      valid = false
      continue
    }
    try {
      parsed[component] = parseDecimalToMinor(value, component)
    } catch {
      issues.push(issue('INVALID_FINANCIAL_VALUE', entityType, entityId, component))
      valid = false
    }
  }
  return valid ? parsed : null
}

function parseExpenses(
  rows: PayoutExpenseRow[],
  organizationId: string,
  propertyId: string,
  currency: string,
  period: CivilMonthPeriod,
  issues: PayoutDataQualityIssue[],
): DespesaRepasse[] {
  const result: DespesaRepasse[] = []
  const ids = new Set<string>()
  for (const row of rows) {
    if (row.organizationId !== organizationId || row.propertyId !== propertyId || !inPeriod(row.expenseDate, period)) continue
    if (ids.has(row.id)) {
      issues.push(issue('DUPLICATE_EXPENSE', 'expense', row.id))
      continue
    }
    ids.add(row.id)
    if (!row.amount) {
      issues.push(issue('INVALID_FINANCIAL_VALUE', 'expense', row.id, 'amount'))
      continue
    }
    if (!normalizeCurrency(row.currency ?? '', currency, 'expense', row.id, issues)) continue
    try {
      result.push({ id: row.id, currency, valorMinor: parseDecimalToMinor(row.amount, 'amount') })
    } catch {
      issues.push(issue('INVALID_FINANCIAL_VALUE', 'expense', row.id, 'amount'))
    }
  }
  return result
}

export function adaptCanonicalPayoutDataForPeriod(input: {
  organizationId: string
  propertyId: string
  currency: string
  period: CivilMonthPeriod
  rule: RegraRepasseV2
  snapshots: CanonicalFinancialSnapshotRow[]
  payoutSlices: PayoutRecognitionSliceRow[]
  expenses: PayoutExpenseRow[]
}): { reservas: FatosFinanceirosReservaV2[]; despesas: DespesaRepasse[] } {
  const currency = input.currency.trim().toUpperCase()
  const issues: PayoutDataQualityIssue[] = []
  const reservas: FatosFinanceirosReservaV2[] = []

  if (input.rule.competenciaReceita !== 'payout_date') {
    const seen = new Set<string>()
    for (const row of input.snapshots) {
      if (row.organizationId !== input.organizationId || row.propertyId !== input.propertyId) continue
      const prorataSlice = input.rule.competenciaReceita === 'stay_prorata'
        ? getProrataSlice(row.checkIn, row.checkOut, input.period)
        : null
      if (input.rule.competenciaReceita === 'stay_prorata') {
        if (!prorataSlice) {
          issues.push(issue('INVALID_RESERVATION_DATES', 'reservation', row.reservationId))
          continue
        }
        if (prorataSlice.selectedUnits === 0) continue
      } else {
        const recognitionDate = input.rule.competenciaReceita === 'check_in' ? row.checkIn : row.checkOut
        if (!inPeriod(recognitionDate, input.period)) continue
      }
      if (seen.has(row.reservationId)) {
        issues.push(issue('DUPLICATE_RESERVATION', 'reservation', row.reservationId))
        continue
      }
      seen.add(row.reservationId)
      if (row.status !== 'complete') {
        issues.push(issue('FINANCIAL_DATA_PENDING', 'reservation', row.reservationId))
        continue
      }
      const normalizedCurrency = normalizeCurrency(row.currency, currency, 'reservation', row.reservationId, issues)
      if (row.factMode === 'component_breakdown' && row.declaredOwnerBaseAmount !== null) {
        issues.push(issue('FINANCIAL_FACT_MODE_CONFLICT', 'reservation', row.reservationId, 'fact_mode'))
        continue
      }
      if (row.factMode === 'declared_owner_base') {
        if (!input.rule.allowDeclaredOwnerBase) {
          issues.push(issue('DECLARED_OWNER_BASE_NOT_ALLOWED', 'reservation', row.reservationId, 'fact_mode'))
        }
        if (row.declaredOwnerBaseAmount === null) {
          issues.push(issue('MISSING_DECLARED_OWNER_BASE', 'reservation', row.reservationId, 'declared_owner_base_amount'))
        }
        if (!normalizedCurrency || !input.rule.allowDeclaredOwnerBase || row.declaredOwnerBaseAmount === null) continue
        try {
          const declaredTotal = parseDecimalToMinor(row.declaredOwnerBaseAmount, 'declared_owner_base_amount')
          const declaredRecognized = prorataSlice
            ? allocateMinorByUnits(
              declaredTotal,
              prorataSlice.totalUnits,
              prorataSlice.startUnit,
              prorataSlice.selectedUnits,
            )
            : declaredTotal
          reservas.push({
            factMode: 'declared_owner_base',
            id: row.reservationId,
            currency,
            declaredOwnerBaseMinor: declaredRecognized,
            ...(prorataSlice ? {
              reconhecimentoProrata: {
                unidadesTotais: prorataSlice.totalUnits,
                unidadeInicial: prorataSlice.startUnit,
                unidadesReconhecidas: prorataSlice.selectedUnits,
                declaredOwnerBaseTotalMinor: declaredTotal,
              },
            } : {}),
          })
        } catch {
          issues.push(issue('INVALID_FINANCIAL_VALUE', 'reservation', row.reservationId, 'declared_owner_base_amount'))
        }
        continue
      }

      const values = parseComponents(row.values, input.rule, 'reservation', row.reservationId, issues)
      if (!row.guestTotalAmount) issues.push(issue('MISSING_GUEST_TOTAL', 'reservation', row.reservationId, 'guest_total_amount'))
      if (!row.channelNetPayoutAmount) issues.push(issue('MISSING_CHANNEL_NET_PAYOUT', 'reservation', row.reservationId, 'channel_net_payout_amount'))
      if (
        row.otaCommissionSettlement === 'unknown'
        || row.paymentProcessingSettlement === 'unknown'
      ) {
        issues.push(issue('FINANCIAL_DATA_PENDING', 'reservation', row.reservationId, 'settlement'))
      }
      if (!values || !normalizedCurrency || !row.guestTotalAmount || !row.channelNetPayoutAmount
        || row.otaCommissionSettlement === 'unknown' || row.paymentProcessingSettlement === 'unknown') continue
      try {
        const guestTotalAmount = parseDecimalToMinor(row.guestTotalAmount, 'guest_total_amount')
        const channelNetPayoutAmount = parseDecimalToMinor(row.channelNetPayoutAmount, 'channel_net_payout_amount')
        const platformAdjustment = row.platformAdjustmentAmount === null
          ? null
          : signedDecimalToMinor(row.platformAdjustmentAmount, 'platform_adjustment_amount')
        let recognizedValues = values
        let recognizedGuestTotal = guestTotalAmount
        let recognizedChannelNet = channelNetPayoutAmount
        let recognizedPlatformAdjustment = platformAdjustment

        if (prorataSlice) {
          const completeGuestBreakdown = values.accommodation !== undefined
            && values.cleaning_fee !== undefined
            && values.municipal_tax !== undefined
            && values.other_guest_fees !== undefined
            && values.discount !== undefined
            && platformAdjustment !== null
          const expectedGuestTotal = completeGuestBreakdown
            ? values.accommodation! + values.cleaning_fee! + values.municipal_tax!
              + values.other_guest_fees! - values.discount! + platformAdjustment
            : null
          if (expectedGuestTotal !== null && expectedGuestTotal !== guestTotalAmount) {
            issues.push(issue('GUEST_TOTAL_MISMATCH', 'reservation', row.reservationId, 'guest_total_amount'))
            continue
          }
          const channelOperandsKnown = (row.otaCommissionSettlement !== 'withheld' || values.ota_commission !== undefined)
            && (row.paymentProcessingSettlement !== 'withheld' || values.payment_processing_fee !== undefined)
          const expectedChannelNet = channelOperandsKnown
            ? guestTotalAmount
              - (row.otaCommissionSettlement === 'withheld' ? values.ota_commission! : 0)
              - (row.paymentProcessingSettlement === 'withheld' ? values.payment_processing_fee! : 0)
            : null
          if (expectedChannelNet !== null && expectedChannelNet !== channelNetPayoutAmount) {
            issues.push(issue('CHANNEL_NET_MISMATCH', 'reservation', row.reservationId, 'channel_net_payout_amount'))
            continue
          }
          recognizedValues = Object.fromEntries(COMPONENTS.flatMap(component => {
            const value = values[component]
            return value === undefined ? [] : [[component, allocateMinorByUnits(
              value, prorataSlice.totalUnits, prorataSlice.startUnit, prorataSlice.selectedUnits,
            )]]
          })) as Partial<Record<ComponenteFinanceiro, number>>
          recognizedPlatformAdjustment = platformAdjustment === null ? null : allocateMinorByUnits(
            platformAdjustment, prorataSlice.totalUnits, prorataSlice.startUnit, prorataSlice.selectedUnits,
          )
          recognizedGuestTotal = completeGuestBreakdown
            ? recognizedValues.accommodation! + recognizedValues.cleaning_fee!
              + recognizedValues.municipal_tax! + recognizedValues.other_guest_fees!
              - recognizedValues.discount! + recognizedPlatformAdjustment!
            : allocateMinorByUnits(
              guestTotalAmount, prorataSlice.totalUnits, prorataSlice.startUnit, prorataSlice.selectedUnits,
            )
          recognizedChannelNet = channelOperandsKnown
            ? recognizedGuestTotal
              - (row.otaCommissionSettlement === 'withheld' ? recognizedValues.ota_commission! : 0)
              - (row.paymentProcessingSettlement === 'withheld' ? recognizedValues.payment_processing_fee! : 0)
            : allocateMinorByUnits(
              channelNetPayoutAmount, prorataSlice.totalUnits, prorataSlice.startUnit, prorataSlice.selectedUnits,
            )
        }

        reservas.push({
          factMode: 'component_breakdown',
          id: row.reservationId,
          currency,
          valoresMinor: recognizedValues,
          platformAdjustmentMinor: recognizedPlatformAdjustment,
          totalCobradoHospedeMinor: recognizedGuestTotal,
          payoutLiquidoCanalMinor: recognizedChannelNet,
          liquidacaoComissaoOta: row.otaCommissionSettlement,
          liquidacaoProcessamentoPagamento: row.paymentProcessingSettlement,
          ...(prorataSlice ? {
            reconhecimentoProrata: {
              unidadesTotais: prorataSlice.totalUnits,
              unidadeInicial: prorataSlice.startUnit,
              unidadesReconhecidas: prorataSlice.selectedUnits,
              valoresTotaisMinor: values,
              platformAdjustmentTotalMinor: platformAdjustment,
            },
          } : {}),
        })
      } catch {
        issues.push(issue('INVALID_FINANCIAL_VALUE', 'reservation', row.reservationId))
      }
    }
  } else {
    const grouped = new Map<string, FatosFinanceirosReservaDetalhadosV2>()
    for (const row of input.payoutSlices) {
      if (row.organizationId !== input.organizationId || row.propertyId !== input.propertyId) continue
      const date = payoutDate(row.payoutAt)
      if (!date) {
        issues.push(issue('PAYOUT_RECONCILIATION_MISMATCH', 'allocation', row.allocationId, 'payout_at'))
        continue
      }
      if (!inPeriod(date, input.period)) continue
      if (row.reconciliationStatus !== 'reconciled') {
        issues.push(issue('PAYOUT_ALLOCATION_PENDING', 'allocation', row.allocationId))
        continue
      }
      const values = parseComponents(row.values, input.rule, 'allocation', row.allocationId, issues)
      const normalizedCurrency = normalizeCurrency(row.currency, currency, 'allocation', row.allocationId, issues)
      if (!values || !normalizedCurrency || row.otaCommissionSettlement === 'unknown'
        || row.paymentProcessingSettlement === 'unknown') {
        issues.push(issue('PAYOUT_RECONCILIATION_MISMATCH', 'allocation', row.allocationId))
        continue
      }
      let allocationNet: number
      try {
        allocationNet = signedDecimalToMinor(row.allocationNetAmount, 'allocation_amount')
      } catch {
        issues.push(issue('INVALID_FINANCIAL_VALUE', 'allocation', row.allocationId, 'amount'))
        continue
      }
      const sign = row.allocationType === 'refund' || allocationNet < 0 ? -1 : 1
      const signedValues = Object.fromEntries(COMPONENTS.flatMap(component => {
        const value = values[component]
        return value === undefined ? [] : [[component, value * sign]]
      })) as Partial<Record<ComponenteFinanceiro, number>>
      const guestTotal = (signedValues.accommodation ?? 0) + (signedValues.cleaning_fee ?? 0)
        + (signedValues.municipal_tax ?? 0) + (signedValues.other_guest_fees ?? 0)
        - (signedValues.discount ?? 0)
      const existing = grouped.get(row.reservationId)
      if (!existing) {
        grouped.set(row.reservationId, {
          factMode: 'component_breakdown',
          id: row.reservationId,
          currency,
          valoresMinor: signedValues,
          platformAdjustmentMinor: null,
          totalCobradoHospedeMinor: guestTotal,
          payoutLiquidoCanalMinor: allocationNet,
          liquidacaoComissaoOta: row.otaCommissionSettlement,
          liquidacaoProcessamentoPagamento: row.paymentProcessingSettlement,
        })
        continue
      }
      if (existing.liquidacaoComissaoOta !== row.otaCommissionSettlement
        || existing.liquidacaoProcessamentoPagamento !== row.paymentProcessingSettlement) {
        issues.push(issue('PAYOUT_RECONCILIATION_MISMATCH', 'allocation', row.allocationId, 'settlement'))
        continue
      }
      for (const component of COMPONENTS) {
        const value = signedValues[component]
        if (value !== undefined) existing.valoresMinor[component] = (existing.valoresMinor[component] ?? 0) + value
      }
      existing.totalCobradoHospedeMinor += guestTotal
      existing.payoutLiquidoCanalMinor += allocationNet
    }
    reservas.push(...grouped.values())
  }

  const despesas = parseExpenses(
    input.expenses, input.organizationId, input.propertyId, currency, input.period, issues,
  )
  if (issues.length) {
    throw new PayoutDataIncompleteError(
      Array.from(new Map(issues.map(item => [JSON.stringify(item), item])).values()),
    )
  }
  return { reservas, despesas }
}

export function buildPayoutPreviewV2(input: {
  organizationId: string
  propertyId: string
  currency: string
  month: string
  rule: RegraRepasseV2
  snapshots: CanonicalFinancialSnapshotRow[]
  payoutSlices: PayoutRecognitionSliceRow[]
  expenses: PayoutExpenseRow[]
}): ResultadoRepasseV2 {
  const period = getCivilMonthPeriod(input.month)
  const adapted = adaptCanonicalPayoutDataForPeriod({ ...input, period })
  try {
    return calcularRepasse({
      ...adapted,
      regra: input.rule,
      periodo: { inicio: period.inicio, fim: period.fim },
      currency: input.currency,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message.startsWith('GUEST_TOTAL_MISMATCH')) {
      throw new PayoutDataIncompleteError([issue('GUEST_TOTAL_MISMATCH', 'dataset')])
    }
    if (message.startsWith('CHANNEL_NET_MISMATCH')) {
      throw new PayoutDataIncompleteError([issue('CHANNEL_NET_MISMATCH', 'dataset')])
    }
    throw error
  }
}
