import { z } from 'zod'
import type {
  BaseComissaoRepasse,
  DestinatarioCustoRepasse,
  CompetenciaReceita,
  FluxoFinanceiro,
  PoliticaComponenteRepasse,
  PresetPoliticaRepasse,
  RegraRepasse,
  ResultadoRepasseV2,
  ResultadoRepasse,
  TipoComissaoRepasse,
} from './payout-rules'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/
const DECIMAL = /^(?:0|[1-9]\d*)(?:\.\d{1,4})?$/
const MONEY_DECIMAL = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/
const SIGNED_MONEY_DECIMAL = /^-?(?:0|[1-9]\d*)(?:\.\d{1,2})?$/

export const payoutComponentCodeSchema = z.enum([
  'accommodation', 'cleaning_fee', 'municipal_tax', 'other_guest_fees',
  'discount', 'ota_commission', 'payment_processing_fee',
])
const financialEffectSchema = z.enum(['credit', 'debit', 'ignore'])
const financialRecipientSchema = z.enum([
  'manager', 'owner', 'municipality', 'channel', 'payment_processor', 'third_party',
])

export const payoutRuleInputSchema = z.object({
  vigenciaInicio: z.string().regex(ISO_DATE, 'Use uma data válida no formato YYYY-MM-DD'),
  tipoComissao: z.enum(['percentual', 'fixo_mensal', 'fixo_por_reserva']),
  comissaoValor: z.string().regex(DECIMAL, 'Use um decimal não negativo com até quatro casas'),
  baseComissao: z.enum(['receita_bruta', 'faturamento_propriedade']),
  taxaLimpezaPara: z.enum(['gestor', 'proprietario']),
  comissaoOtaPorConta: z.enum(['gestor', 'proprietario']),
  despesasRepassaveis: z.boolean(),
  diaFechamento: z.number().int().min(1).max(31),
  observacoes: z.string().trim().max(2000).nullable().optional(),
}).strict().superRefine((value, context) => {
  const date = new Date(`${value.vigenciaInicio}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value.vigenciaInicio) {
    context.addIssue({
      code: 'custom',
      path: ['vigenciaInicio'],
      message: 'Informe uma data civil válida',
    })
  }

  const numericValue = Number(value.comissaoValor)
  if (value.tipoComissao === 'percentual' && numericValue > 100) {
    context.addIssue({
      code: 'custom',
      path: ['comissaoValor'],
      message: 'O percentual deve estar entre 0 e 100',
    })
  }
})

export const replacePayoutRuleRequestSchema = payoutRuleInputSchema.safeExtend({
  expectedCurrentRuleId: z.string().uuid(),
})

export const payoutRuleV2InputSchema = z.object({
  vigenciaInicio: z.string().regex(ISO_DATE),
  tipoComissao: z.enum(['percentual', 'fixo_mensal', 'fixo_por_reserva']),
  comissaoValor: z.string().regex(DECIMAL),
  impostoComissaoPercentual: z.string().regex(DECIMAL),
  competenciaReceita: z.enum(['check_in', 'check_out', 'stay_prorata', 'payout_date']),
  fluxoFinanceiro: z.enum(['manager_trust', 'owner_direct']),
  preset: z.enum(['net_received', 'gross_reservation', 'custom']),
  allowDeclaredOwnerBase: z.boolean().optional(),
  despesasRepassaveis: z.boolean(),
  diaFechamento: z.number().int().min(1).max(31),
  observacoes: z.string().trim().max(2000).nullable().optional(),
  componentes: z.array(z.object({
    componente: payoutComponentCodeSchema,
    destinatario: financialRecipientSchema,
    efeitoNaBaseComissao: financialEffectSchema,
    efeitoNoExtratoProprietario: financialEffectSchema,
  }).strict()).length(7),
}).strict().superRefine((value, context) => {
  const date = new Date(`${value.vigenciaInicio}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value.vigenciaInicio) {
    context.addIssue({ code: 'custom', path: ['vigenciaInicio'], message: 'Informe uma data civil válida' })
  }
  if (value.tipoComissao === 'percentual' && Number(value.comissaoValor) > 100) {
    context.addIssue({ code: 'custom', path: ['comissaoValor'], message: 'O percentual deve estar entre 0 e 100' })
  }
  if (Number(value.impostoComissaoPercentual) > 100) {
    context.addIssue({ code: 'custom', path: ['impostoComissaoPercentual'], message: 'O percentual deve estar entre 0 e 100' })
  }
  const codes = value.componentes.map(component => component.componente)
  if (new Set(codes).size !== codes.length) {
    context.addIssue({ code: 'custom', path: ['componentes'], message: 'Cada componente deve aparecer uma única vez' })
  }
})

export const replacePayoutRuleV2RequestSchema = payoutRuleV2InputSchema.safeExtend({
  contractVersion: z.literal(2),
  expectedCurrentRuleId: z.string().uuid(),
})

export const createPayoutRuleV2RequestSchema = payoutRuleV2InputSchema.safeExtend({
  contractVersion: z.literal(2),
  expectedCurrentRuleId: z.null(),
})

export const replaceAnyPayoutRuleRequestSchema = z.union([
  replacePayoutRuleRequestSchema,
  replacePayoutRuleV2RequestSchema,
  createPayoutRuleV2RequestSchema,
])

const financialSnapshotCommonShape = {
  reservationId: z.string().uuid(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  version: z.number().int().positive(),
  status: z.enum(['pending', 'complete', 'needs_review']),
  platformAdjustmentAmount: z.string().regex(SIGNED_MONEY_DECIMAL).nullable(),
  otaCommissionBaseAmount: z.string().regex(MONEY_DECIMAL).nullable(),
  managerCleaningCostAmount: z.string().regex(MONEY_DECIMAL).nullable(),
  accommodationAmount: z.string().regex(MONEY_DECIMAL).nullable(),
  cleaningFeeAmount: z.string().regex(MONEY_DECIMAL).nullable(),
  municipalTaxAmount: z.string().regex(MONEY_DECIMAL).nullable(),
  otherGuestFeesAmount: z.string().regex(MONEY_DECIMAL).nullable(),
  discountAmount: z.string().regex(MONEY_DECIMAL).nullable(),
  guestTotalAmount: z.string().regex(MONEY_DECIMAL).nullable(),
  otaCommissionAmount: z.string().regex(MONEY_DECIMAL).nullable(),
  paymentProcessingFeeAmount: z.string().regex(MONEY_DECIMAL).nullable(),
  channelNetPayoutAmount: z.string().regex(MONEY_DECIMAL).nullable(),
  otaCommissionSettlement: z.enum(['withheld', 'invoiced_separately', 'not_applicable', 'unknown']),
  paymentProcessingSettlement: z.enum(['withheld', 'invoiced_separately', 'not_applicable', 'unknown']),
  sourceKind: z.enum(['manual', 'ical', 'channel_api', 'channel_csv', 'import']),
  provider: z.string().trim().min(1).max(100).nullable(),
  externalReference: z.string().trim().min(1).max(255).nullable(),
  capturedAt: z.string().datetime({ offset: true }),
  sourceMappingVersion: z.string().trim().min(1).max(100).nullable(),
  sourceMetadata: z.record(z.string(), z.unknown()),
}

export const financialSnapshotInputSchema = z.discriminatedUnion('factMode', [
  z.object({
    ...financialSnapshotCommonShape,
    factMode: z.literal('component_breakdown'),
    declaredOwnerBaseAmount: z.null(),
  }).strict(),
  z.object({
    ...financialSnapshotCommonShape,
    factMode: z.literal('declared_owner_base'),
    declaredOwnerBaseAmount: z.string().regex(MONEY_DECIMAL),
  }).strict(),
])

const financialFactsMutationBaseShape = {
  expectedCurrentVersion: z.number().int().positive().nullable(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  note: z.string().trim().max(2000).nullable().optional(),
}

export const putReservationFinancialFactsRequestSchema = z.discriminatedUnion('factMode', [
  z.object({
    ...financialFactsMutationBaseShape,
    factMode: z.literal('declared_owner_base'),
    declaredOwnerBaseAmount: z.string().regex(MONEY_DECIMAL),
  }).strict(),
  z.object({
    ...financialFactsMutationBaseShape,
    factMode: z.literal('component_breakdown'),
    accommodationAmount: z.string().regex(MONEY_DECIMAL).nullable().optional(),
    cleaningFeeAmount: z.string().regex(MONEY_DECIMAL).nullable().optional(),
    municipalTaxAmount: z.string().regex(MONEY_DECIMAL).nullable().optional(),
    otherGuestFeesAmount: z.string().regex(MONEY_DECIMAL).nullable().optional(),
    discountAmount: z.string().regex(MONEY_DECIMAL).nullable().optional(),
    platformAdjustmentAmount: z.string().regex(SIGNED_MONEY_DECIMAL).nullable().optional(),
    guestTotalAmount: z.string().regex(MONEY_DECIMAL).nullable().optional(),
    otaCommissionBaseAmount: z.string().regex(MONEY_DECIMAL).nullable().optional(),
    otaCommissionAmount: z.string().regex(MONEY_DECIMAL).nullable().optional(),
    paymentProcessingFeeAmount: z.string().regex(MONEY_DECIMAL).nullable().optional(),
    managerCleaningCostAmount: z.string().regex(MONEY_DECIMAL).nullable().optional(),
    channelNetPayoutAmount: z.string().regex(MONEY_DECIMAL).nullable().optional(),
    otaCommissionSettlement: z.enum(['withheld', 'invoiced_separately', 'not_applicable', 'unknown']).optional(),
    paymentProcessingSettlement: z.enum(['withheld', 'invoiced_separately', 'not_applicable', 'unknown']).optional(),
  }).strict(),
])

export const previewPayoutRequestSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('persisted'),
    periodo: z.string().regex(MONTH, 'Use o período no formato YYYY-MM'),
    ruleId: z.string().uuid(),
  }).strict(),
  z.object({
    mode: z.literal('simulation'),
    periodo: z.string().regex(MONTH, 'Use o período no formato YYYY-MM'),
    rule: payoutRuleInputSchema,
  }).strict(),
])

export type PayoutRuleInput = z.infer<typeof payoutRuleInputSchema>
export type ReplacePayoutRuleRequest = z.infer<typeof replacePayoutRuleRequestSchema>
export type PreviewPayoutRequest = z.infer<typeof previewPayoutRequestSchema>
export type PayoutRuleV2Input = z.infer<typeof payoutRuleV2InputSchema>
export type ReplacePayoutRuleV2Request = z.infer<typeof replacePayoutRuleV2RequestSchema>
export type CreatePayoutRuleV2Request = z.infer<typeof createPayoutRuleV2RequestSchema>
export type FinancialSnapshotInput = z.infer<typeof financialSnapshotInputSchema>
export type PutReservationFinancialFactsRequest = z.infer<typeof putReservationFinancialFactsRequestSchema>

type PayoutRuleDtoBase = {
  id: string
  organizationId: string
  propriedadeId: string
  vigenciaInicio: string
  vigenciaFim: string | null
  tipoComissao: TipoComissaoRepasse
  comissaoValor: string
  despesasRepassaveis: boolean
  diaFechamento: number
  observacoes: string | null
  createdAt: string
}

export type PayoutRuleV1Dto = PayoutRuleDtoBase & {
  contractVersion: 1
  baseComissao: BaseComissaoRepasse
  taxaLimpezaPara: DestinatarioCustoRepasse
  comissaoOtaPorConta: DestinatarioCustoRepasse
}

export type PayoutRuleV2Dto = PayoutRuleDtoBase & {
  contractVersion: 2
  impostoComissaoPercentual: string
  competenciaReceita: CompetenciaReceita
  fluxoFinanceiro: FluxoFinanceiro
  preset: PresetPoliticaRepasse
  allowDeclaredOwnerBase: boolean
  componentes: PoliticaComponenteRepasse[]
}

export type PayoutRuleDto = PayoutRuleV1Dto | PayoutRuleV2Dto

export type PayoutRulesResponse = {
  requestId: string
  property: { id: string; name: string; currency: string }
  defaults: OrganizationFinancialDefaultsDto | null
  currentRule: PayoutRuleDto | null
  history: PayoutRuleDto[]
}

export type OrganizationFinancialDefaultsDto = {
  preset: PresetPoliticaRepasse
  competenciaReceita: CompetenciaReceita
  fluxoFinanceiro: FluxoFinanceiro
  destinatarioLimpeza: PoliticaComponenteRepasse['destinatario']
  destinatarioImpostoMunicipal: PoliticaComponenteRepasse['destinatario']
}

export type PayoutDataQualityCode =
  | 'MISSING_GROSS_REVENUE'
  | 'AMBIGUOUS_GROSS_REVENUE'
  | 'MISSING_SERVICE_FEE_SNAPSHOT'
  | 'MISSING_CLEANING_FEE_BREAKDOWN'
  | 'MISSING_OTA_FEE'
  | 'UNSUPPORTED_CURRENCY'
  | 'CURRENCY_MISMATCH'
  | 'INVALID_RESERVATION_DATES'
  | 'INVALID_FINANCIAL_VALUE'
  | 'DUPLICATE_RESERVATION'
  | 'DUPLICATE_EXPENSE'
  | 'DATASET_TOO_LARGE'
  | 'FINANCIAL_DATA_PENDING'
  | 'MISSING_ACCOMMODATION_AMOUNT'
  | 'MISSING_GUEST_TOTAL'
  | 'MISSING_CHANNEL_NET_PAYOUT'
  | 'MISSING_PAYMENT_PROCESSING_FEE'
  | 'MISSING_COMPONENT_BREAKDOWN'
  | 'GUEST_TOTAL_MISMATCH'
  | 'CHANNEL_NET_MISMATCH'
  | 'PAYOUT_ALLOCATION_PENDING'
  | 'PAYOUT_RECONCILIATION_MISMATCH'
  | 'MISSING_DECLARED_OWNER_BASE'
  | 'DECLARED_OWNER_BASE_NOT_ALLOWED'
  | 'FINANCIAL_FACT_MODE_CONFLICT'

export type PayoutDataQualityIssue = {
  code: PayoutDataQualityCode
  entityType: 'reservation' | 'expense' | 'payout' | 'allocation' | 'dataset'
  entityId?: string
  field?: string
}

export type PayoutPreviewResponse = {
  requestId: string
  periodo: { month: string; inicio: string; fim: string }
  ruleRef: { kind: 'persisted' | 'simulation'; id: string }
  dataQuality: {
    status: 'complete'
    issues: []
    evidenceLevel?: ResultadoRepasseV2['evidenceLevel']
    componentPolicyCoverage?: ResultadoRepasseV2['componentPolicyCoverage']
    evidenceCounts?: ResultadoRepasseV2['evidenceCounts']
    evidenceReservationIds?: ResultadoRepasseV2['evidenceReservationIds']
  }
  result: ResultadoRepasse | ResultadoRepasseV2
}

export function toDomainRule(
  dto: PayoutRuleV1Dto,
): RegraRepasse {
  return {
    id: dto.id,
    organizationId: dto.organizationId,
    propriedadeId: dto.propriedadeId,
    tipoComissao: dto.tipoComissao,
    comissaoValor: dto.comissaoValor,
    baseComissao: dto.baseComissao,
    taxaLimpezaPara: dto.taxaLimpezaPara,
    comissaoOtaPorConta: dto.comissaoOtaPorConta,
    despesasRepassaveis: dto.despesasRepassaveis,
  }
}
