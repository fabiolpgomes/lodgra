import 'server-only'

import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getUserAccess, type Role } from '@/lib/auth/getUserAccess'
import {
  type PayoutPreviewResponse,
  type PayoutRuleDto,
  type PayoutRuleV1Dto,
  type PayoutRuleV2Dto,
  type OrganizationFinancialDefaultsDto,
  type PayoutRulesResponse,
  type PayoutRuleInput,
  type PreviewPayoutRequest,
  type ReplacePayoutRuleRequest,
  type ReplacePayoutRuleV2Request,
  type CreatePayoutRuleV2Request,
  toDomainRule,
} from './payout-contract'
import {
  buildPayoutPreview,
  getCivilMonthPeriod,
  type PayoutExpenseRow,
  type PayoutReservationRow,
  type ReservationFinancialLineage,
} from './payout-period'
import {
  buildPayoutPreviewV2,
  type CanonicalFinancialSnapshotRow,
  type PayoutRecognitionSliceRow,
} from './payout-period-v2'
import type { ComponenteFinanceiro } from './payout-rules'
import { postgresUuidSchema } from '@/lib/validation/postgres-uuid'

const propertyRowSchema = z.object({
  id: postgresUuidSchema,
  name: z.string(),
  currency: z.string().nullable(),
}).strict()

const numericString = z.union([z.string(), z.number()]).transform(value => String(value))

const payoutRuleRowSchema = z.object({
  id: postgresUuidSchema,
  organization_id: postgresUuidSchema,
  propriedade_id: postgresUuidSchema,
  vigencia_inicio: z.string(),
  vigencia_fim: z.string().nullable(),
  tipo_comissao: z.enum(['percentual', 'fixo_mensal', 'fixo_por_reserva']),
  comissao_valor: numericString,
  base_comissao: z.enum(['receita_bruta', 'faturamento_propriedade']).nullable(),
  taxa_limpeza_para: z.enum(['gestor', 'proprietario']).nullable(),
  comissao_ota_por_conta: z.enum(['gestor', 'proprietario']).nullable(),
  despesas_repassaveis: z.boolean(),
  dia_fechamento: z.number().int(),
  observacoes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  contract_version: z.union([z.literal(1), z.literal(2)]),
  recognition_basis: z.enum(['check_in', 'check_out', 'stay_prorata', 'payout_date']).nullable(),
  cash_flow_model: z.enum(['manager_trust', 'owner_direct']).nullable(),
  preset_key: z.enum(['net_received', 'gross_reservation', 'custom']).nullable(),
  management_commission_tax_rate: numericString.nullable(),
  allow_declared_owner_base: z.boolean(),
})

const payoutRuleComponentRowSchema = z.object({
  payout_rule_id: postgresUuidSchema,
  component_code: z.enum([
    'accommodation', 'cleaning_fee', 'municipal_tax', 'other_guest_fees',
    'discount', 'ota_commission', 'payment_processing_fee',
  ]),
  recipient: z.enum(['manager', 'owner', 'municipality', 'channel', 'payment_processor', 'third_party']),
  commission_base_effect: z.enum(['credit', 'debit', 'ignore']),
  owner_statement_effect: z.enum(['credit', 'debit', 'ignore']),
}).strict()

const organizationFinancialSettingsRowSchema = z.object({
  default_preset: z.enum(['net_received', 'gross_reservation', 'custom']),
  default_recognition_basis: z.enum(['check_in', 'check_out', 'stay_prorata', 'payout_date']),
  default_cash_flow_model: z.enum(['manager_trust', 'owner_direct']),
  default_cleaning_recipient: z.enum(['manager', 'owner', 'third_party']),
  default_municipal_tax_recipient: z.literal('municipality'),
}).strict()

const reservationRowSchema = z.object({
  id: postgresUuidSchema,
  organization_id: postgresUuidSchema,
  property_id: postgresUuidSchema,
  status: z.string(),
  check_in: z.string(),
  check_out: z.string(),
  currency: z.string().nullable(),
  total_amount: numericString.nullable(),
  service_fee_amount: numericString.nullable(),
  platform_fee: numericString.nullable(),
  discount_amount: numericString.nullable(),
  raw_data: z.unknown().nullable(),
}).strict()

const expenseRowSchema = z.object({
  id: postgresUuidSchema,
  organization_id: postgresUuidSchema,
  property_id: postgresUuidSchema,
  expense_date: z.string(),
  currency: z.string().nullable(),
  amount: numericString.nullable(),
}).strict()

const reservationDateRowSchema = z.object({
  id: postgresUuidSchema,
  organization_id: postgresUuidSchema,
  property_id: postgresUuidSchema,
  check_in: z.string(),
  check_out: z.string(),
}).strict()

const financialSnapshotRowSchema = z.object({
  reservation_id: postgresUuidSchema,
  organization_id: postgresUuidSchema,
  property_id: postgresUuidSchema,
  version: z.number().int().positive(),
  status: z.enum(['pending', 'complete', 'needs_review']),
  fact_mode: z.enum(['component_breakdown', 'declared_owner_base']),
  currency: z.string(),
  declared_owner_base_amount: numericString.nullable(),
  platform_adjustment_amount: numericString.nullable(),
  ota_commission_base_amount: numericString.nullable(),
  manager_cleaning_cost_amount: numericString.nullable(),
  accommodation_amount: numericString.nullable(),
  cleaning_fee_amount: numericString.nullable(),
  municipal_tax_amount: numericString.nullable(),
  other_guest_fees_amount: numericString.nullable(),
  discount_amount: numericString.nullable(),
  guest_total_amount: numericString.nullable(),
  ota_commission_amount: numericString.nullable(),
  payment_processing_fee_amount: numericString.nullable(),
  channel_net_payout_amount: numericString.nullable(),
  ota_commission_settlement: z.enum(['withheld', 'invoiced_separately', 'not_applicable', 'unknown']),
  payment_processing_settlement: z.enum(['withheld', 'invoiced_separately', 'not_applicable', 'unknown']),
  source_kind: z.enum(['manual', 'ical', 'channel_api', 'channel_csv', 'import']),
  provider: z.string().nullable(),
  external_reference: z.string().nullable(),
  captured_at: z.string(),
  source_mapping_version: z.string().nullable(),
  source_metadata: z.record(z.string(), z.unknown()),
}).strict()

const channelPayoutRowSchema = z.object({
  id: postgresUuidSchema,
  organization_id: postgresUuidSchema,
  payout_at: z.string(),
  reconciliation_status: z.enum(['pending', 'reconciled', 'needs_review']),
  ota_commission_settlement: z.enum(['withheld', 'invoiced_separately', 'not_applicable', 'unknown']),
  payment_processing_settlement: z.enum(['withheld', 'invoiced_separately', 'not_applicable', 'unknown']),
}).strict()

const payoutAllocationRowSchema = z.object({
  id: postgresUuidSchema,
  organization_id: postgresUuidSchema,
  payout_id: postgresUuidSchema,
  property_id: postgresUuidSchema,
  reservation_id: postgresUuidSchema,
  allocation_type: z.enum(['reservation', 'adjustment', 'refund']),
  currency: z.string(),
  amount: numericString,
}).strict()

const allocationComponentRowSchema = z.object({
  allocation_id: postgresUuidSchema,
  component_code: z.enum([
    'accommodation', 'cleaning_fee', 'municipal_tax', 'other_guest_fees',
    'discount', 'ota_commission', 'payment_processing_fee',
  ]),
  amount: numericString,
}).strict()

const lineageEnvelopeSchema = z.object({
  payout_lineage: z.object({
    gross_revenue_semantics: z.literal('exclusive_service_fees'),
    service_fee_snapshot: z.literal(true),
    cleaning_fee_amount: numericString,
    ota_fee_snapshot: z.literal(true),
  }).strict(),
}).passthrough()

const PAYOUT_RULE_SELECT = [
  'id',
  'organization_id',
  'propriedade_id',
  'vigencia_inicio',
  'vigencia_fim',
  'tipo_comissao',
  'comissao_valor',
  'base_comissao',
  'taxa_limpeza_para',
  'comissao_ota_por_conta',
  'despesas_repassaveis',
  'dia_fechamento',
  'observacoes',
  'created_at',
  'updated_at',
  'contract_version',
  'recognition_basis',
  'cash_flow_model',
  'preset_key',
  'management_commission_tax_rate',
  'allow_declared_owner_base',
].join(',')

export class PayoutServiceError extends Error {
  constructor(
    readonly status: 401 | 403 | 404 | 409 | 422 | 500,
    readonly code: string,
    message: string,
    readonly issues?: unknown[],
  ) {
    super(message)
    this.name = 'PayoutServiceError'
  }
}

function assertBelowQueryLimit(rows: unknown[], limit: number, field: string): void {
  if (rows.length < limit) return
  throw new PayoutServiceError(
    422,
    'PAYOUT_DATA_INCOMPLETE',
    'O volume de dados do período excede o limite seguro',
    [{ code: 'DATASET_TOO_LARGE', entityType: 'dataset', field }],
  )
}

function parseDatabaseValue<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value)
  if (!parsed.success) {
    throw new PayoutServiceError(500, 'PAYOUT_DATA_INVALID', 'Os dados financeiros armazenados são inválidos')
  }
  return parsed.data
}

type AuthorizedProperty = {
  userId: string
  organizationId: string
  role: Role
  property: { id: string; name: string; currency: string }
}

type PayoutRuleComponentRow = z.infer<typeof payoutRuleComponentRowSchema>

function mapRule(row: unknown, componentRows: PayoutRuleComponentRow[] = []): PayoutRuleDto {
  const parsed = parseDatabaseValue(payoutRuleRowSchema, row)
  const common = {
    id: parsed.id,
    organizationId: parsed.organization_id,
    propriedadeId: parsed.propriedade_id,
    vigenciaInicio: parsed.vigencia_inicio,
    vigenciaFim: parsed.vigencia_fim,
    tipoComissao: parsed.tipo_comissao,
    comissaoValor: parsed.comissao_valor,
    despesasRepassaveis: parsed.despesas_repassaveis,
    diaFechamento: parsed.dia_fechamento,
    observacoes: parsed.observacoes,
    createdAt: parsed.created_at,
  }
  if (parsed.contract_version === 1) {
    if (!parsed.base_comissao || !parsed.taxa_limpeza_para || !parsed.comissao_ota_por_conta) {
      throw new PayoutServiceError(500, 'PAYOUT_DATA_INVALID', 'A regra financeira legada está incompleta')
    }
    return {
      ...common,
      contractVersion: 1,
      baseComissao: parsed.base_comissao,
      taxaLimpezaPara: parsed.taxa_limpeza_para,
      comissaoOtaPorConta: parsed.comissao_ota_por_conta,
    }
  }
  if (!parsed.recognition_basis || !parsed.cash_flow_model || !parsed.preset_key
    || parsed.management_commission_tax_rate === null) {
    throw new PayoutServiceError(500, 'PAYOUT_DATA_INVALID', 'A regra financeira v2 está incompleta')
  }
  const components = componentRows.filter(component => component.payout_rule_id === parsed.id)
  if (components.length !== 7) {
    throw new PayoutServiceError(500, 'PAYOUT_DATA_INVALID', 'A política de componentes da regra v2 está incompleta')
  }
  return {
    ...common,
    contractVersion: 2,
    impostoComissaoPercentual: parsed.management_commission_tax_rate,
    competenciaReceita: parsed.recognition_basis,
    fluxoFinanceiro: parsed.cash_flow_model,
    preset: parsed.preset_key,
    allowDeclaredOwnerBase: parsed.allow_declared_owner_base,
    componentes: components.map(component => ({
      componente: component.component_code,
      destinatario: component.recipient,
      efeitoNaBaseComissao: component.commission_base_effect,
      efeitoNoExtratoProprietario: component.owner_statement_effect,
    })),
  }
}

async function loadFinancialDefaults(
  supabase: SupabaseClient,
  context: AuthorizedProperty,
): Promise<OrganizationFinancialDefaultsDto | null> {
  const { data, error } = await supabase
    .from('organization_financial_settings')
    .select('default_preset,default_recognition_basis,default_cash_flow_model,default_cleaning_recipient,default_municipal_tax_recipient')
    .eq('organization_id', context.organizationId)
    .maybeSingle()
  if (error) throw new PayoutServiceError(500, 'PAYOUT_READ_FAILED', 'Não foi possível consultar os defaults financeiros')
  if (!data) return null
  const parsed = parseDatabaseValue(organizationFinancialSettingsRowSchema, data)
  return {
    preset: parsed.default_preset,
    competenciaReceita: parsed.default_recognition_basis,
    fluxoFinanceiro: parsed.default_cash_flow_model,
    destinatarioLimpeza: parsed.default_cleaning_recipient,
    destinatarioImpostoMunicipal: parsed.default_municipal_tax_recipient,
  }
}

function parseLineage(rawData: unknown): ReservationFinancialLineage {
  const parsed = lineageEnvelopeSchema.safeParse(rawData)
  if (!parsed.success) {
    return {
      grossRevenueSemantics: 'unknown',
      serviceFeeSnapshot: false,
      cleaningFeeAmount: null,
      otaFeeSnapshot: false,
    }
  }
  return {
    grossRevenueSemantics: parsed.data.payout_lineage.gross_revenue_semantics,
    serviceFeeSnapshot: true,
    cleaningFeeAmount: parsed.data.payout_lineage.cleaning_fee_amount,
    otaFeeSnapshot: true,
  }
}

async function authorizeProperty(
  supabase: SupabaseClient,
  propertyId: string,
  requireMutationRole: boolean,
): Promise<AuthorizedProperty> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new PayoutServiceError(401, 'UNAUTHENTICATED', 'Autenticação necessária')

  const access = await getUserAccess(supabase, user)
  const organizationId = access?.profile.organization_id
  if (!access || !organizationId) {
    throw new PayoutServiceError(404, 'PROPERTY_NOT_FOUND', 'Propriedade não encontrada')
  }
  if (access.propertyIds !== null && !access.propertyIds.includes(propertyId)) {
    throw new PayoutServiceError(404, 'PROPERTY_NOT_FOUND', 'Propriedade não encontrada')
  }

  const { data, error } = await supabase
    .from('properties')
    .select('id,name,currency')
    .eq('organization_id', organizationId)
    .eq('id', propertyId)
    .maybeSingle()
  if (error) throw new PayoutServiceError(500, 'PAYOUT_READ_FAILED', 'Não foi possível consultar a propriedade')
  if (!data) throw new PayoutServiceError(404, 'PROPERTY_NOT_FOUND', 'Propriedade não encontrada')

  const parsed = parseDatabaseValue(propertyRowSchema, data)
  const currency = parsed.currency?.trim().toUpperCase()
  if (!currency) throw new PayoutServiceError(422, 'PAYOUT_DATA_INCOMPLETE', 'A moeda da propriedade não está configurada')
  if (requireMutationRole && access.profile.role !== 'admin' && access.profile.role !== 'gestor') {
    throw new PayoutServiceError(403, 'FORBIDDEN', 'Você não tem permissão para esta operação')
  }

  return {
    userId: user.id,
    organizationId,
    role: access.profile.role,
    property: { ...parsed, currency },
  }
}

async function loadRules(
  supabase: SupabaseClient,
  context: AuthorizedProperty,
): Promise<{ currentRule: PayoutRuleDto | null; history: PayoutRuleDto[] }> {
  const { data, error } = await supabase
    .from('regras_repasse')
    .select(PAYOUT_RULE_SELECT)
    .eq('organization_id', context.organizationId)
    .eq('propriedade_id', context.property.id)
    .order('vigencia_inicio', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw new PayoutServiceError(500, 'PAYOUT_READ_FAILED', 'Não foi possível consultar as regras de repasse')

  const rawRules = parseDatabaseValue(z.array(payoutRuleRowSchema), data ?? [])
  const v2RuleIds = rawRules.filter(rule => rule.contract_version === 2).map(rule => rule.id)
  let components: PayoutRuleComponentRow[] = []
  if (v2RuleIds.length > 0) {
    const { data: componentData, error: componentError } = await supabase
      .from('payout_rule_components')
      .select('payout_rule_id,component_code,recipient,commission_base_effect,owner_statement_effect')
      .eq('organization_id', context.organizationId)
      .in('payout_rule_id', v2RuleIds)
    if (componentError) throw new PayoutServiceError(500, 'PAYOUT_READ_FAILED', 'Não foi possível consultar a política financeira')
    components = parseDatabaseValue(z.array(payoutRuleComponentRowSchema), componentData ?? [])
  }
  const history = rawRules.map(rule => mapRule(rule, components))
  const openRules = history.filter(rule => rule.vigenciaFim === null)
  if (openRules.length > 1) {
    throw new PayoutServiceError(500, 'PAYOUT_RULE_INTEGRITY', 'A regra vigente não está disponível')
  }
  return { currentRule: openRules[0] ?? null, history }
}

async function loadRuleById(
  supabase: SupabaseClient,
  context: AuthorizedProperty,
  ruleId: string,
): Promise<PayoutRuleDto> {
  const { data, error } = await supabase
    .from('regras_repasse')
    .select(PAYOUT_RULE_SELECT)
    .eq('organization_id', context.organizationId)
    .eq('propriedade_id', context.property.id)
    .eq('id', ruleId)
    .maybeSingle()
  if (error) throw new PayoutServiceError(500, 'PAYOUT_READ_FAILED', 'Não foi possível consultar a regra')
  if (!data) throw new PayoutServiceError(404, 'PAYOUT_RULE_NOT_FOUND', 'Regra de repasse não encontrada')
  const parsed = parseDatabaseValue(payoutRuleRowSchema, data)
  if (parsed.contract_version === 1) return mapRule(parsed)

  const { data: componentData, error: componentError } = await supabase
    .from('payout_rule_components')
    .select('payout_rule_id,component_code,recipient,commission_base_effect,owner_statement_effect')
    .eq('organization_id', context.organizationId)
    .eq('payout_rule_id', parsed.id)
  if (componentError) throw new PayoutServiceError(500, 'PAYOUT_READ_FAILED', 'Não foi possível consultar a política financeira')
  const components = parseDatabaseValue(z.array(payoutRuleComponentRowSchema), componentData ?? [])
  return mapRule(parsed, components)
}

export async function getPayoutRules(
  supabase: SupabaseClient,
  propertyId: string,
  requestId: string,
): Promise<PayoutRulesResponse> {
  const context = await authorizeProperty(supabase, propertyId, false)
  const [rules, defaults] = await Promise.all([
    loadRules(supabase, context),
    loadFinancialDefaults(supabase, context),
  ])
  return { requestId, property: context.property, defaults, ...rules }
}

export async function replacePayoutRule(
  supabase: SupabaseClient,
  propertyId: string,
  input: ReplacePayoutRuleRequest,
): Promise<{ context: AuthorizedProperty; previousRule: PayoutRuleDto; currentRule: PayoutRuleDto }> {
  const context = await authorizeProperty(supabase, propertyId, true)
  const { currentRule } = await loadRules(supabase, context)
  if (!currentRule) {
    throw new PayoutServiceError(409, 'PAYOUT_RULE_CONFLICT', 'A propriedade ainda não possui regra vigente')
  }
  if (currentRule.contractVersion === 2) {
    throw new PayoutServiceError(
      422,
      'PAYOUT_V2_MUTATION_REQUIRED',
      'A política financeira v2 deve ser substituída pelo fluxo v2',
    )
  }
  const { data, error } = await supabase.rpc('replace_property_payout_rule', {
    p_property_id: propertyId,
    p_expected_current_rule_id: input.expectedCurrentRuleId,
    p_vigencia_inicio: input.vigenciaInicio,
    p_tipo_comissao: input.tipoComissao,
    p_comissao_valor: input.comissaoValor,
    p_base_comissao: input.baseComissao,
    p_taxa_limpeza_para: input.taxaLimpezaPara,
    p_comissao_ota_por_conta: input.comissaoOtaPorConta,
    p_despesas_repassaveis: input.despesasRepassaveis,
    p_dia_fechamento: input.diaFechamento,
    p_observacoes: input.observacoes ?? null,
  })

  if (error) {
    const message = error.message ?? ''
    if (message.includes('PAYOUT_RULE_CONFLICT')) {
      throw new PayoutServiceError(409, 'PAYOUT_RULE_CONFLICT', 'A regra foi alterada por outra sessão; atualize e tente novamente')
    }
    if (message.includes('PAYOUT_FORBIDDEN')) {
      throw new PayoutServiceError(403, 'FORBIDDEN', 'Você não tem permissão para esta operação')
    }
    if (message.includes('PAYOUT_RULE_INVALID')) {
      throw new PayoutServiceError(422, 'INVALID_PAYOUT_RULE', 'A nova regra não é válida')
    }
    throw new PayoutServiceError(500, 'PAYOUT_WRITE_FAILED', 'Não foi possível substituir a regra de repasse')
  }

  const result = parseDatabaseValue(
    z.object({ previous_rule: z.unknown(), current_rule: z.unknown() }).strict(),
    data,
  )
  return { context, previousRule: mapRule(result.previous_rule), currentRule: mapRule(result.current_rule) }
}

export async function replacePayoutRuleV2(
  supabase: SupabaseClient,
  propertyId: string,
  input: ReplacePayoutRuleV2Request,
): Promise<{ context: AuthorizedProperty; previousRule: PayoutRuleDto; currentRule: PayoutRuleV2Dto }> {
  const { context, result } = await mutatePayoutRuleV2(supabase, propertyId, input, 'replace')
  const [previousRule, currentRule] = await Promise.all([
    loadRuleById(supabase, context, result.previous_rule_id),
    loadRuleById(supabase, context, result.current_rule_id),
  ])
  if (currentRule.contractVersion !== 2) {
    throw new PayoutServiceError(500, 'PAYOUT_DATA_INVALID', 'A política financeira persistida é inválida')
  }
  return { context, previousRule, currentRule }
}

export async function createPayoutRuleV2(
  supabase: SupabaseClient,
  propertyId: string,
  input: CreatePayoutRuleV2Request,
): Promise<{ context: AuthorizedProperty; previousRule: null; currentRule: PayoutRuleV2Dto }> {
  const { context, result } = await mutatePayoutRuleV2(supabase, propertyId, input, 'create')
  const currentRule = await loadRuleById(supabase, context, result.current_rule_id)
  if (currentRule.contractVersion !== 2) {
    throw new PayoutServiceError(500, 'PAYOUT_DATA_INVALID', 'A política financeira persistida é inválida')
  }
  return { context, previousRule: null, currentRule }
}

type PayoutRuleV2MutationInput = CreatePayoutRuleV2Request | ReplacePayoutRuleV2Request
type PayoutRuleV2MutationMode = 'create' | 'replace'

async function mutatePayoutRuleV2(
  supabase: SupabaseClient,
  propertyId: string,
  input: PayoutRuleV2MutationInput,
  mode: PayoutRuleV2MutationMode,
): Promise<{
  context: AuthorizedProperty
  result: { previous_rule_id: string | null; current_rule_id: string }
}> {
  const context = await authorizeProperty(supabase, propertyId, true)
  const rpcName = mode === 'create'
    ? 'create_property_payout_rule_v2'
    : 'replace_property_payout_rule_v2'
  const rpcArgs = {
    p_property_id: propertyId,
    p_vigencia_inicio: input.vigenciaInicio,
    p_tipo_comissao: input.tipoComissao,
    p_comissao_valor: input.comissaoValor,
    p_imposto_comissao_percentual: input.impostoComissaoPercentual,
    p_competencia_receita: input.competenciaReceita,
    p_fluxo_financeiro: input.fluxoFinanceiro,
    p_preset: input.preset,
    p_despesas_repassaveis: input.despesasRepassaveis,
    p_dia_fechamento: input.diaFechamento,
    p_componentes: input.componentes.map(component => ({
      component_code: component.componente,
      recipient: component.destinatario,
      commission_base_effect: component.efeitoNaBaseComissao,
      owner_statement_effect: component.efeitoNoExtratoProprietario,
    })),
    p_observacoes: input.observacoes ?? null,
    p_allow_declared_owner_base: input.allowDeclaredOwnerBase ?? false,
    ...(mode === 'replace' ? { p_expected_current_rule_id: input.expectedCurrentRuleId } : {}),
  }
  const { data, error } = await supabase.rpc(rpcName, rpcArgs)

  if (error) {
    const message = error.message ?? ''
    if (message.includes('PAYOUT_RULE_CONFLICT')) {
      const conflictMessage = mode === 'create'
        ? 'Outra sessão já criou uma regra; atualize e tente novamente'
        : 'A regra foi alterada por outra sessão; atualize e tente novamente'
      throw new PayoutServiceError(409, 'PAYOUT_RULE_CONFLICT', conflictMessage)
    }
    if (message.includes('PAYOUT_FORBIDDEN')) {
      throw new PayoutServiceError(403, 'FORBIDDEN', 'Você não tem permissão para esta operação')
    }
    if (message.includes('PAYOUT_RULE_INVALID')) {
      const invalidMessage = mode === 'create'
        ? 'A política financeira inicial não é válida'
        : 'A nova política financeira não é válida'
      throw new PayoutServiceError(422, 'INVALID_PAYOUT_RULE', invalidMessage)
    }
    const writeMessage = mode === 'create'
      ? 'Não foi possível criar a política financeira inicial'
      : 'Não foi possível substituir a política financeira'
    throw new PayoutServiceError(500, 'PAYOUT_WRITE_FAILED', writeMessage)
  }

  const result = parseDatabaseValue(
    z.object({
      previous_rule_id: mode === 'create' ? z.null() : postgresUuidSchema,
      current_rule_id: postgresUuidSchema,
    }).strict(),
    data,
  )
  return { context, result }
}

function simulationRule(
  input: PayoutRuleInput,
  context: AuthorizedProperty,
  id: string,
): PayoutRuleV1Dto {
  return {
    contractVersion: 1,
    id,
    organizationId: context.organizationId,
    propriedadeId: context.property.id,
    vigenciaInicio: input.vigenciaInicio,
    vigenciaFim: null,
    tipoComissao: input.tipoComissao,
    comissaoValor: input.comissaoValor,
    baseComissao: input.baseComissao,
    taxaLimpezaPara: input.taxaLimpezaPara,
    comissaoOtaPorConta: input.comissaoOtaPorConta,
    despesasRepassaveis: input.despesasRepassaveis,
    diaFechamento: input.diaFechamento,
    observacoes: input.observacoes ?? null,
    createdAt: new Date().toISOString(),
  }
}

const V2_COMPONENTS: readonly ComponenteFinanceiro[] = [
  'accommodation', 'cleaning_fee', 'municipal_tax', 'other_guest_fees',
  'discount', 'ota_commission', 'payment_processing_fee',
]

function emptyComponentValues(): Record<ComponenteFinanceiro, string | null> {
  return Object.fromEntries(V2_COMPONENTS.map(code => [code, null])) as Record<ComponenteFinanceiro, string | null>
}

async function loadExpenses(
  supabase: SupabaseClient,
  context: AuthorizedProperty,
  inicio: string,
  fim: string,
): Promise<PayoutExpenseRow[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('id,organization_id,property_id,expense_date,currency,amount')
    .eq('organization_id', context.organizationId)
    .eq('property_id', context.property.id)
    .gte('expense_date', inicio)
    .lte('expense_date', fim)
    .limit(10_001)
  if (error) throw new PayoutServiceError(500, 'PAYOUT_READ_FAILED', 'Não foi possível consultar as despesas')
  const rows = parseDatabaseValue(z.array(expenseRowSchema), data ?? [])
  assertBelowQueryLimit(rows, 10_001, 'expenses')
  return rows.map(row => ({
    id: row.id,
    organizationId: row.organization_id,
    propertyId: row.property_id,
    expenseDate: row.expense_date,
    currency: row.currency,
    amount: row.amount,
  }))
}

async function loadCanonicalSnapshots(
  supabase: SupabaseClient,
  context: AuthorizedProperty,
  rule: PayoutRuleV2Dto,
  inicio: string,
  fim: string,
): Promise<CanonicalFinancialSnapshotRow[]> {
  let reservationQuery = supabase
    .from('reservations')
    .select('id,organization_id,property_id,check_in,check_out')
    .eq('organization_id', context.organizationId)
    .eq('property_id', context.property.id)
    .eq('status', 'confirmed')
  if (rule.competenciaReceita === 'stay_prorata') {
    const nextDay = new Date(`${fim}T00:00:00.000Z`)
    nextDay.setUTCDate(nextDay.getUTCDate() + 1)
    reservationQuery = reservationQuery.lt('check_in', nextDay.toISOString().slice(0, 10)).gt('check_out', inicio)
  } else {
    const dateColumn = rule.competenciaReceita === 'check_in' ? 'check_in' : 'check_out'
    reservationQuery = reservationQuery.gte(dateColumn, inicio).lte(dateColumn, fim)
  }
  const { data: reservationData, error: reservationError } = await reservationQuery.limit(10_001)
  if (reservationError) throw new PayoutServiceError(500, 'PAYOUT_READ_FAILED', 'Não foi possível consultar as reservas')
  const reservations = parseDatabaseValue(z.array(reservationDateRowSchema), reservationData ?? [])
  assertBelowQueryLimit(reservations, 10_001, 'reservations')
  if (reservations.length === 0) return []

  const { data: snapshotData, error: snapshotError } = await supabase
    .from('reservation_financial_snapshots')
    .select('reservation_id,organization_id,property_id,version,status,fact_mode,currency,declared_owner_base_amount,platform_adjustment_amount,ota_commission_base_amount,manager_cleaning_cost_amount,accommodation_amount,cleaning_fee_amount,municipal_tax_amount,other_guest_fees_amount,discount_amount,guest_total_amount,ota_commission_amount,payment_processing_fee_amount,channel_net_payout_amount,ota_commission_settlement,payment_processing_settlement,source_kind,provider,external_reference,captured_at,source_mapping_version,source_metadata')
    .eq('organization_id', context.organizationId)
    .eq('property_id', context.property.id)
    .in('reservation_id', reservations.map(reservation => reservation.id))
    .is('superseded_at', null)
    .limit(10_001)
  if (snapshotError) throw new PayoutServiceError(500, 'PAYOUT_READ_FAILED', 'Não foi possível consultar os fatos financeiros')
  const snapshots = parseDatabaseValue(z.array(financialSnapshotRowSchema), snapshotData ?? [])
  assertBelowQueryLimit(snapshots, 10_001, 'reservation_financial_snapshots')
  const byReservation = new Map(snapshots.map(snapshot => [snapshot.reservation_id, snapshot]))

  return reservations.map(reservation => {
    const snapshot = byReservation.get(reservation.id)
    if (!snapshot) {
      return {
        reservationId: reservation.id,
        organizationId: reservation.organization_id,
        propertyId: reservation.property_id,
        version: 0,
        status: 'pending',
        factMode: 'component_breakdown',
        checkIn: reservation.check_in,
        checkOut: reservation.check_out,
        currency: context.property.currency,
        values: emptyComponentValues(),
        declaredOwnerBaseAmount: null,
        platformAdjustmentAmount: null,
        otaCommissionBaseAmount: null,
        managerCleaningCostAmount: null,
        guestTotalAmount: null,
        channelNetPayoutAmount: null,
        otaCommissionSettlement: 'unknown',
        paymentProcessingSettlement: 'unknown',
        sourceKind: 'ical',
        provider: null,
        externalReference: null,
        capturedAt: new Date(0).toISOString(),
        sourceMappingVersion: null,
        sourceMetadata: {},
      }
    }
    return {
      reservationId: reservation.id,
      organizationId: snapshot.organization_id,
      propertyId: snapshot.property_id,
      version: snapshot.version,
      status: snapshot.status,
      factMode: snapshot.fact_mode,
      checkIn: reservation.check_in,
      checkOut: reservation.check_out,
      currency: snapshot.currency,
      declaredOwnerBaseAmount: snapshot.declared_owner_base_amount,
      platformAdjustmentAmount: snapshot.platform_adjustment_amount,
      otaCommissionBaseAmount: snapshot.ota_commission_base_amount,
      managerCleaningCostAmount: snapshot.manager_cleaning_cost_amount,
      values: {
        accommodation: snapshot.accommodation_amount,
        cleaning_fee: snapshot.cleaning_fee_amount,
        municipal_tax: snapshot.municipal_tax_amount,
        other_guest_fees: snapshot.other_guest_fees_amount,
        discount: snapshot.discount_amount,
        ota_commission: snapshot.ota_commission_amount,
        payment_processing_fee: snapshot.payment_processing_fee_amount,
      },
      guestTotalAmount: snapshot.guest_total_amount,
      channelNetPayoutAmount: snapshot.channel_net_payout_amount,
      otaCommissionSettlement: snapshot.ota_commission_settlement,
      paymentProcessingSettlement: snapshot.payment_processing_settlement,
      sourceKind: snapshot.source_kind,
      provider: snapshot.provider,
      externalReference: snapshot.external_reference,
      capturedAt: snapshot.captured_at,
      sourceMappingVersion: snapshot.source_mapping_version,
      sourceMetadata: snapshot.source_metadata,
    }
  })
}

async function loadPayoutSlices(
  supabase: SupabaseClient,
  context: AuthorizedProperty,
  inicio: string,
  fim: string,
): Promise<PayoutRecognitionSliceRow[]> {
  const nextDay = new Date(`${fim}T00:00:00.000Z`)
  nextDay.setUTCDate(nextDay.getUTCDate() + 1)
  const { data: payoutData, error: payoutError } = await supabase
    .from('channel_payouts')
    .select('id,organization_id,payout_at,reconciliation_status,ota_commission_settlement,payment_processing_settlement')
    .eq('organization_id', context.organizationId)
    .gte('payout_at', `${inicio}T00:00:00.000Z`)
    .lt('payout_at', nextDay.toISOString())
    .limit(10_001)
  if (payoutError) throw new PayoutServiceError(500, 'PAYOUT_READ_FAILED', 'Não foi possível consultar os payouts')
  const payouts = parseDatabaseValue(z.array(channelPayoutRowSchema), payoutData ?? [])
  assertBelowQueryLimit(payouts, 10_001, 'channel_payouts')
  if (payouts.length === 0) return []

  const { data: allocationData, error: allocationError } = await supabase
    .from('channel_payout_allocations')
    .select('id,organization_id,payout_id,property_id,reservation_id,allocation_type,currency,amount')
    .eq('organization_id', context.organizationId)
    .eq('property_id', context.property.id)
    .in('payout_id', payouts.map(payout => payout.id))
    .limit(10_001)
  if (allocationError) throw new PayoutServiceError(500, 'PAYOUT_READ_FAILED', 'Não foi possível consultar as alocações')
  const allocations = parseDatabaseValue(z.array(payoutAllocationRowSchema), allocationData ?? [])
  assertBelowQueryLimit(allocations, 10_001, 'channel_payout_allocations')
  if (allocations.length === 0) return []

  const { data: componentData, error: componentError } = await supabase
    .from('channel_payout_allocation_components')
    .select('allocation_id,component_code,amount')
    .eq('organization_id', context.organizationId)
    .in('allocation_id', allocations.map(allocation => allocation.id))
    .limit(70_001)
  if (componentError) throw new PayoutServiceError(500, 'PAYOUT_READ_FAILED', 'Não foi possível consultar os componentes conciliados')
  const components = parseDatabaseValue(z.array(allocationComponentRowSchema), componentData ?? [])
  assertBelowQueryLimit(components, 70_001, 'channel_payout_allocation_components')
  const componentsByAllocation = new Map<string, Record<ComponenteFinanceiro, string | null>>()
  for (const component of components) {
    const values = componentsByAllocation.get(component.allocation_id) ?? emptyComponentValues()
    values[component.component_code] = component.amount
    componentsByAllocation.set(component.allocation_id, values)
  }
  const payoutsById = new Map(payouts.map(payout => [payout.id, payout]))
  return allocations.map(allocation => {
    const payout = payoutsById.get(allocation.payout_id)
    if (!payout) throw new PayoutServiceError(500, 'PAYOUT_DATA_INVALID', 'A alocação não possui payout válido')
    return {
      allocationId: allocation.id,
      reservationId: allocation.reservation_id,
      organizationId: allocation.organization_id,
      propertyId: allocation.property_id,
      payoutAt: payout.payout_at,
      reconciliationStatus: payout.reconciliation_status,
      allocationType: allocation.allocation_type,
      currency: allocation.currency,
      allocationNetAmount: allocation.amount,
      values: componentsByAllocation.get(allocation.id) ?? emptyComponentValues(),
      otaCommissionSettlement: payout.ota_commission_settlement,
      paymentProcessingSettlement: payout.payment_processing_settlement,
    }
  })
}

export async function previewPayout(
  supabase: SupabaseClient,
  propertyId: string,
  input: PreviewPayoutRequest,
  requestId: string,
): Promise<{ context: AuthorizedProperty; response: PayoutPreviewResponse }> {
  const context = await authorizeProperty(supabase, propertyId, true)
  const period = getCivilMonthPeriod(input.periodo)
  let rule: PayoutRuleDto
  let ruleRef: PayoutPreviewResponse['ruleRef']

  if (input.mode === 'persisted') {
    rule = await loadRuleById(supabase, context, input.ruleId)
    ruleRef = { kind: 'persisted', id: rule.id }
  } else {
    const id = `sim_${crypto.randomUUID()}`
    rule = simulationRule(input.rule, context, id)
    ruleRef = { kind: 'simulation', id }
  }

  if (rule.contractVersion === 2) {
    const [expenses, snapshots, payoutSlices] = await Promise.all([
      loadExpenses(supabase, context, period.inicio, period.fim),
      rule.competenciaReceita === 'payout_date'
        ? Promise.resolve([])
        : loadCanonicalSnapshots(supabase, context, rule, period.inicio, period.fim),
      rule.competenciaReceita === 'payout_date'
        ? loadPayoutSlices(supabase, context, period.inicio, period.fim)
        : Promise.resolve([]),
    ])
    const result = buildPayoutPreviewV2({
      organizationId: context.organizationId,
      propertyId: context.property.id,
      currency: context.property.currency,
      month: input.periodo,
      rule: {
        contractVersion: 2,
        id: rule.id,
        organizationId: rule.organizationId,
        propriedadeId: rule.propriedadeId,
        tipoComissao: rule.tipoComissao,
        comissaoValor: rule.comissaoValor,
        impostoComissaoPercentual: rule.impostoComissaoPercentual,
        competenciaReceita: rule.competenciaReceita,
        fluxoFinanceiro: rule.fluxoFinanceiro,
        preset: rule.preset,
        allowDeclaredOwnerBase: rule.allowDeclaredOwnerBase,
        despesasRepassaveis: rule.despesasRepassaveis,
        componentes: rule.componentes,
      },
      snapshots,
      payoutSlices,
      expenses,
    })
    return {
      context,
      response: {
        requestId,
        periodo: period,
        ruleRef,
        dataQuality: {
          status: 'complete',
          issues: [],
          evidenceLevel: result.evidenceLevel,
          componentPolicyCoverage: result.componentPolicyCoverage,
          evidenceCounts: result.evidenceCounts,
          evidenceReservationIds: result.evidenceReservationIds,
        },
        result,
      },
    }
  }

  const [{ data: reservationData, error: reservationError }, { data: expenseData, error: expenseError }] = await Promise.all([
    supabase
      .from('reservations')
      .select('id,organization_id,property_id,status,check_in,check_out,currency,total_amount,service_fee_amount,platform_fee,discount_amount,raw_data')
      .eq('organization_id', context.organizationId)
      .eq('property_id', context.property.id)
      .eq('status', 'confirmed')
      .lte('check_in', period.fim)
      .gte('check_out', period.inicio)
      .limit(10_001),
    supabase
      .from('expenses')
      .select('id,organization_id,property_id,expense_date,currency,amount')
      .eq('organization_id', context.organizationId)
      .eq('property_id', context.property.id)
      .gte('expense_date', period.inicio)
      .lte('expense_date', period.fim)
      .limit(10_001),
  ])
  if (reservationError || expenseError) {
    throw new PayoutServiceError(500, 'PAYOUT_READ_FAILED', 'Não foi possível consultar os dados financeiros')
  }

  const reservations: PayoutReservationRow[] = parseDatabaseValue(
    z.array(reservationRowSchema),
    reservationData ?? [],
  ).map(row => ({
    id: row.id,
    organizationId: row.organization_id,
    propertyId: row.property_id,
    status: row.status,
    checkIn: row.check_in,
    checkOut: row.check_out,
    currency: row.currency,
    totalAmount: row.total_amount,
    serviceFeeAmount: row.service_fee_amount,
    platformFee: row.platform_fee,
    discountAmount: row.discount_amount,
    lineage: parseLineage(row.raw_data),
  }))
  const expenses: PayoutExpenseRow[] = parseDatabaseValue(
    z.array(expenseRowSchema),
    expenseData ?? [],
  ).map(row => ({
    id: row.id,
    organizationId: row.organization_id,
    propertyId: row.property_id,
    expenseDate: row.expense_date,
    currency: row.currency,
    amount: row.amount,
  }))

  const result = buildPayoutPreview({
    organizationId: context.organizationId,
    propertyId: context.property.id,
    currency: context.property.currency,
    period,
    reservations,
    expenses,
    rule: toDomainRule(rule),
  })
  return {
    context,
    response: {
      requestId,
      periodo: period,
      ruleRef,
      dataQuality: { status: 'complete', issues: [] },
      result,
    },
  }
}
