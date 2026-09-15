import {
  allocateMinorByUnits,
  calcularRepasse,
  type FatosFinanceirosReservaV2,
  type PoliticaComponenteRepasse,
  type RegraRepasseV2,
} from '@/lib/financial/payout-rules'

const periodo = { inicio: '2026-08-01', fim: '2026-08-31' }

const components: PoliticaComponenteRepasse[] = [
  { componente: 'accommodation', destinatario: 'owner', efeitoNaBaseComissao: 'credit', efeitoNoExtratoProprietario: 'credit' },
  { componente: 'cleaning_fee', destinatario: 'manager', efeitoNaBaseComissao: 'credit', efeitoNoExtratoProprietario: 'ignore' },
  { componente: 'municipal_tax', destinatario: 'municipality', efeitoNaBaseComissao: 'credit', efeitoNoExtratoProprietario: 'ignore' },
  { componente: 'other_guest_fees', destinatario: 'owner', efeitoNaBaseComissao: 'credit', efeitoNoExtratoProprietario: 'credit' },
  { componente: 'discount', destinatario: 'owner', efeitoNaBaseComissao: 'debit', efeitoNoExtratoProprietario: 'debit' },
  { componente: 'ota_commission', destinatario: 'channel', efeitoNaBaseComissao: 'debit', efeitoNoExtratoProprietario: 'debit' },
  { componente: 'payment_processing_fee', destinatario: 'payment_processor', efeitoNaBaseComissao: 'debit', efeitoNoExtratoProprietario: 'debit' },
]

const rule: RegraRepasseV2 = {
  contractVersion: 2,
  id: 'rule-v2',
  organizationId: 'org-1',
  propriedadeId: 'property-1',
  tipoComissao: 'percentual',
  comissaoValor: '20',
  impostoComissaoPercentual: '0',
  competenciaReceita: 'check_in',
  fluxoFinanceiro: 'manager_trust',
  preset: 'net_received',
  allowDeclaredOwnerBase: false,
  despesasRepassaveis: true,
  componentes: components,
}

const reservation: FatosFinanceirosReservaV2 = {
  factMode: 'component_breakdown',
  id: 'reservation-1',
  currency: 'EUR',
  platformAdjustmentMinor: 0,
  valoresMinor: {
    accommodation: 86_450,
    cleaning_fee: 9_000,
    municipal_tax: 2_000,
    other_guest_fees: 0,
    discount: 0,
    ota_commission: 14_318,
    payment_processing_fee: 1_364,
  },
  totalCobradoHospedeMinor: 97_450,
  payoutLiquidoCanalMinor: 81_768,
  liquidacaoComissaoOta: 'withheld',
  liquidacaoProcessamentoPagamento: 'withheld',
}

describe('calcularRepasse v2', () => {
  it('distribui cêntimos deterministicamente e preserva totais positivos e negativos', () => {
    expect(allocateMinorByUnits(10, 3, 0, 1)).toBe(4)
    expect(allocateMinorByUnits(10, 3, 1, 2)).toBe(6)
    expect(allocateMinorByUnits(-10, 3, 0, 1)).toBe(-4)
    expect(allocateMinorByUnits(-10, 3, 1, 2)).toBe(-6)
  })

  it('calcula o cenário AHS sem atribuir limpeza e imposto municipal ao proprietário', () => {
    const result = calcularRepasse({
      reservas: [reservation],
      despesas: [],
      regra: rule,
      periodo,
      currency: 'EUR',
    })

    expect(result.contractVersion).toBe(2)
    expect(result.evidenceLevel).toBe('reconciled')
    expect(result.evidenceCounts).toEqual({ declaredOwnerBase: 0, componentBreakdown: 1 })
    expect(result.baseComissaoGestaoMinor).toBe(81_768)
    expect(result.comissaoGestaoMinor).toBe(16_354)
    expect(result.saldoEconomicoProprietarioMinor).toBe(54_414)
    expect(result.valorRepassarProprietarioMinor).toBe(54_414)
    expect(result.valorFaturarProprietarioMinor).toBe(0)
  })

  it('reconcilia comissão Booking faturada separadamente sem reduzi-la do payout observado', () => {
    const grossComponents = components.map(component => ({
      ...component,
      efeitoNaBaseComissao:
        component.componente === 'accommodation' ? 'credit' as const : 'ignore' as const,
    }))
    const result = calcularRepasse({
      reservas: [{
        ...reservation,
        payoutLiquidoCanalMinor: 97_450,
        liquidacaoComissaoOta: 'invoiced_separately',
        liquidacaoProcessamentoPagamento: 'not_applicable',
        valoresMinor: { ...reservation.valoresMinor, payment_processing_fee: 0 },
      }],
      despesas: [{ id: 'expense-1', currency: 'EUR', valorMinor: 15_000 }],
      regra: {
        ...rule,
        comissaoValor: '15',
        impostoComissaoPercentual: '23',
        competenciaReceita: 'payout_date',
        fluxoFinanceiro: 'owner_direct',
        preset: 'gross_reservation',
        componentes: grossComponents,
      },
      periodo,
      currency: 'EUR',
    })

    expect(result.baseComissaoGestaoMinor).toBe(86_450)
    expect(result.comissaoGestaoMinor).toBe(12_968)
    expect(result.impostoComissaoGestaoMinor).toBe(2_983)
    expect(result.saldoEconomicoProprietarioMinor).toBe(41_181)
    expect(result.valorRepassarProprietarioMinor).toBe(0)
    expect(result.valorFaturarProprietarioMinor).toBe(30_951)
  })

  it('detecta total do hóspede e payout do canal incompatíveis', () => {
    expect(() => calcularRepasse({
      reservas: [{ ...reservation, totalCobradoHospedeMinor: 97_451 }],
      despesas: [], regra: rule, periodo, currency: 'EUR',
    })).toThrow('GUEST_TOTAL_MISMATCH:reservation-1')

    expect(() => calcularRepasse({
      reservas: [{ ...reservation, payoutLiquidoCanalMinor: 97_450 }],
      despesas: [], regra: rule, periodo, currency: 'EUR',
    })).toThrow('CHANNEL_NET_MISMATCH:reservation-1')
  })

  it('rejeita custo marcado como não aplicável com valor diferente de zero', () => {
    expect(() => calcularRepasse({
      reservas: [{ ...reservation, liquidacaoComissaoOta: 'not_applicable' }],
      despesas: [], regra: rule, periodo, currency: 'EUR',
    })).toThrow('OTA_SETTLEMENT_MISMATCH:reservation-1')
  })

  it('exige exatamente uma política para cada componente canônico', () => {
    expect(() => calcularRepasse({
      reservas: [reservation],
      despesas: [],
      regra: { ...rule, componentes: components.slice(1) },
      periodo,
      currency: 'EUR',
    })).toThrow('componente ausente na política: accommodation')

    expect(() => calcularRepasse({
      reservas: [reservation],
      despesas: [],
      regra: { ...rule, componentes: [...components, components[0]] },
      periodo,
      currency: 'EUR',
    })).toThrow('componente duplicado na política: accommodation')
  })

  it('preserva reversão percentual em um mês de reembolso', () => {
    const refund: FatosFinanceirosReservaV2 = {
      ...reservation,
      id: 'refund-1',
      valoresMinor: {
        accommodation: -10_000,
        cleaning_fee: 0,
        municipal_tax: 0,
        other_guest_fees: 0,
        discount: 0,
        ota_commission: 0,
        payment_processing_fee: 0,
      },
      totalCobradoHospedeMinor: -10_000,
      payoutLiquidoCanalMinor: -10_000,
      liquidacaoComissaoOta: 'not_applicable',
      liquidacaoProcessamentoPagamento: 'not_applicable',
    }
    const result = calcularRepasse({
      reservas: [refund], despesas: [], regra: rule, periodo, currency: 'EUR',
    })
    expect(result.baseComissaoGestaoMinor).toBe(-10_000)
    expect(result.comissaoGestaoMinor).toBe(-2_000)
    expect(result.saldoEconomicoProprietarioMinor).toBe(-8_000)
  })

  it('usa o valor declarado uma única vez e identifica períodos declarados e mistos', () => {
    const declared: FatosFinanceirosReservaV2 = {
      factMode: 'declared_owner_base', id: 'declared-1', currency: 'EUR', declaredOwnerBaseMinor: 50_000,
    }
    const declaredRule = { ...rule, allowDeclaredOwnerBase: true }
    const declaredResult = calcularRepasse({
      reservas: [declared], despesas: [], regra: declaredRule, periodo, currency: 'EUR',
    })
    expect(declaredResult.baseComissaoGestaoMinor).toBe(50_000)
    expect(declaredResult.saldoEconomicoProprietarioMinor).toBe(40_000)
    expect(declaredResult.evidenceLevel).toBe('declared')
    expect(declaredResult.componentPolicyCoverage).toBe('partial')
    expect(declaredResult.evidenceReservationIds.declaredOwnerBase).toEqual(['declared-1'])

    const mixed = calcularRepasse({
      reservas: [reservation, declared], despesas: [], regra: declaredRule, periodo, currency: 'EUR',
    })
    expect(mixed.baseComissaoGestaoMinor).toBe(131_768)
    expect(mixed.evidenceLevel).toBe('mixed')
    expect(mixed.evidenceCounts).toEqual({ declaredOwnerBase: 1, componentBreakdown: 1 })
  })

  it('mantém comissão fixa e imposto no mesmo motor para fatos declarados', () => {
    const declared: FatosFinanceirosReservaV2 = {
      factMode: 'declared_owner_base', id: 'declared-1', currency: 'EUR', declaredOwnerBaseMinor: 50_000,
    }
    const fixed = calcularRepasse({
      reservas: [declared], despesas: [], periodo, currency: 'EUR',
      regra: {
        ...rule, allowDeclaredOwnerBase: true, tipoComissao: 'fixo_por_reserva',
        comissaoValor: '60.00', impostoComissaoPercentual: '23', fluxoFinanceiro: 'owner_direct',
      },
    })
    expect(fixed.comissaoGestaoMinor).toBe(6_000)
    expect(fixed.impostoComissaoGestaoMinor).toBe(1_380)
    expect(fixed.valorFaturarProprietarioMinor).toBe(7_380)
  })

  it('bloqueia o modo declarado sem opt-in explícito', () => {
    expect(() => calcularRepasse({
      reservas: [{
        factMode: 'declared_owner_base', id: 'declared-1', currency: 'EUR', declaredOwnerBaseMinor: 50_000,
      }],
      despesas: [], regra: rule, periodo, currency: 'EUR',
    })).toThrow('DECLARED_OWNER_BASE_NOT_ALLOWED:declared-1')
  })
})
