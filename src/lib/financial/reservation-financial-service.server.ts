import 'server-only'

import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getUserAccess } from '@/lib/auth/getUserAccess'
import {
  financialSnapshotInputSchema,
  type FinancialSnapshotInput,
  type PutReservationFinancialFactsRequest,
} from '@/lib/financial/payout-contract'
import { PayoutServiceError } from '@/lib/financial/payout-service.server'
import { postgresUuidSchema } from '@/lib/validation/postgres-uuid'

const idSchema = postgresUuidSchema
const money = z.union([z.string(), z.number()]).transform(String).nullable()
const reservationSchema = z.object({
  id: idSchema, organization_id: idSchema, property_id: idSchema,
  booking_source: z.string().nullable(), currency: z.string().nullable(),
  external_reservation_id: z.string().nullable(), external_id: z.string().nullable(),
  total_amount: money,
}).passthrough()

const snapshotSchema = z.object({
  id: idSchema, reservation_id: idSchema, version: z.number().int().positive(),
  status: z.enum(['pending', 'complete', 'needs_review']),
  fact_mode: z.enum(['component_breakdown', 'declared_owner_base']), currency: z.string(),
  declared_owner_base_amount: money, accommodation_amount: money, cleaning_fee_amount: money,
  municipal_tax_amount: money, other_guest_fees_amount: money, discount_amount: money,
  platform_adjustment_amount: money, guest_total_amount: money, ota_commission_base_amount: money,
  ota_commission_amount: money, payment_processing_fee_amount: money,
  manager_cleaning_cost_amount: money, channel_net_payout_amount: money,
  ota_commission_settlement: z.enum(['withheld','invoiced_separately','not_applicable','unknown']),
  payment_processing_settlement: z.enum(['withheld','invoiced_separately','not_applicable','unknown']),
  source_kind: z.enum(['manual','ical','channel_api','channel_csv','import']),
  provider: z.string().nullable(), external_reference: z.string().nullable(), captured_at: z.string(),
  source_mapping_version: z.string().nullable(), source_metadata: z.record(z.string(), z.unknown()),
  created_by: idSchema.nullable(),
}).strict()

const authorSchema = z.object({ id: idSchema, full_name: z.string().nullable() }).strict()

const parameterSchema = z.object({
  version: z.number().int().positive(), currency: z.string(),
  guest_cleaning_fee_default_amount: money, guest_cleaning_fee_mode: z.enum(['per_stay','per_night']).nullable(),
  manager_cleaning_cost_default_amount: money, manager_cleaning_cost_mode: z.enum(['per_stay','per_night']).nullable(),
  municipal_tax_amount_per_guest_night: money, valid_from: z.string(), valid_to: z.string().nullable(), note: z.string().nullable(),
}).strict()

const SNAPSHOT_SELECT = 'id,reservation_id,version,status,fact_mode,currency,declared_owner_base_amount,accommodation_amount,cleaning_fee_amount,municipal_tax_amount,other_guest_fees_amount,discount_amount,platform_adjustment_amount,guest_total_amount,ota_commission_base_amount,ota_commission_amount,payment_processing_fee_amount,manager_cleaning_cost_amount,channel_net_payout_amount,ota_commission_settlement,payment_processing_settlement,source_kind,provider,external_reference,captured_at,source_mapping_version,source_metadata,created_by'

function isManualFinancialSource(source: string): boolean {
  return source === 'manual' || source.startsWith('ical')
}

function mapSnapshot(row: z.infer<typeof snapshotSchema>): FinancialSnapshotInput {
  const common = {
    reservationId: row.reservation_id, version: row.version, currency: row.currency, status: row.status,
    accommodationAmount: row.accommodation_amount, cleaningFeeAmount: row.cleaning_fee_amount,
    municipalTaxAmount: row.municipal_tax_amount, otherGuestFeesAmount: row.other_guest_fees_amount,
    discountAmount: row.discount_amount, platformAdjustmentAmount: row.platform_adjustment_amount,
    guestTotalAmount: row.guest_total_amount, otaCommissionBaseAmount: row.ota_commission_base_amount,
    otaCommissionAmount: row.ota_commission_amount, paymentProcessingFeeAmount: row.payment_processing_fee_amount,
    managerCleaningCostAmount: row.manager_cleaning_cost_amount, channelNetPayoutAmount: row.channel_net_payout_amount,
    otaCommissionSettlement: row.ota_commission_settlement,
    paymentProcessingSettlement: row.payment_processing_settlement,
    sourceKind: row.source_kind, provider: row.provider, externalReference: row.external_reference,
    capturedAt: row.captured_at, sourceMappingVersion: row.source_mapping_version, sourceMetadata: row.source_metadata,
  }
  return financialSnapshotInputSchema.parse(row.fact_mode === 'declared_owner_base'
    ? { ...common, factMode: row.fact_mode, declaredOwnerBaseAmount: row.declared_owner_base_amount }
    : { ...common, factMode: row.fact_mode, declaredOwnerBaseAmount: null })
}

async function context(supabase: SupabaseClient, reservationId: string, mutation: boolean) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new PayoutServiceError(401, 'UNAUTHENTICATED', 'Autenticação necessária')
  const access = await getUserAccess(supabase, user)
  if (!access?.profile.organization_id) throw new PayoutServiceError(404, 'RESERVATION_NOT_FOUND', 'Reserva não encontrada')
  if (mutation && !['admin', 'gestor'].includes(access.profile.role)) {
    throw new PayoutServiceError(403, 'FORBIDDEN', 'Você não tem permissão para esta operação')
  }
  const { data, error } = await supabase.from('reservations')
    .select('id,organization_id,property_id,booking_source,currency,external_reservation_id,external_id,total_amount')
    .eq('id', reservationId).eq('organization_id', access.profile.organization_id).maybeSingle()
  if (error) throw new PayoutServiceError(500, 'FINANCIAL_FACTS_READ_FAILED', 'Não foi possível consultar a reserva')
  const parsed = reservationSchema.safeParse(data)
  if (!parsed.success || (access.propertyIds !== null && !access.propertyIds.includes(parsed.data.property_id))) {
    throw new PayoutServiceError(404, 'RESERVATION_NOT_FOUND', 'Reserva não encontrada')
  }
  return { userId: user.id, organizationId: access.profile.organization_id, reservation: parsed.data }
}

export async function getReservationFinancialFacts(supabase: SupabaseClient, reservationId: string, requestId: string) {
  const authorized = await context(supabase, reservationId, false)
  const [snapshotResult, ruleResult, parameterResult] = await Promise.all([
    supabase.from('reservation_financial_snapshots').select(SNAPSHOT_SELECT)
      .eq('organization_id', authorized.organizationId).eq('reservation_id', reservationId)
      .order('version', { ascending: false }).limit(21),
    supabase.from('regras_repasse').select('allow_declared_owner_base')
      .eq('organization_id', authorized.organizationId).eq('propriedade_id', authorized.reservation.property_id)
      .is('vigencia_fim', null).maybeSingle(),
    supabase.from('property_financial_parameters')
      .select('version,currency,guest_cleaning_fee_default_amount,guest_cleaning_fee_mode,manager_cleaning_cost_default_amount,manager_cleaning_cost_mode,municipal_tax_amount_per_guest_night,valid_from,valid_to,note')
      .eq('organization_id', authorized.organizationId).eq('property_id', authorized.reservation.property_id)
      .is('valid_to', null).maybeSingle(),
  ])
  if (snapshotResult.error || ruleResult.error || parameterResult.error) {
    throw new PayoutServiceError(500, 'FINANCIAL_FACTS_READ_FAILED', 'Não foi possível consultar os fatos financeiros')
  }
  const rows = z.array(snapshotSchema).parse(snapshotResult.data ?? [])
  const authorIds = [...new Set(rows.flatMap(row => row.created_by ? [row.created_by] : []))]
  const authorResult = authorIds.length
    ? await supabase.from('user_profiles').select('id,full_name')
      .eq('organization_id', authorized.organizationId).in('id', authorIds)
    : { data: [], error: null }
  if (authorResult.error) {
    throw new PayoutServiceError(500, 'FINANCIAL_FACTS_READ_FAILED', 'Não foi possível consultar a autoria dos fatos financeiros')
  }
  const authors = new Map(z.array(authorSchema).parse(authorResult.data ?? []).map(author => [author.id, author.full_name]))
  const current = rows[0] ? mapSnapshot(rows[0]) : null
  const defaults = parameterResult.data ? parameterSchema.parse(parameterResult.data) : null
  const source = authorized.reservation.booking_source ?? 'unknown'
  const compatibility = current?.factMode === 'declared_owner_base'
    ? (isManualFinancialSource(source) ? 'legacy_synced' : 'legacy_divergence_visible')
    : 'legacy_not_synced'
  return {
    requestId,
    reservation: {
      id: reservationId, propertyId: authorized.reservation.property_id, source,
      currency: authorized.reservation.currency, externalReference: authorized.reservation.external_reservation_id ?? authorized.reservation.external_id,
      declaredOwnerBaseAllowed: ruleResult.data?.allow_declared_owner_base === true,
      compatibility,
    },
    currentSnapshot: current && rows[0] ? {
      ...current,
      capturedBy: rows[0].created_by ? { id: rows[0].created_by, name: authors.get(rows[0].created_by) ?? null } : null,
    } : null,
    historySummary: rows.slice(1).map(row => ({
      version: row.version, factMode: row.fact_mode, status: row.status, capturedAt: row.captured_at,
      capturedBy: row.created_by ? { id: row.created_by, name: authors.get(row.created_by) ?? null } : null,
    })),
    defaults: defaults ? {
      version: defaults.version, currency: defaults.currency,
      guestCleaningFeeDefaultAmount: defaults.guest_cleaning_fee_default_amount,
      guestCleaningFeeMode: defaults.guest_cleaning_fee_mode,
      managerCleaningCostDefaultAmount: defaults.manager_cleaning_cost_default_amount,
      managerCleaningCostMode: defaults.manager_cleaning_cost_mode,
      municipalTaxAmountPerGuestNight: defaults.municipal_tax_amount_per_guest_night,
      validFrom: defaults.valid_from, note: defaults.note,
    } : null,
  }
}

export async function replaceReservationFinancialFacts(
  supabase: SupabaseClient, reservationId: string, input: PutReservationFinancialFactsRequest, requestId: string,
) {
  await context(supabase, reservationId, true)
  const detailed = input.factMode === 'component_breakdown' ? input : null
  const { error } = await supabase.rpc('replace_reservation_financial_snapshot', {
    p_reservation_id: reservationId, p_expected_current_version: input.expectedCurrentVersion,
    p_fact_mode: input.factMode, p_currency: input.currency,
    p_declared_owner_base_amount: input.factMode === 'declared_owner_base' ? input.declaredOwnerBaseAmount : null,
    p_accommodation_amount: detailed?.accommodationAmount ?? null,
    p_cleaning_fee_amount: detailed?.cleaningFeeAmount ?? null,
    p_municipal_tax_amount: detailed?.municipalTaxAmount ?? null,
    p_other_guest_fees_amount: detailed?.otherGuestFeesAmount ?? null,
    p_discount_amount: detailed?.discountAmount ?? null,
    p_platform_adjustment_amount: detailed?.platformAdjustmentAmount ?? null,
    p_guest_total_amount: detailed?.guestTotalAmount ?? null,
    p_ota_commission_base_amount: detailed?.otaCommissionBaseAmount ?? null,
    p_ota_commission_amount: detailed?.otaCommissionAmount ?? null,
    p_payment_processing_fee_amount: detailed?.paymentProcessingFeeAmount ?? null,
    p_manager_cleaning_cost_amount: detailed?.managerCleaningCostAmount ?? null,
    p_channel_net_payout_amount: detailed?.channelNetPayoutAmount ?? null,
    p_ota_commission_settlement: detailed?.otaCommissionSettlement ?? 'unknown',
    p_payment_processing_settlement: detailed?.paymentProcessingSettlement ?? 'unknown',
    p_note: input.note ?? null,
  })
  if (error) {
    if (error.message.includes('DECLARED_OWNER_BASE_NOT_ALLOWED')) {
      throw new PayoutServiceError(422, 'DECLARED_OWNER_BASE_NOT_ALLOWED', 'O contrato vigente não autoriza valores declarados. Revise a política financeira da propriedade.')
    }
    if (error.code === '40001' || error.message.includes('CONFLICT')) throw new PayoutServiceError(409, 'FINANCIAL_FACTS_CONFLICT', 'Os dados foram alterados por outra sessão')
    if (error.message.includes('NOT_FOUND')) throw new PayoutServiceError(404, 'RESERVATION_NOT_FOUND', 'Reserva não encontrada')
    if (error.message.includes('FORBIDDEN')) throw new PayoutServiceError(403, 'FORBIDDEN', 'Você não tem permissão para esta operação')
    if (error.message.includes('INVALID')) throw new PayoutServiceError(422, 'INVALID_FINANCIAL_FACTS', 'Revise os dados financeiros')
    throw new PayoutServiceError(500, 'FINANCIAL_FACTS_WRITE_FAILED', 'Não foi possível salvar os fatos financeiros')
  }
  return getReservationFinancialFacts(supabase, reservationId, requestId)
}
