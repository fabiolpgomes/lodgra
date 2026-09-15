import {
  adaptCanonicalPayoutDataForPeriod,
  buildPayoutPreviewV2,
  type CanonicalFinancialSnapshotRow,
  type PayoutRecognitionSliceRow,
} from '../payout-period-v2'
import { getCivilMonthPeriod, PayoutDataIncompleteError } from '../payout-period'
import type { RegraRepasseV2 } from '../payout-rules'

const organizationId = 'org-1'
const propertyId = 'property-1'
const values = {
  accommodation: '864.50', cleaning_fee: '90.00', municipal_tax: '20.00',
  other_guest_fees: '0.00', discount: '0.00', ota_commission: '143.18',
  payment_processing_fee: '13.64',
}

const rule: RegraRepasseV2 = {
  contractVersion: 2, id: 'rule-v2', organizationId, propriedadeId: propertyId,
  tipoComissao: 'percentual', comissaoValor: '20', impostoComissaoPercentual: '0',
  competenciaReceita: 'check_in', fluxoFinanceiro: 'manager_trust', preset: 'net_received',
  allowDeclaredOwnerBase: false,
  despesasRepassaveis: true,
  componentes: [
    { componente: 'accommodation', destinatario: 'owner', efeitoNaBaseComissao: 'credit', efeitoNoExtratoProprietario: 'credit' },
    { componente: 'cleaning_fee', destinatario: 'manager', efeitoNaBaseComissao: 'credit', efeitoNoExtratoProprietario: 'ignore' },
    { componente: 'municipal_tax', destinatario: 'municipality', efeitoNaBaseComissao: 'credit', efeitoNoExtratoProprietario: 'ignore' },
    { componente: 'other_guest_fees', destinatario: 'owner', efeitoNaBaseComissao: 'credit', efeitoNoExtratoProprietario: 'credit' },
    { componente: 'discount', destinatario: 'owner', efeitoNaBaseComissao: 'debit', efeitoNoExtratoProprietario: 'debit' },
    { componente: 'ota_commission', destinatario: 'channel', efeitoNaBaseComissao: 'debit', efeitoNoExtratoProprietario: 'debit' },
    { componente: 'payment_processing_fee', destinatario: 'payment_processor', efeitoNaBaseComissao: 'debit', efeitoNoExtratoProprietario: 'debit' },
  ],
}

function snapshot(overrides: Partial<CanonicalFinancialSnapshotRow> = {}): CanonicalFinancialSnapshotRow {
  return {
    reservationId: 'reservation-1', organizationId, propertyId, version: 1, status: 'complete',
    factMode: 'component_breakdown',
    checkIn: '2026-07-30', checkOut: '2026-08-05', currency: 'EUR', values,
    declaredOwnerBaseAmount: null, platformAdjustmentAmount: '0.00',
    otaCommissionBaseAmount: '954.50', managerCleaningCostAmount: '90.00',
    guestTotalAmount: '974.50', channelNetPayoutAmount: '817.68',
    otaCommissionSettlement: 'withheld', paymentProcessingSettlement: 'withheld',
    sourceKind: 'manual', provider: 'airbnb', externalReference: 'reservation-1',
    capturedAt: '2026-09-11T10:00:00.000Z', sourceMappingVersion: 'manual-v1', sourceMetadata: {},
    ...overrides,
  }
}

function slice(overrides: Partial<PayoutRecognitionSliceRow> = {}): PayoutRecognitionSliceRow {
  return {
    allocationId: 'allocation-1', reservationId: 'reservation-1', organizationId, propertyId,
    payoutAt: '2026-08-02T10:00:00.000Z', reconciliationStatus: 'reconciled',
    allocationType: 'reservation', currency: 'EUR', allocationNetAmount: '817.68', values,
    otaCommissionSettlement: 'withheld', paymentProcessingSettlement: 'withheld',
    ...overrides,
  }
}

describe('payout v2 temporal adapter', () => {
  it('seleciona a reserva integralmente por check-in ou check-out conforme o contrato', () => {
    const july = adaptCanonicalPayoutDataForPeriod({
      organizationId, propertyId, currency: 'EUR', period: getCivilMonthPeriod('2026-07'),
      rule, snapshots: [snapshot()], payoutSlices: [], expenses: [],
    })
    expect(july.reservas).toHaveLength(1)
    const augustByCheckIn = adaptCanonicalPayoutDataForPeriod({
      organizationId, propertyId, currency: 'EUR', period: getCivilMonthPeriod('2026-08'),
      rule, snapshots: [snapshot()], payoutSlices: [], expenses: [],
    })
    expect(augustByCheckIn.reservas).toHaveLength(0)

    const august = adaptCanonicalPayoutDataForPeriod({
      organizationId, propertyId, currency: 'EUR', period: getCivilMonthPeriod('2026-08'),
      rule: { ...rule, competenciaReceita: 'check_out' }, snapshots: [snapshot()],
      payoutSlices: [], expenses: [],
    })
    expect(august.reservas).toHaveLength(1)
    const julyByCheckOut = adaptCanonicalPayoutDataForPeriod({
      organizationId, propertyId, currency: 'EUR', period: getCivilMonthPeriod('2026-07'),
      rule: { ...rule, competenciaReceita: 'check_out' }, snapshots: [snapshot()],
      payoutSlices: [], expenses: [],
    })
    expect(julyByCheckOut.reservas).toHaveLength(0)
  })

  it('rateia por noites entre meses e preserva todos os cêntimos da reserva e da comissão', () => {
    const prorataRule: RegraRepasseV2 = { ...rule, competenciaReceita: 'stay_prorata' }
    const july = buildPayoutPreviewV2({
      organizationId, propertyId, currency: 'EUR', month: '2026-07',
      rule: prorataRule, snapshots: [snapshot()], payoutSlices: [], expenses: [],
    })
    const august = buildPayoutPreviewV2({
      organizationId, propertyId, currency: 'EUR', month: '2026-08',
      rule: prorataRule, snapshots: [snapshot()], payoutSlices: [], expenses: [],
    })

    expect(july.totaisComponentesMinor).toMatchObject({
      accommodation: 28_818, cleaning_fee: 3_000, municipal_tax: 668,
      ota_commission: 4_774, payment_processing_fee: 456,
    })
    expect(august.totaisComponentesMinor).toMatchObject({
      accommodation: 57_632, cleaning_fee: 6_000, municipal_tax: 1_332,
      ota_commission: 9_544, payment_processing_fee: 908,
    })
    expect(july.baseComissaoGestaoMinor + august.baseComissaoGestaoMinor).toBe(81_768)
    expect(july.comissaoGestaoMinor).toBe(5_452)
    expect(august.comissaoGestaoMinor).toBe(10_902)
    expect(july.comissaoGestaoMinor + august.comissaoGestaoMinor).toBe(16_354)
    expect(july.reservaIds).toEqual(['reservation-1'])
    expect(august.reservaIds).toEqual(['reservation-1'])
  })

  it('rateia comissão fixa por reserva uma única vez entre os meses da estadia', () => {
    const prorataRule: RegraRepasseV2 = {
      ...rule,
      tipoComissao: 'fixo_por_reserva',
      comissaoValor: '60.01',
      impostoComissaoPercentual: '23',
      competenciaReceita: 'stay_prorata',
    }
    const july = buildPayoutPreviewV2({
      organizationId, propertyId, currency: 'EUR', month: '2026-07',
      rule: prorataRule, snapshots: [snapshot()], payoutSlices: [], expenses: [],
    })
    const august = buildPayoutPreviewV2({
      organizationId, propertyId, currency: 'EUR', month: '2026-08',
      rule: prorataRule, snapshots: [snapshot()], payoutSlices: [], expenses: [],
    })

    expect(july.comissaoGestaoMinor).toBe(2_001)
    expect(august.comissaoGestaoMinor).toBe(4_000)
    expect(july.comissaoGestaoMinor + august.comissaoGestaoMinor).toBe(6_001)
    expect(july.impostoComissaoGestaoMinor + august.impostoComissaoGestaoMinor).toBe(1_380)
  })

  it('bloqueia pró-rata com datas de estadia inválidas', () => {
    expect(() => adaptCanonicalPayoutDataForPeriod({
      organizationId, propertyId, currency: 'EUR', period: getCivilMonthPeriod('2026-08'),
      rule: { ...rule, competenciaReceita: 'stay_prorata' },
      snapshots: [snapshot({ checkOut: '2026-07-30' })], payoutSlices: [], expenses: [],
    })).toThrow(PayoutDataIncompleteError)
  })

  it('usa somente alocações reconciliadas do mês quando a competência é payout_date', () => {
    const adapted = adaptCanonicalPayoutDataForPeriod({
      organizationId, propertyId, currency: 'EUR', period: getCivilMonthPeriod('2026-08'),
      rule: { ...rule, competenciaReceita: 'payout_date' }, snapshots: [],
      payoutSlices: [
        slice(),
        slice({ allocationId: 'allocation-july', payoutAt: '2026-07-31T10:00:00.000Z' }),
      ], expenses: [],
    })
    expect(adapted.reservas[0]).toMatchObject({
      id: 'reservation-1', totalCobradoHospedeMinor: 97_450, payoutLiquidoCanalMinor: 81_768,
    })
  })

  it('agrega pagamento e reembolso exatos da mesma reserva no mês', () => {
    const result = buildPayoutPreviewV2({
      organizationId, propertyId, currency: 'EUR', month: '2026-08',
      rule: { ...rule, competenciaReceita: 'payout_date' }, snapshots: [], expenses: [],
      payoutSlices: [
        slice(),
        slice({
          allocationId: 'refund-1', allocationType: 'refund', allocationNetAmount: '-100.00',
          values: { ...values, accommodation: '100.00', cleaning_fee: '0.00', municipal_tax: '0.00', ota_commission: '0.00', payment_processing_fee: '0.00' },
        }),
      ],
    })
    expect(result.totaisComponentesMinor.accommodation).toBe(76_450)
    expect(result.comissaoGestaoMinor).toBe(14_354)
  })

  it('bloqueia snapshot ou alocação ainda não reconciliados', () => {
    expect(() => adaptCanonicalPayoutDataForPeriod({
      organizationId, propertyId, currency: 'EUR', period: getCivilMonthPeriod('2026-07'),
      rule, snapshots: [snapshot({ status: 'pending' })], payoutSlices: [], expenses: [],
    })).toThrow(PayoutDataIncompleteError)

    expect(() => adaptCanonicalPayoutDataForPeriod({
      organizationId, propertyId, currency: 'EUR', period: getCivilMonthPeriod('2026-08'),
      rule: { ...rule, competenciaReceita: 'payout_date' }, snapshots: [],
      payoutSlices: [slice({ reconciliationStatus: 'needs_review' })], expenses: [],
    })).toThrow(PayoutDataIncompleteError)
  })

  it('distingue payout líquido ausente de divergência de reconciliação', () => {
    try {
      adaptCanonicalPayoutDataForPeriod({
        organizationId, propertyId, currency: 'EUR', period: getCivilMonthPeriod('2026-07'),
        rule, snapshots: [snapshot({ channelNetPayoutAmount: null })], payoutSlices: [], expenses: [],
      })
      throw new Error('esperava dados incompletos')
    } catch (error) {
      expect(error).toBeInstanceOf(PayoutDataIncompleteError)
      expect((error as PayoutDataIncompleteError).issues).toContainEqual({
        code: 'MISSING_CHANNEL_NET_PAYOUT',
        entityType: 'reservation',
        entityId: 'reservation-1',
        field: 'channel_net_payout_amount',
      })
    }
  })

  it('aceita somente os componentes usados pela política detalhada', () => {
    const minimalRule: RegraRepasseV2 = {
      ...rule,
      componentes: rule.componentes.map(component => component.componente === 'accommodation'
        ? component
        : { ...component, efeitoNaBaseComissao: 'ignore', efeitoNoExtratoProprietario: 'ignore' }),
    }
    const minimalValues = Object.fromEntries(Object.keys(values).map(key => [
      key,
      key === 'accommodation' ? '864.50' : null,
    ])) as CanonicalFinancialSnapshotRow['values']
    const result = buildPayoutPreviewV2({
      organizationId, propertyId, currency: 'EUR', month: '2026-07', rule: minimalRule,
      snapshots: [snapshot({
        values: minimalValues,
        platformAdjustmentAmount: null,
        guestTotalAmount: '864.50',
        channelNetPayoutAmount: '864.50',
        otaCommissionSettlement: 'not_applicable',
        paymentProcessingSettlement: 'not_applicable',
      })],
      payoutSlices: [], expenses: [],
    })
    expect(result.baseComissaoGestaoMinor).toBe(86_450)
    expect(result.evidenceLevel).toBe('reconciled')
    expect(result.componentPolicyCoverage).toBe('full')
  })

  it('reconcilia ajuste de plataforma assinado sem adicioná-lo à política de repasse', () => {
    const result = buildPayoutPreviewV2({
      organizationId, propertyId, currency: 'EUR', month: '2026-07', rule,
      snapshots: [snapshot({
        platformAdjustmentAmount: '-10.00',
        guestTotalAmount: '964.50',
        channelNetPayoutAmount: '807.68',
      })],
      payoutSlices: [], expenses: [],
    })
    expect(result.baseComissaoGestaoMinor).toBe(81_768)
    expect(result.totaisComponentesMinor.accommodation).toBe(86_450)
  })

  it('calcula períodos declarados e mistos sem somar fatos auxiliares', () => {
    const declaredRule = { ...rule, allowDeclaredOwnerBase: true }
    const declaredSnapshot = snapshot({
      reservationId: 'declared-1', factMode: 'declared_owner_base', declaredOwnerBaseAmount: '500.00',
    })
    const declared = buildPayoutPreviewV2({
      organizationId, propertyId, currency: 'EUR', month: '2026-07', rule: declaredRule,
      snapshots: [declaredSnapshot], payoutSlices: [], expenses: [],
    })
    expect(declared.baseComissaoGestaoMinor).toBe(50_000)
    expect(declared.evidenceLevel).toBe('declared')

    const mixed = buildPayoutPreviewV2({
      organizationId, propertyId, currency: 'EUR', month: '2026-07', rule: declaredRule,
      snapshots: [snapshot(), declaredSnapshot], payoutSlices: [], expenses: [],
    })
    expect(mixed.baseComissaoGestaoMinor).toBe(131_768)
    expect(mixed.evidenceLevel).toBe('mixed')
  })

  it('conserva o valor declarado e a comissão no pró-rata mensal', () => {
    const prorataRule: RegraRepasseV2 = {
      ...rule, allowDeclaredOwnerBase: true, competenciaReceita: 'stay_prorata',
    }
    const declaredSnapshot = snapshot({ factMode: 'declared_owner_base', declaredOwnerBaseAmount: '500.01' })
    const july = buildPayoutPreviewV2({
      organizationId, propertyId, currency: 'EUR', month: '2026-07', rule: prorataRule,
      snapshots: [declaredSnapshot], payoutSlices: [], expenses: [],
    })
    const august = buildPayoutPreviewV2({
      organizationId, propertyId, currency: 'EUR', month: '2026-08', rule: prorataRule,
      snapshots: [declaredSnapshot], payoutSlices: [], expenses: [],
    })
    expect(july.baseComissaoGestaoMinor + august.baseComissaoGestaoMinor).toBe(50_001)
    expect(july.comissaoGestaoMinor + august.comissaoGestaoMinor).toBe(10_000)
  })

  it('emite issues tipadas para opt-in, ausência e conflito de representação', () => {
    const cases: Array<{ row: CanonicalFinancialSnapshotRow; expectedCode: string; testRule?: RegraRepasseV2 }> = [
      {
        row: snapshot({ factMode: 'declared_owner_base', declaredOwnerBaseAmount: '500.00' }),
        expectedCode: 'DECLARED_OWNER_BASE_NOT_ALLOWED',
      },
      {
        row: snapshot({ factMode: 'declared_owner_base', declaredOwnerBaseAmount: null }),
        expectedCode: 'MISSING_DECLARED_OWNER_BASE', testRule: { ...rule, allowDeclaredOwnerBase: true },
      },
      {
        row: snapshot({ factMode: 'component_breakdown', declaredOwnerBaseAmount: '500.00' }),
        expectedCode: 'FINANCIAL_FACT_MODE_CONFLICT',
      },
    ]
    for (const testCase of cases) {
      try {
        adaptCanonicalPayoutDataForPeriod({
          organizationId, propertyId, currency: 'EUR', period: getCivilMonthPeriod('2026-07'),
          rule: testCase.testRule ?? rule, snapshots: [testCase.row], payoutSlices: [], expenses: [],
        })
        throw new Error('esperava dados incompletos')
      } catch (error) {
        expect(error).toBeInstanceOf(PayoutDataIncompleteError)
        expect((error as PayoutDataIncompleteError).issues.some(item => item.code === testCase.expectedCode)).toBe(true)
      }
    }
  })

  it('não usa snapshot declarado como fallback de payout_date', () => {
    const result = buildPayoutPreviewV2({
      organizationId, propertyId, currency: 'EUR', month: '2026-07',
      rule: { ...rule, allowDeclaredOwnerBase: true, competenciaReceita: 'payout_date' },
      snapshots: [snapshot({ factMode: 'declared_owner_base', declaredOwnerBaseAmount: '500.00' })],
      payoutSlices: [], expenses: [],
    })
    expect(result.reservaIds).toEqual([])
    expect(result.baseComissaoGestaoMinor).toBe(0)
  })

  it('não mascara política malformada como dados financeiros incompletos', () => {
    const malformedRule = {
      ...rule,
      componentes: rule.componentes.filter(component => component.componente !== 'accommodation'),
    }
    expect(() => buildPayoutPreviewV2({
      organizationId, propertyId, currency: 'EUR', month: '2026-07',
      rule: malformedRule, snapshots: [snapshot()], payoutSlices: [], expenses: [],
    })).toThrow('componente ausente na política: accommodation')
  })
})
