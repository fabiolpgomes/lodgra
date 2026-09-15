export type TipoComissaoRepasse = 'percentual' | 'fixo_mensal' | 'fixo_por_reserva'
export type BaseComissaoRepasse = 'receita_bruta' | 'faturamento_propriedade'
export type DestinatarioCustoRepasse = 'gestor' | 'proprietario'
export type CompetenciaReceita = 'check_in' | 'check_out' | 'stay_prorata' | 'payout_date'
export type FluxoFinanceiro = 'manager_trust' | 'owner_direct'
export type PresetPoliticaRepasse = 'net_received' | 'gross_reservation' | 'custom'
export type EfeitoFinanceiro = 'credit' | 'debit' | 'ignore'
export type ModoLiquidacaoCustoCanal = 'withheld' | 'invoiced_separately' | 'not_applicable'
export type ComponenteFinanceiro =
  | 'accommodation'
  | 'cleaning_fee'
  | 'municipal_tax'
  | 'other_guest_fees'
  | 'discount'
  | 'ota_commission'
  | 'payment_processing_fee'

export type DestinatarioFinanceiro =
  | 'manager'
  | 'owner'
  | 'municipality'
  | 'channel'
  | 'payment_processor'
  | 'third_party'

export type PoliticaComponenteRepasse = {
  componente: ComponenteFinanceiro
  destinatario: DestinatarioFinanceiro
  efeitoNaBaseComissao: EfeitoFinanceiro
  efeitoNoExtratoProprietario: EfeitoFinanceiro
}

export type RegraRepasseV2 = {
  contractVersion: 2
  id: string
  organizationId: string
  propriedadeId: string
  tipoComissao: TipoComissaoRepasse
  comissaoValor: string
  impostoComissaoPercentual: string
  competenciaReceita: CompetenciaReceita
  fluxoFinanceiro: FluxoFinanceiro
  preset: PresetPoliticaRepasse
  allowDeclaredOwnerBase: boolean
  despesasRepassaveis: boolean
  componentes: PoliticaComponenteRepasse[]
}

type FatosFinanceirosReservaBaseV2 = {
  id: string
  currency: string
}

export type FatosFinanceirosReservaDetalhadosV2 = FatosFinanceirosReservaBaseV2 & {
  factMode: 'component_breakdown'
  valoresMinor: Partial<Record<ComponenteFinanceiro, number>>
  platformAdjustmentMinor?: number | null
  totalCobradoHospedeMinor: number
  payoutLiquidoCanalMinor: number
  liquidacaoComissaoOta: ModoLiquidacaoCustoCanal
  liquidacaoProcessamentoPagamento: ModoLiquidacaoCustoCanal
  reconhecimentoProrata?: {
    unidadesTotais: number
    unidadeInicial: number
    unidadesReconhecidas: number
    valoresTotaisMinor: Partial<Record<ComponenteFinanceiro, number>>
    platformAdjustmentTotalMinor?: number | null
  }
}

export type FatosFinanceirosReservaDeclaradosV2 = FatosFinanceirosReservaBaseV2 & {
  factMode: 'declared_owner_base'
  declaredOwnerBaseMinor: number
  reconhecimentoProrata?: {
    unidadesTotais: number
    unidadeInicial: number
    unidadesReconhecidas: number
    declaredOwnerBaseTotalMinor: number
  }
}

export type FatosFinanceirosReservaV2 =
  | FatosFinanceirosReservaDetalhadosV2
  | FatosFinanceirosReservaDeclaradosV2

export type CalculoRepasseV2Input = {
  reservas: FatosFinanceirosReservaV2[]
  despesas: DespesaRepasse[]
  regra: RegraRepasseV2
  periodo: PeriodoRepasse
  currency: string
}

export type ResultadoRepasseV2 = {
  contractVersion: 2
  organizationId: string
  propriedadeId: string
  currency: string
  periodo: PeriodoRepasse
  regraId: string
  competenciaReceita: CompetenciaReceita
  fluxoFinanceiro: FluxoFinanceiro
  evidenceLevel: 'declared' | 'reconciled' | 'mixed'
  componentPolicyCoverage: 'full' | 'partial'
  evidenceCounts: { declaredOwnerBase: number; componentBreakdown: number }
  evidenceReservationIds: { declaredOwnerBase: string[]; componentBreakdown: string[] }
  totaisComponentesMinor: Record<ComponenteFinanceiro, number>
  baseComissaoGestaoMinor: number
  comissaoGestaoMinor: number
  impostoComissaoGestaoMinor: number
  despesasRepassaveisMinor: number
  saldoEconomicoProprietarioMinor: number
  valorRepassarProprietarioMinor: number
  valorFaturarProprietarioMinor: number
  reservaIds: string[]
  despesaIds: string[]
}

export type RegraRepasse = {
  id: string
  organizationId: string
  propriedadeId: string
  tipoComissao: TipoComissaoRepasse
  /** Decimal exato: percentual (ex. "17.5000") ou valor monetário (ex. "250.00"). */
  comissaoValor: string
  baseComissao: BaseComissaoRepasse
  taxaLimpezaPara: DestinatarioCustoRepasse
  comissaoOtaPorConta: DestinatarioCustoRepasse
  despesasRepassaveis: boolean
}

export type ReservaRepasse = {
  id: string
  currency: string
  receitaBrutaMinor: number
  taxasServicoMinor: number
  taxaLimpezaMinor: number
  comissaoOtaMinor: number
  descontosMinor: number
}

export type DespesaRepasse = {
  id: string
  currency: string
  valorMinor: number
}

export type PeriodoRepasse = {
  inicio: string
  fim: string
}

export type CodigoLinhaRepasse =
  | 'receita_bruta'
  | 'taxas_servico'
  | 'comissao_ota'
  | 'descontos'
  | 'faturamento_propriedade'
  | 'comissao_gestao'
  | 'taxa_limpeza_retida'
  | 'despesas_propriedade'
  | 'repasse_proprietario'

export type LinhaRepasse = {
  codigo: CodigoLinhaRepasse
  /** Valor absoluto da linha. Linhas de dedução são subtraídas pela fórmula. */
  valorMinor: number
  reservaIds: string[]
  despesaIds: string[]
  regraId?: string
}

export type ResultadoRepasse = {
  organizationId: string
  propriedadeId: string
  currency: string
  periodo: PeriodoRepasse
  regraId: string
  /** Comissão OTA total observada, mesmo quando absorvida pelo gestor. */
  comissaoOtaTotalMinor: number
  linhas: Record<CodigoLinhaRepasse, LinhaRepasse>
}

const BIGINT_ZERO = BigInt(0)
const BIGINT_ONE = BigInt(1)
const BIGINT_TWO = BigInt(2)

export class PayoutCalculationInputError extends Error {
  constructor(
    readonly code: 'INVALID_COMMISSION_TYPE' | 'NEGATIVE_PERCENTAGE_BASE' | 'CLEANING_FEE_EXCEEDS_SERVICE_FEES',
    message: string,
    readonly reservationId?: string,
  ) {
    super(message)
    this.name = 'PayoutCalculationInputError'
  }
}
const MONEY_SCALE = BigInt(100)
const PERCENT_DENOMINATOR = BigInt(1_000_000)
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const DECIMAL = /^\d+(?:\.\d+)?$/
const COMPONENTES_FINANCEIROS: readonly ComponenteFinanceiro[] = [
  'accommodation',
  'cleaning_fee',
  'municipal_tax',
  'other_guest_fees',
  'discount',
  'ota_commission',
  'payment_processing_fee',
]
const FINANCIAL_EFFECTS: readonly EfeitoFinanceiro[] = ['credit', 'debit', 'ignore']
const FINANCIAL_RECIPIENTS: readonly DestinatarioFinanceiro[] = [
  'manager', 'owner', 'municipality', 'channel', 'payment_processor', 'third_party',
]
const SETTLEMENT_MODES: readonly ModoLiquidacaoCustoCanal[] = [
  'withheld', 'invoiced_separately', 'not_applicable',
]

/** Moedas de duas casas decimais suportadas pelo motor nesta fase. */
export const SUPPORTED_PAYOUT_CURRENCIES = new Set([
  'AUD', 'BRL', 'CAD', 'CHF', 'EUR', 'GBP', 'NZD', 'USD',
])

function assertIdentifier(value: string, field: string): void {
  if (!value.trim()) throw new Error(`${field} deve ser preenchido`)
}

function assertCurrency(value: string, field: string): string {
  const currency = value.trim().toUpperCase()
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error(`${field} deve ser um código ISO de três letras`)
  }
  if (!SUPPORTED_PAYOUT_CURRENCIES.has(currency)) {
    throw new Error(`${field} não é suportada pelo motor de repasse`)
  }
  return currency
}

function assertMinor(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${field} deve ser um inteiro não negativo em unidades mínimas`)
  }
}

function assertSignedMinor(value: number, field: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new Error(`${field} deve ser um inteiro seguro em unidades mínimas`)
  }
}

function assertSafeResult(value: bigint, field: string): number {
  if (value < BigInt(Number.MIN_SAFE_INTEGER) || value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(`${field} excede o intervalo monetário seguro`)
  }
  return Number(value)
}

function parseDate(value: string, field: string): void {
  if (!ISO_DATE.test(value)) throw new Error(`${field} deve usar o formato YYYY-MM-DD`)
  const parsed = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error(`${field} deve ser uma data válida`)
  }
}

function parseDecimalParts(value: string, field: string, maxDecimals: number): [bigint, string] {
  const normalized = value.trim()
  if (!DECIMAL.test(normalized)) throw new Error(`${field} deve ser um decimal não negativo`)
  const [whole, fraction = ''] = normalized.split('.')
  if (fraction.length > maxDecimals) {
    throw new Error(`${field} aceita no máximo ${maxDecimals} casas decimais`)
  }
  return [BigInt(whole), fraction]
}

function roundUnsignedDivision(numerator: bigint, denominator: bigint): bigint {
  const quotient = numerator / denominator
  const remainder = numerator % denominator
  return remainder * BIGINT_TWO >= denominator ? quotient + BIGINT_ONE : quotient
}

function roundSignedDivision(numerator: bigint, denominator: bigint): bigint {
  return numerator < BIGINT_ZERO
    ? -roundUnsignedDivision(-numerator, denominator)
    : roundUnsignedDivision(numerator, denominator)
}

function parseMoneyToMinor(value: string, field: string): number {
  const [whole, fraction] = parseDecimalParts(value, field, 4)
  const fractionFour = BigInt(fraction.padEnd(4, '0'))
  const minor = whole * MONEY_SCALE + roundUnsignedDivision(fractionFour, BigInt(100))
  return assertSafeResult(minor, field)
}

function parsePercentPartsPerMillion(value: string, field = 'comissaoValor'): bigint {
  const [whole, fraction] = parseDecimalParts(value, field, 4)
  const percentTenThousandths = whole * BigInt(10_000) + BigInt(fraction.padEnd(4, '0'))
  if (percentTenThousandths > PERCENT_DENOMINATOR) {
    throw new Error(`${field} percentual deve estar entre 0 e 100`)
  }
  return percentTenThousandths
}

function sumMinor(values: number[], field: string): number {
  const total = values.reduce((sum, value) => sum + BigInt(value), BIGINT_ZERO)
  return assertSafeResult(total, field)
}

/**
 * Distribui unidades mínimas por uma faixa de unidades discretas, atribuindo o
 * resto às primeiras unidades. A soma de todas as faixas é sempre o total.
 */
export function allocateMinorByUnits(
  totalMinor: number,
  totalUnits: number,
  startUnit: number,
  selectedUnits: number,
): number {
  assertSignedMinor(totalMinor, 'totalMinor')
  if (!Number.isSafeInteger(totalUnits) || totalUnits <= 0) {
    throw new Error('totalUnits deve ser um inteiro positivo')
  }
  if (!Number.isSafeInteger(startUnit) || startUnit < 0) {
    throw new Error('startUnit deve ser um inteiro não negativo')
  }
  if (!Number.isSafeInteger(selectedUnits) || selectedUnits < 0 || startUnit + selectedUnits > totalUnits) {
    throw new Error('faixa de unidades inválida')
  }

  const total = BigInt(totalMinor)
  const units = BigInt(totalUnits)
  const quotient = total / units
  const remainder = total % units
  const remainderUnits = remainder < BIGINT_ZERO ? -remainder : remainder
  const rangeStart = BigInt(startUnit)
  const rangeEnd = rangeStart + BigInt(selectedUnits)
  const remainderOverlap = rangeStart >= remainderUnits
    ? BIGINT_ZERO
    : (rangeEnd < remainderUnits ? rangeEnd : remainderUnits) - rangeStart
  const remainderSign = remainder < BIGINT_ZERO ? -BIGINT_ONE : BIGINT_ONE
  return assertSafeResult(
    quotient * BigInt(selectedUnits) + remainderSign * remainderOverlap,
    'rateio por unidades',
  )
}

function calculateManagementCommission(
  regra: RegraRepasse,
  reservas: ReservaRepasse[],
  receitaBrutaMinor: number,
  faturamentoPropriedadeMinor: number,
): number {
  const base = regra.baseComissao === 'receita_bruta'
    ? receitaBrutaMinor
    : faturamentoPropriedadeMinor
  return calculateCommissionForBase(
    regra.tipoComissao,
    regra.comissaoValor,
    reservas.length,
    base,
  )
}

function calculateCommissionForBase(
  tipo: TipoComissaoRepasse,
  valor: string,
  reservationCount: number,
  baseMinor: number,
  allowNegativePercentageBase = false,
): number {
  if (tipo === 'percentual') {
    if (baseMinor < 0 && !allowNegativePercentageBase) {
      throw new PayoutCalculationInputError(
        'NEGATIVE_PERCENTAGE_BASE',
        'base de comissão percentual não pode ser negativa',
      )
    }
    return assertSafeResult(
      roundSignedDivision(BigInt(baseMinor) * parsePercentPartsPerMillion(valor), PERCENT_DENOMINATOR),
      'comissao_gestao',
    )
  }

  if (tipo !== 'fixo_mensal' && tipo !== 'fixo_por_reserva') {
    throw new PayoutCalculationInputError(
      'INVALID_COMMISSION_TYPE',
      'tipo de comissão inválido',
    )
  }

  const fixedMinor = parseMoneyToMinor(valor, 'comissaoValor')
  return tipo === 'fixo_mensal'
    ? fixedMinor
    : assertSafeResult(BigInt(fixedMinor) * BigInt(reservationCount), 'comissao_gestao')
}

function line(
  codigo: CodigoLinhaRepasse,
  valorMinor: number,
  reservaIds: string[],
  despesaIds: string[],
  regraId?: string,
): LinhaRepasse {
  return { codigo, valorMinor, reservaIds: [...reservaIds], despesaIds: [...despesaIds], regraId }
}

function calcularRepasseLegacy(
  reservas: ReservaRepasse[],
  despesas: DespesaRepasse[],
  regra: RegraRepasse,
  periodo: PeriodoRepasse,
  currency: string,
): ResultadoRepasse {
  assertIdentifier(regra.id, 'regra.id')
  assertIdentifier(regra.organizationId, 'regra.organizationId')
  assertIdentifier(regra.propriedadeId, 'regra.propriedadeId')
  parseDate(periodo.inicio, 'periodo.inicio')
  parseDate(periodo.fim, 'periodo.fim')
  if (periodo.inicio > periodo.fim) throw new Error('periodo.inicio não pode ser posterior a periodo.fim')

  const calculationCurrency = assertCurrency(currency, 'currency')
  const seenReservationIds = new Set<string>()
  const seenExpenseIds = new Set<string>()

  for (const reserva of reservas) {
    assertIdentifier(reserva.id, 'reserva.id')
    if (seenReservationIds.has(reserva.id)) throw new Error(`reserva duplicada: ${reserva.id}`)
    seenReservationIds.add(reserva.id)
    if (assertCurrency(reserva.currency, `reserva ${reserva.id}.currency`) !== calculationCurrency) {
      throw new Error(`moeda divergente na reserva ${reserva.id}`)
    }
    for (const field of [
      'receitaBrutaMinor',
      'taxasServicoMinor',
      'taxaLimpezaMinor',
      'comissaoOtaMinor',
      'descontosMinor',
    ] as const) {
      assertMinor(reserva[field], `reserva ${reserva.id}.${field}`)
    }
    if (reserva.taxaLimpezaMinor > reserva.taxasServicoMinor) {
      throw new PayoutCalculationInputError(
        'CLEANING_FEE_EXCEEDS_SERVICE_FEES',
        `taxa de limpeza excede taxas de serviço na reserva ${reserva.id}`,
        reserva.id,
      )
    }
  }

  for (const despesa of despesas) {
    assertIdentifier(despesa.id, 'despesa.id')
    if (seenExpenseIds.has(despesa.id)) throw new Error(`despesa duplicada: ${despesa.id}`)
    seenExpenseIds.add(despesa.id)
    if (assertCurrency(despesa.currency, `despesa ${despesa.id}.currency`) !== calculationCurrency) {
      throw new Error(`moeda divergente na despesa ${despesa.id}`)
    }
    assertMinor(despesa.valorMinor, `despesa ${despesa.id}.valorMinor`)
  }

  const reservaIds = reservas.map(({ id }) => id)
  const despesaIds = despesas.map(({ id }) => id)
  const receitaBrutaMinor = sumMinor(reservas.map(({ receitaBrutaMinor: value }) => value), 'receita_bruta')
  const taxasServicoMinor = sumMinor(reservas.map(({ taxasServicoMinor: value }) => value), 'taxas_servico')
  const comissaoOtaTotalMinor = sumMinor(reservas.map(({ comissaoOtaMinor: value }) => value), 'comissao_ota_total')
  const comissaoOtaMinor = regra.comissaoOtaPorConta === 'proprietario' ? comissaoOtaTotalMinor : 0
  const descontosMinor = sumMinor(reservas.map(({ descontosMinor: value }) => value), 'descontos')
  const faturamentoPropriedadeMinor = assertSafeResult(
    BigInt(receitaBrutaMinor) + BigInt(taxasServicoMinor) - BigInt(comissaoOtaMinor) - BigInt(descontosMinor),
    'faturamento_propriedade',
  )
  const comissaoGestaoMinor = calculateManagementCommission(
    regra,
    reservas,
    receitaBrutaMinor,
    faturamentoPropriedadeMinor,
  )
  const taxaLimpezaRetidaMinor = regra.taxaLimpezaPara === 'gestor'
    ? sumMinor(reservas.map(({ taxaLimpezaMinor: value }) => value), 'taxa_limpeza_retida')
    : 0
  const despesasPropriedadeMinor = regra.despesasRepassaveis
    ? sumMinor(despesas.map(({ valorMinor }) => valorMinor), 'despesas_propriedade')
    : 0
  const repasseProprietarioMinor = assertSafeResult(
    BigInt(faturamentoPropriedadeMinor)
      - BigInt(comissaoGestaoMinor)
      - BigInt(taxaLimpezaRetidaMinor)
      - BigInt(despesasPropriedadeMinor),
    'repasse_proprietario',
  )

  const comissaoReservaIds = regra.tipoComissao === 'fixo_mensal' ? [] : reservaIds
  const despesasAplicadasIds = regra.despesasRepassaveis ? despesaIds : []

  return {
    organizationId: regra.organizationId,
    propriedadeId: regra.propriedadeId,
    currency: calculationCurrency,
    periodo: { ...periodo },
    regraId: regra.id,
    comissaoOtaTotalMinor,
    linhas: {
      receita_bruta: line('receita_bruta', receitaBrutaMinor, reservaIds, []),
      taxas_servico: line('taxas_servico', taxasServicoMinor, reservaIds, []),
      comissao_ota: line('comissao_ota', comissaoOtaMinor, reservaIds, []),
      descontos: line('descontos', descontosMinor, reservaIds, []),
      faturamento_propriedade: line('faturamento_propriedade', faturamentoPropriedadeMinor, reservaIds, []),
      comissao_gestao: line('comissao_gestao', comissaoGestaoMinor, comissaoReservaIds, [], regra.id),
      taxa_limpeza_retida: line('taxa_limpeza_retida', taxaLimpezaRetidaMinor, reservaIds, [], regra.id),
      despesas_propriedade: line('despesas_propriedade', despesasPropriedadeMinor, [], despesasAplicadasIds, regra.id),
      repasse_proprietario: line(
        'repasse_proprietario',
        repasseProprietarioMinor,
        reservaIds,
        despesasAplicadasIds,
        regra.id,
      ),
    },
  }
}

function effectMultiplier(effect: EfeitoFinanceiro): bigint {
  if (effect === 'credit') return BIGINT_ONE
  if (effect === 'debit') return -BIGINT_ONE
  return BIGINT_ZERO
}

function calculateRepasseV2(input: CalculoRepasseV2Input): ResultadoRepasseV2 {
  const { reservas, despesas, regra, periodo } = input
  assertIdentifier(regra.id, 'regra.id')
  assertIdentifier(regra.organizationId, 'regra.organizationId')
  assertIdentifier(regra.propriedadeId, 'regra.propriedadeId')
  if (regra.contractVersion !== 2) throw new Error('contractVersion v2 inválida')
  if (!(['check_in', 'check_out', 'stay_prorata', 'payout_date'] as const).includes(regra.competenciaReceita)) {
    throw new Error('competenciaReceita inválida')
  }
  if (!(['manager_trust', 'owner_direct'] as const).includes(regra.fluxoFinanceiro)) {
    throw new Error('fluxoFinanceiro inválido')
  }
  if (!(['net_received', 'gross_reservation', 'custom'] as const).includes(regra.preset)) {
    throw new Error('preset inválido')
  }
  parseDate(periodo.inicio, 'periodo.inicio')
  parseDate(periodo.fim, 'periodo.fim')
  if (periodo.inicio > periodo.fim) throw new Error('periodo.inicio não pode ser posterior a periodo.fim')

  const currency = assertCurrency(input.currency, 'currency')
  const policies = new Map<ComponenteFinanceiro, PoliticaComponenteRepasse>()
  for (const policy of regra.componentes) {
    if (!COMPONENTES_FINANCEIROS.includes(policy.componente)) {
      throw new Error(`componente financeiro inválido: ${policy.componente}`)
    }
    if (policies.has(policy.componente)) {
      throw new Error(`componente duplicado na política: ${policy.componente}`)
    }
    if (!FINANCIAL_RECIPIENTS.includes(policy.destinatario)) {
      throw new Error(`destinatário inválido na política: ${policy.componente}`)
    }
    if (
      !FINANCIAL_EFFECTS.includes(policy.efeitoNaBaseComissao)
      || !FINANCIAL_EFFECTS.includes(policy.efeitoNoExtratoProprietario)
    ) {
      throw new Error(`efeito inválido na política: ${policy.componente}`)
    }
    policies.set(policy.componente, policy)
  }
  for (const component of COMPONENTES_FINANCEIROS) {
    if (!policies.has(component)) throw new Error(`componente ausente na política: ${component}`)
  }

  const totals = Object.fromEntries(
    COMPONENTES_FINANCEIROS.map(component => [component, BIGINT_ZERO]),
  ) as Record<ComponenteFinanceiro, bigint>
  const reservationIds = new Set<string>()
  const declaredReservationIds: string[] = []
  const detailedReservationIds: string[] = []
  let declaredOwnerBase = BIGINT_ZERO

  for (const reservation of reservas) {
    assertIdentifier(reservation.id, 'reserva.id')
    if (reservationIds.has(reservation.id)) throw new Error(`reserva duplicada: ${reservation.id}`)
    reservationIds.add(reservation.id)
    if (assertCurrency(reservation.currency, `reserva ${reservation.id}.currency`) !== currency) {
      throw new Error(`moeda divergente na reserva ${reservation.id}`)
    }

    if (reservation.factMode === 'declared_owner_base') {
      if (!regra.allowDeclaredOwnerBase) {
        throw new Error(`DECLARED_OWNER_BASE_NOT_ALLOWED:${reservation.id}`)
      }
      assertMinor(reservation.declaredOwnerBaseMinor, `reserva ${reservation.id}.declaredOwnerBaseMinor`)
      declaredOwnerBase += BigInt(reservation.declaredOwnerBaseMinor)
      declaredReservationIds.push(reservation.id)
    } else {
      detailedReservationIds.push(reservation.id)
      for (const component of COMPONENTES_FINANCEIROS) {
        const value = reservation.valoresMinor[component]
        const policy = policies.get(component)!
        const required = policy.efeitoNaBaseComissao !== 'ignore'
          || policy.efeitoNoExtratoProprietario !== 'ignore'
        if (value === undefined) {
          if (required) throw new Error(`MISSING_COMPONENT_BREAKDOWN:${reservation.id}:${component}`)
          continue
        }
        assertSignedMinor(value, `reserva ${reservation.id}.${component}`)
        totals[component] += BigInt(value)
      }
    }

    if (regra.competenciaReceita === 'stay_prorata') {
      const slice = reservation.reconhecimentoProrata
      if (!slice) throw new Error(`reconhecimento pró-rata ausente: ${reservation.id}`)
      allocateMinorByUnits(0, slice.unidadesTotais, slice.unidadeInicial, slice.unidadesReconhecidas)
      if (reservation.factMode === 'declared_owner_base') {
        assertMinor(
          reservation.reconhecimentoProrata!.declaredOwnerBaseTotalMinor,
          `reserva ${reservation.id}.reconhecimentoProrata.declaredOwnerBaseTotalMinor`,
        )
      } else {
        for (const component of COMPONENTES_FINANCEIROS) {
          const totalValue = reservation.reconhecimentoProrata!.valoresTotaisMinor[component]
          const policy = policies.get(component)!
          const required = policy.efeitoNaBaseComissao !== 'ignore'
            || policy.efeitoNoExtratoProprietario !== 'ignore'
          if (totalValue === undefined) {
            if (required) throw new Error(`MISSING_COMPONENT_BREAKDOWN:${reservation.id}:${component}`)
            continue
          }
          assertSignedMinor(
            totalValue,
            `reserva ${reservation.id}.reconhecimentoProrata.${component}`,
          )
        }
      }
    } else if (reservation.reconhecimentoProrata) {
      throw new Error(`reconhecimento pró-rata inesperado: ${reservation.id}`)
    }

    if (reservation.factMode === 'declared_owner_base') continue

    assertSignedMinor(reservation.totalCobradoHospedeMinor, `reserva ${reservation.id}.totalCobradoHospedeMinor`)
    assertSignedMinor(reservation.payoutLiquidoCanalMinor, `reserva ${reservation.id}.payoutLiquidoCanalMinor`)
    if (
      !SETTLEMENT_MODES.includes(reservation.liquidacaoComissaoOta)
      || !SETTLEMENT_MODES.includes(reservation.liquidacaoProcessamentoPagamento)
    ) {
      throw new Error(`modo de liquidação inválido: ${reservation.id}`)
    }

    const guestComponents = [
      reservation.valoresMinor.accommodation,
      reservation.valoresMinor.cleaning_fee,
      reservation.valoresMinor.municipal_tax,
      reservation.valoresMinor.other_guest_fees,
      reservation.valoresMinor.discount,
      reservation.platformAdjustmentMinor,
    ]
    if (guestComponents.every(value => value !== undefined && value !== null)) {
      const [accommodation, cleaning, municipalTax, otherFees, discount, adjustment] = guestComponents as number[]
      assertSignedMinor(adjustment, `reserva ${reservation.id}.platformAdjustmentMinor`)
      const expectedGuestTotal = BigInt(accommodation) + BigInt(cleaning) + BigInt(municipalTax)
        + BigInt(otherFees) - BigInt(discount) + BigInt(adjustment)
      if (expectedGuestTotal !== BigInt(reservation.totalCobradoHospedeMinor)) {
        throw new Error(`GUEST_TOTAL_MISMATCH:${reservation.id}`)
      }
    }

    if (reservation.liquidacaoComissaoOta === 'not_applicable' && (reservation.valoresMinor.ota_commission ?? 0) !== 0) {
      throw new Error(`OTA_SETTLEMENT_MISMATCH:${reservation.id}`)
    }
    if (
      reservation.liquidacaoProcessamentoPagamento === 'not_applicable'
      && (reservation.valoresMinor.payment_processing_fee ?? 0) !== 0
    ) {
      throw new Error(`PAYMENT_SETTLEMENT_MISMATCH:${reservation.id}`)
    }

    const otaFeeKnown = reservation.liquidacaoComissaoOta !== 'withheld'
      || reservation.valoresMinor.ota_commission !== undefined
    const processingFeeKnown = reservation.liquidacaoProcessamentoPagamento !== 'withheld'
      || reservation.valoresMinor.payment_processing_fee !== undefined
    if (otaFeeKnown && processingFeeKnown) {
      const expectedChannelNet = BigInt(reservation.totalCobradoHospedeMinor)
        - (reservation.liquidacaoComissaoOta === 'withheld'
          ? BigInt(reservation.valoresMinor.ota_commission!)
          : BIGINT_ZERO)
        - (reservation.liquidacaoProcessamentoPagamento === 'withheld'
          ? BigInt(reservation.valoresMinor.payment_processing_fee!)
          : BIGINT_ZERO)
      if (expectedChannelNet !== BigInt(reservation.payoutLiquidoCanalMinor)) {
        throw new Error(`CHANNEL_NET_MISMATCH:${reservation.id}`)
      }
    }
  }

  const expenseIds = new Set<string>()
  let expensesMinor = BIGINT_ZERO
  for (const expense of despesas) {
    assertIdentifier(expense.id, 'despesa.id')
    if (expenseIds.has(expense.id)) throw new Error(`despesa duplicada: ${expense.id}`)
    expenseIds.add(expense.id)
    if (assertCurrency(expense.currency, `despesa ${expense.id}.currency`) !== currency) {
      throw new Error(`moeda divergente na despesa ${expense.id}`)
    }
    assertMinor(expense.valorMinor, `despesa ${expense.id}.valorMinor`)
    if (regra.despesasRepassaveis) expensesMinor += BigInt(expense.valorMinor)
  }

  let commissionBase = declaredOwnerBase
  let ownerStatement = declaredOwnerBase
  for (const component of COMPONENTES_FINANCEIROS) {
    const policy = policies.get(component)!
    commissionBase += totals[component] * effectMultiplier(policy.efeitoNaBaseComissao)
    ownerStatement += totals[component] * effectMultiplier(policy.efeitoNoExtratoProprietario)
  }

  const commissionBaseMinor = assertSafeResult(commissionBase, 'base_comissao_gestao')
  const proratedReservationCommissionSlices = regra.competenciaReceita === 'stay_prorata'
    && regra.tipoComissao !== 'fixo_mensal'
    ? reservas.map(reservation => {
      const slice = reservation.reconhecimentoProrata
      if (!slice) throw new Error(`reconhecimento pró-rata ausente: ${reservation.id}`)
      const fullCommissionBase = assertSafeResult(
        reservation.factMode === 'declared_owner_base'
          ? BigInt(reservation.reconhecimentoProrata!.declaredOwnerBaseTotalMinor)
          : COMPONENTES_FINANCEIROS.reduce((total, component) => {
            const value = reservation.reconhecimentoProrata!.valoresTotaisMinor[component]
            return total + BigInt(value ?? 0)
              * effectMultiplier(policies.get(component)!.efeitoNaBaseComissao)
          }, BIGINT_ZERO),
        `base_comissao_gestao_total:${reservation.id}`,
      )
      const fullCommission = calculateCommissionForBase(
        regra.tipoComissao,
        regra.comissaoValor,
        1,
        fullCommissionBase,
        true,
      )
      return { reservation, slice, fullCommission }
    })
    : null
  const managementCommissionMinor = proratedReservationCommissionSlices
    ? sumMinor(proratedReservationCommissionSlices.map(({ slice, fullCommission }) => (
      allocateMinorByUnits(
        fullCommission,
        slice.unidadesTotais,
        slice.unidadeInicial,
        slice.unidadesReconhecidas,
      )
    )), 'comissao_gestao')
    : calculateCommissionForBase(
      regra.tipoComissao,
      regra.comissaoValor,
      reservas.length,
      commissionBaseMinor,
      true,
    )
  const commissionTaxRate = parsePercentPartsPerMillion(
    regra.impostoComissaoPercentual,
    'impostoComissaoPercentual',
  )
  const commissionTaxMinor = proratedReservationCommissionSlices
    ? sumMinor(proratedReservationCommissionSlices.map(({ reservation, slice, fullCommission }) => {
      const fullTax = assertSafeResult(
        roundSignedDivision(BigInt(fullCommission) * commissionTaxRate, PERCENT_DENOMINATOR),
        `imposto_comissao_gestao_total:${reservation.id}`,
      )
      return allocateMinorByUnits(
        fullTax,
        slice.unidadesTotais,
        slice.unidadeInicial,
        slice.unidadesReconhecidas,
      )
    }), 'imposto_comissao_gestao')
    : assertSafeResult(
      roundSignedDivision(BigInt(managementCommissionMinor) * commissionTaxRate, PERCENT_DENOMINATOR),
      'imposto_comissao_gestao',
    )
  const ownerBalance = ownerStatement
    - BigInt(managementCommissionMinor)
    - BigInt(commissionTaxMinor)
    - expensesMinor
  const ownerBalanceMinor = assertSafeResult(ownerBalance, 'saldo_economico_proprietario')
  const managerInvoice = BigInt(managementCommissionMinor) + BigInt(commissionTaxMinor) + expensesMinor
  const evidenceLevel = declaredReservationIds.length === 0
    ? 'reconciled'
    : detailedReservationIds.length === 0 ? 'declared' : 'mixed'

  return {
    contractVersion: 2,
    organizationId: regra.organizationId,
    propriedadeId: regra.propriedadeId,
    currency,
    periodo: { ...periodo },
    regraId: regra.id,
    competenciaReceita: regra.competenciaReceita,
    fluxoFinanceiro: regra.fluxoFinanceiro,
    evidenceLevel,
    componentPolicyCoverage: declaredReservationIds.length > 0 ? 'partial' : 'full',
    evidenceCounts: {
      declaredOwnerBase: declaredReservationIds.length,
      componentBreakdown: detailedReservationIds.length,
    },
    evidenceReservationIds: {
      declaredOwnerBase: declaredReservationIds,
      componentBreakdown: detailedReservationIds,
    },
    totaisComponentesMinor: Object.fromEntries(
      COMPONENTES_FINANCEIROS.map(component => [
        component,
        assertSafeResult(totals[component], `total_${component}`),
      ]),
    ) as Record<ComponenteFinanceiro, number>,
    baseComissaoGestaoMinor: commissionBaseMinor,
    comissaoGestaoMinor: managementCommissionMinor,
    impostoComissaoGestaoMinor: commissionTaxMinor,
    despesasRepassaveisMinor: assertSafeResult(expensesMinor, 'despesas_repassaveis'),
    saldoEconomicoProprietarioMinor: ownerBalanceMinor,
    valorRepassarProprietarioMinor: regra.fluxoFinanceiro === 'manager_trust' ? ownerBalanceMinor : 0,
    valorFaturarProprietarioMinor: regra.fluxoFinanceiro === 'owner_direct'
      ? assertSafeResult(managerInvoice, 'valor_faturar_proprietario')
      : 0,
    reservaIds: [...reservationIds],
    despesaIds: regra.despesasRepassaveis ? [...expenseIds] : [],
  }
}

export function calcularRepasse(input: CalculoRepasseV2Input): ResultadoRepasseV2
export function calcularRepasse(
  reservas: ReservaRepasse[],
  despesas: DespesaRepasse[],
  regra: RegraRepasse,
  periodo: PeriodoRepasse,
  currency: string,
): ResultadoRepasse
export function calcularRepasse(
  inputOrReservas: CalculoRepasseV2Input | ReservaRepasse[],
  despesas?: DespesaRepasse[],
  regra?: RegraRepasse,
  periodo?: PeriodoRepasse,
  currency?: string,
): ResultadoRepasse | ResultadoRepasseV2 {
  if (!Array.isArray(inputOrReservas)) return calculateRepasseV2(inputOrReservas)
  if (!despesas || !regra || !periodo || !currency) {
    throw new Error('contrato legado de repasse incompleto')
  }
  return calcularRepasseLegacy(inputOrReservas, despesas, regra, periodo, currency)
}
