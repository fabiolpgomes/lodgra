import {
  calcularRepasse,
  type DespesaRepasse,
  type RegraRepasse,
  type ReservaRepasse,
} from '@/lib/financial/payout-rules'

const periodo = { inicio: '2026-08-01', fim: '2026-08-31' }

const baseRule: RegraRepasse = {
  id: 'rule-1',
  organizationId: 'org-1',
  propriedadeId: 'property-1',
  tipoComissao: 'percentual',
  comissaoValor: '20.0000',
  baseComissao: 'faturamento_propriedade',
  taxaLimpezaPara: 'gestor',
  comissaoOtaPorConta: 'proprietario',
  despesasRepassaveis: true,
}

const reservation: ReservaRepasse = {
  id: 'reservation-1',
  currency: 'EUR',
  receitaBrutaMinor: 100_000,
  taxasServicoMinor: 12_000,
  taxaLimpezaMinor: 10_000,
  comissaoOtaMinor: 15_000,
  descontosMinor: 2_000,
}

const expense: DespesaRepasse = {
  id: 'expense-1',
  currency: 'EUR',
  valorMinor: 5_000,
}

describe('calcularRepasse', () => {
  it('calcula todas as linhas para percentual sobre faturamento', () => {
    const result = calcularRepasse([reservation], [expense], baseRule, periodo, 'EUR')

    expect(result.linhas.receita_bruta.valorMinor).toBe(100_000)
    expect(result.linhas.taxas_servico.valorMinor).toBe(12_000)
    expect(result.linhas.comissao_ota.valorMinor).toBe(15_000)
    expect(result.linhas.descontos.valorMinor).toBe(2_000)
    expect(result.linhas.faturamento_propriedade.valorMinor).toBe(95_000)
    expect(result.linhas.comissao_gestao.valorMinor).toBe(19_000)
    expect(result.linhas.taxa_limpeza_retida.valorMinor).toBe(10_000)
    expect(result.linhas.despesas_propriedade.valorMinor).toBe(5_000)
    expect(result.linhas.repasse_proprietario.valorMinor).toBe(61_000)
  })

  it('não deduz OTA absorvida pelo gestor e calcula percentual sobre receita bruta', () => {
    const result = calcularRepasse(
      [{ ...reservation, taxasServicoMinor: 10_000, taxaLimpezaMinor: 10_000, comissaoOtaMinor: 20_000, descontosMinor: 0 }],
      [expense],
      {
        ...baseRule,
        comissaoValor: '15',
        baseComissao: 'receita_bruta',
        taxaLimpezaPara: 'proprietario',
        comissaoOtaPorConta: 'gestor',
        despesasRepassaveis: false,
      },
      periodo,
      'eur',
    )

    expect(result.currency).toBe('EUR')
    expect(result.comissaoOtaTotalMinor).toBe(20_000)
    expect(result.linhas.comissao_ota.valorMinor).toBe(0)
    expect(result.linhas.faturamento_propriedade.valorMinor).toBe(110_000)
    expect(result.linhas.comissao_gestao.valorMinor).toBe(15_000)
    expect(result.linhas.taxa_limpeza_retida.valorMinor).toBe(0)
    expect(result.linhas.despesas_propriedade.valorMinor).toBe(0)
    expect(result.linhas.repasse_proprietario.valorMinor).toBe(95_000)
  })

  it('aplica comissão fixa mensal uma vez, mesmo sem reservas', () => {
    const result = calcularRepasse(
      [],
      [],
      { ...baseRule, tipoComissao: 'fixo_mensal', comissaoValor: '250.0050' },
      periodo,
      'EUR',
    )

    expect(result.linhas.comissao_gestao.valorMinor).toBe(25_001)
    expect(result.linhas.comissao_gestao.reservaIds).toEqual([])
    expect(result.linhas.repasse_proprietario.valorMinor).toBe(-25_001)
  })

  it('multiplica comissão fixa por reserva', () => {
    const result = calcularRepasse(
      [reservation, { ...reservation, id: 'reservation-2' }],
      [],
      { ...baseRule, tipoComissao: 'fixo_por_reserva', comissaoValor: '10.00', taxaLimpezaPara: 'proprietario' },
      periodo,
      'EUR',
    )

    expect(result.linhas.comissao_gestao.valorMinor).toBe(2_000)
    expect(result.linhas.comissao_gestao.reservaIds).toEqual(['reservation-1', 'reservation-2'])
  })

  it('rejeita tipo de comissão desconhecido em runtime', () => {
    expect(() => calcularRepasse(
      [],
      [],
      { ...baseRule, tipoComissao: 'desconhecido' as typeof baseRule.tipoComissao },
      periodo,
      'EUR',
    )).toThrow(expect.objectContaining({ code: 'INVALID_COMMISSION_TYPE' }))
  })

  it('arredonda percentual ao cêntimo de forma determinística', () => {
    const result = calcularRepasse(
      [{ ...reservation, receitaBrutaMinor: 33, taxasServicoMinor: 0, taxaLimpezaMinor: 0, comissaoOtaMinor: 0, descontosMinor: 0 }],
      [],
      { ...baseRule, comissaoValor: '15', baseComissao: 'receita_bruta', taxaLimpezaPara: 'proprietario' },
      periodo,
      'EUR',
    )

    expect(result.linhas.comissao_gestao.valorMinor).toBe(5)
  })

  it('rastreia reservas, despesas e regra nas linhas', () => {
    const result = calcularRepasse([reservation], [expense], baseRule, periodo, 'EUR')

    expect(result.linhas.receita_bruta.reservaIds).toEqual(['reservation-1'])
    expect(result.linhas.despesas_propriedade.despesaIds).toEqual(['expense-1'])
    expect(result.linhas.repasse_proprietario).toMatchObject({
      reservaIds: ['reservation-1'],
      despesaIds: ['expense-1'],
      regraId: 'rule-1',
    })
  })

  it('rejeita mistura de moedas em reservas e despesas', () => {
    expect(() => calcularRepasse([{ ...reservation, currency: 'BRL' }], [], baseRule, periodo, 'EUR'))
      .toThrow('moeda divergente na reserva reservation-1')
    expect(() => calcularRepasse([], [{ ...expense, currency: 'BRL' }], baseRule, periodo, 'EUR'))
      .toThrow('moeda divergente na despesa expense-1')
  })

  it('rejeita IDs duplicados para não duplicar valores nem rastreabilidade', () => {
    expect(() => calcularRepasse([reservation, reservation], [], baseRule, periodo, 'EUR'))
      .toThrow('reserva duplicada: reservation-1')
    expect(() => calcularRepasse([], [expense, expense], baseRule, periodo, 'EUR'))
      .toThrow('despesa duplicada: expense-1')
  })

  it('rejeita percentual acima de 100 e precisão monetária excessiva', () => {
    expect(() => calcularRepasse([reservation], [], { ...baseRule, comissaoValor: '100.0001' }, periodo, 'EUR'))
      .toThrow('comissaoValor percentual deve estar entre 0 e 100')
    expect(() => calcularRepasse([], [], { ...baseRule, tipoComissao: 'fixo_mensal', comissaoValor: '1.00001' }, periodo, 'EUR'))
      .toThrow('comissaoValor aceita no máximo 4 casas decimais')
  })

  it('rejeita valores monetários negativos, não inteiros e limpeza fora das taxas', () => {
    expect(() => calcularRepasse([{ ...reservation, receitaBrutaMinor: -1 }], [], baseRule, periodo, 'EUR'))
      .toThrow('inteiro não negativo')
    expect(() => calcularRepasse([{ ...reservation, receitaBrutaMinor: 10.5 }], [], baseRule, periodo, 'EUR'))
      .toThrow('inteiro não negativo')
    expect(() => calcularRepasse([{ ...reservation, taxaLimpezaMinor: 12_001 }], [], baseRule, periodo, 'EUR'))
      .toThrow('taxa de limpeza excede taxas de serviço')
  })

  it('rejeita base percentual negativa em vez de inventar crédito de comissão', () => {
    expect(() => calcularRepasse(
      [{
        ...reservation,
        receitaBrutaMinor: 1_000,
        taxasServicoMinor: 0,
        taxaLimpezaMinor: 0,
        comissaoOtaMinor: 2_000,
        descontosMinor: 0,
      }],
      [],
      baseRule,
      periodo,
      'EUR',
    )).toThrow('base de comissão percentual não pode ser negativa')
  })

  it('rejeita período inválido', () => {
    expect(() => calcularRepasse([], [], baseRule, { inicio: '2026-02-30', fim: '2026-03-01' }, 'EUR'))
      .toThrow('periodo.inicio deve ser uma data válida')
    expect(() => calcularRepasse([], [], baseRule, { inicio: '2026-09-01', fim: '2026-08-31' }, 'EUR'))
      .toThrow('periodo.inicio não pode ser posterior')
  })
})
