import {
  financialSnapshotInputSchema,
  createPayoutRuleV2RequestSchema,
  payoutRuleInputSchema,
  payoutRuleV2InputSchema,
  putReservationFinancialFactsRequestSchema,
  previewPayoutRequestSchema,
  replacePayoutRuleRequestSchema,
  replacePayoutRuleV2RequestSchema,
} from '../payout-contract'

const validRule = {
  vigenciaInicio: '2026-09-01',
  tipoComissao: 'percentual' as const,
  comissaoValor: '17.5000',
  baseComissao: 'faturamento_propriedade' as const,
  taxaLimpezaPara: 'gestor' as const,
  comissaoOtaPorConta: 'proprietario' as const,
  despesasRepassaveis: true,
  diaFechamento: 5,
  observacoes: null,
}

describe('payout request contracts', () => {
  it('accepts the canonical strict payout rule input', () => {
    expect(payoutRuleInputSchema.parse(validRule)).toEqual(validRule)
  })

  it('rejects unknown fields, invalid dates and percentage above 100', () => {
    expect(payoutRuleInputSchema.safeParse({ ...validRule, organizationId: 'untrusted' }).success).toBe(false)
    expect(payoutRuleInputSchema.safeParse({ ...validRule, vigenciaInicio: '2026-02-30' }).success).toBe(false)
    expect(payoutRuleInputSchema.safeParse({ ...validRule, comissaoValor: '100.0001' }).success).toBe(false)
  })

  it('requires optimistic concurrency id for replacement', () => {
    expect(replacePayoutRuleRequestSchema.safeParse({
      ...validRule,
      expectedCurrentRuleId: 'a6cab360-53a9-4f7d-8766-b8eaba839bde',
    }).success).toBe(true)
    expect(replacePayoutRuleRequestSchema.safeParse(validRule).success).toBe(false)
  })

  it('accepts only the persisted or simulation discriminated preview shapes', () => {
    expect(previewPayoutRequestSchema.safeParse({
      mode: 'persisted', periodo: '2026-08', ruleId: 'a6cab360-53a9-4f7d-8766-b8eaba839bde',
    }).success).toBe(true)
    expect(previewPayoutRequestSchema.safeParse({ mode: 'simulation', periodo: '2026-08', rule: validRule }).success).toBe(true)
    expect(previewPayoutRequestSchema.safeParse({ mode: 'persisted', periodo: '08/2026', ruleId: 'bad' }).success).toBe(false)
  })

  it('valida uma política v2 completa e rejeita componentes duplicados', () => {
    const componentes = [
      'accommodation', 'cleaning_fee', 'municipal_tax', 'other_guest_fees',
      'discount', 'ota_commission', 'payment_processing_fee',
    ].map(componente => ({
      componente,
      destinatario: 'owner',
      efeitoNaBaseComissao: 'credit',
      efeitoNoExtratoProprietario: 'credit',
    }))
    const input = {
      vigenciaInicio: '2026-09-09', tipoComissao: 'percentual', comissaoValor: '20',
      impostoComissaoPercentual: '23', competenciaReceita: 'payout_date',
      fluxoFinanceiro: 'owner_direct', preset: 'custom', despesasRepassaveis: true,
      diaFechamento: 5, observacoes: null, componentes,
    }
    expect(payoutRuleV2InputSchema.safeParse(input).success).toBe(true)
    expect(replacePayoutRuleV2RequestSchema.safeParse({
      ...input,
      contractVersion: 2,
      expectedCurrentRuleId: 'a6cab360-53a9-4f7d-8766-b8eaba839bde',
    }).success).toBe(true)
    expect(createPayoutRuleV2RequestSchema.safeParse({
      ...input,
      contractVersion: 2,
      expectedCurrentRuleId: null,
    }).success).toBe(true)
    expect(createPayoutRuleV2RequestSchema.safeParse({
      ...input,
      contractVersion: 2,
      expectedCurrentRuleId: 'a6cab360-53a9-4f7d-8766-b8eaba839bde',
    }).success).toBe(false)
    expect(payoutRuleV2InputSchema.safeParse({
      ...input,
      competenciaReceita: 'stay_prorata',
    }).success).toBe(true)
    expect(payoutRuleV2InputSchema.safeParse({
      ...input,
      componentes: [...componentes.slice(0, 6), componentes[0]],
    }).success).toBe(false)
  })

  it('preserva proveniência e discrimina snapshots detalhados e declarados', () => {
    const input = {
      reservationId: 'a6cab360-53a9-4f7d-8766-b8eaba839bde',
      version: 1, factMode: 'component_breakdown', declaredOwnerBaseAmount: null,
      currency: 'EUR', status: 'complete', accommodationAmount: '864.50',
      cleaningFeeAmount: '90', municipalTaxAmount: '20', otherGuestFeesAmount: '0',
      discountAmount: '0', guestTotalAmount: '974.50', otaCommissionAmount: '143.18',
      platformAdjustmentAmount: '0', otaCommissionBaseAmount: '954.50', managerCleaningCostAmount: '90',
      paymentProcessingFeeAmount: '13.64', channelNetPayoutAmount: '817.68',
      otaCommissionSettlement: 'withheld', paymentProcessingSettlement: 'withheld',
      sourceKind: 'manual', provider: 'airbnb', externalReference: null,
      capturedAt: '2026-09-11T10:00:00.000Z', sourceMappingVersion: 'manual-v1', sourceMetadata: { import: 'sheet' },
    }
    expect(financialSnapshotInputSchema.safeParse(input).success).toBe(true)
    expect(financialSnapshotInputSchema.safeParse({
      ...input, factMode: 'declared_owner_base', declaredOwnerBaseAmount: '500.00',
    }).success).toBe(true)
    expect(financialSnapshotInputSchema.safeParse({
      ...input, declaredOwnerBaseAmount: '500.00',
    }).success).toBe(false)
    expect(financialSnapshotInputSchema.safeParse({
      ...input, factMode: 'declared_owner_base',
    }).success).toBe(false)
  })

  it('valida o PUT discriminado e rejeita identidade/autoria controladas pelo cliente', () => {
    expect(putReservationFinancialFactsRequestSchema.safeParse({
      expectedCurrentVersion: 1,
      factMode: 'declared_owner_base',
      currency: 'EUR',
      declaredOwnerBaseAmount: '500.00',
      note: 'Confirmado pelo operador',
    }).success).toBe(true)
    expect(putReservationFinancialFactsRequestSchema.safeParse({
      expectedCurrentVersion: null,
      factMode: 'component_breakdown',
      currency: 'EUR',
      accommodationAmount: '864.50',
      platformAdjustmentAmount: '-10.25',
      channelNetPayoutAmount: '800.00',
    }).success).toBe(true)
    expect(putReservationFinancialFactsRequestSchema.safeParse({
      expectedCurrentVersion: 1,
      factMode: 'declared_owner_base',
      currency: 'EUR',
      declaredOwnerBaseAmount: '500.00',
      organizationId: 'untrusted',
    }).success).toBe(false)
    expect(putReservationFinancialFactsRequestSchema.safeParse({
      expectedCurrentVersion: 1,
      factMode: 'declared_owner_base',
      currency: 'EUR',
      declaredOwnerBaseAmount: '-1.00',
    }).success).toBe(false)
  })
})
