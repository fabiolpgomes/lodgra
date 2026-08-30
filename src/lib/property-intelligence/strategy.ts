import type {
  ComparableBenchmark,
  LodgraSignal,
  MarketSnapshot,
  NormalizedOwnerContext,
  ScenarioLabel,
  StayType,
  StrategyRecommendation,
} from './types'

function formatStayTypeLabel(stayType: StayType | 'mixed'): string {
  if (stayType === 'long-stay') {
    return 'estadia longa'
  }

  if (stayType === 'mid-stay') {
    return 'estadia média'
  }

  if (stayType === 'short-stay') {
    return 'estadia curta'
  }

  return 'estadia mista'
}

export function buildStrategyRecommendation(
  models: Record<
    StayType,
    { scenarios: Array<{ label: ScenarioLabel; netMonthlyReturn: number }> }
  >,
  comparables: ComparableBenchmark[],
  ownerContext?: NormalizedOwnerContext,
  context?: {
    marketSnapshot?: Record<'short_mid' | 'annual', MarketSnapshot> | null
    lodgraSignal?: LodgraSignal | null
  }
): StrategyRecommendation {
  const baseNetByStay = (['short-stay', 'mid-stay', 'long-stay'] as StayType[]).reduce<Record<StayType, number>>(
    (acc, stayType) => {
      acc[stayType] = models[stayType].scenarios.find(scenario => scenario.label === 'base')?.netMonthlyReturn ?? 0
      return acc
    },
    {
      'short-stay': 0,
      'mid-stay': 0,
      'long-stay': 0,
    }
  )

  const maxNet = Math.max(baseNetByStay['short-stay'], baseNetByStay['mid-stay'], baseNetByStay['long-stay'], 1)
  const shortMidMarket = context?.marketSnapshot?.short_mid
  const annualMarket = context?.marketSnapshot?.annual
  const marketDelta = (shortMidMarket?.medianNet ?? 0) - (annualMarket?.medianNet ?? 0)
  const lodgraSignal = context?.lodgraSignal

  const scoreByStay: Record<StayType, number> = {
    'short-stay':
      baseNetByStay['short-stay'] / maxNet +
      0.09 +
      (ownerContext?.flexibility === 'high' || ownerContext?.operatingModel === 'short_mid' ? 0.14 : 0) +
      (ownerContext?.operatingModel === 'long' ? -0.08 : 0) +
      (marketDelta > 0 ? 0.02 : 0) +
      (lodgraSignal?.operationalWeighting ?? 0) * 0.02,
    'mid-stay':
      baseNetByStay['mid-stay'] / maxNet +
      0.16 +
      (ownerContext?.flexibility === 'high' || ownerContext?.operatingModel === 'short_mid' ? 0.1 : 0) +
      (ownerContext?.operatingModel === 'long' ? -0.05 : 0) +
      (marketDelta > 0 ? 0.07 : 0) +
      (lodgraSignal?.ownerRealityScore ?? 0) * 0.03,
    'long-stay':
      baseNetByStay['long-stay'] / maxNet +
      0.02 +
      (ownerContext?.operatingModel === 'long' ? 0.18 : 0) -
      (ownerContext?.flexibility === 'high' || ownerContext?.operatingModel === 'short_mid' ? 0.14 : 0) +
      (marketDelta < 0 ? 0.05 : 0) +
      (lodgraSignal?.historicalRevenue != null ? 0.02 : 0),
  }

  const contextualRanking = (['short-stay', 'mid-stay', 'long-stay'] as StayType[]).sort((left, right) => {
    const scoreDiff = scoreByStay[right] - scoreByStay[left]
    if (Math.abs(scoreDiff) > 0.0001) {
      return scoreDiff
    }

    return baseNetByStay[right] - baseNetByStay[left]
  })

  const recommendedStayType = contextualRanking[0]
  const bestComparable = comparables[0]
  const secondComparable = comparables[1]

  const reason = bestComparable
    ? `${formatStayTypeLabel(recommendedStayType)} lidera a leitura quando combinamos mercado observado, inteligência Lodgra/AHS e retorno financeiro, enquanto ${formatStayTypeLabel(bestComparable.stayType as StayType)} ou referências comparáveis permanecem disponíveis para validação.`
    : `${formatStayTypeLabel(recommendedStayType)} lidera a leitura quando combinamos mercado observado, inteligência Lodgra/AHS e retorno financeiro.`

  const caveats: string[] = []
  if (secondComparable) {
    caveats.push(`Comparar com ${formatStayTypeLabel(secondComparable.stayType as StayType)} se a sensibilidade da ocupação mudar.`)
  }
  caveats.push('A leitura prioriza curta e média duração como core business da operação; o anual só deve liderar se a vantagem for estrutural e clara.')
  if (ownerContext?.flexibility === 'high' || ownerContext?.operatingModel === 'short_mid') {
    caveats.push('O contexto do proprietário favorece uso flexível e manutenção preventiva, o que pesa a favor de curta e média duração.')
  }
  if (ownerContext?.historicalRevenue != null || ownerContext?.rentedDays != null) {
    const revenue = ownerContext.historicalRevenue != null ? ownerContext.historicalRevenue : 0
    const days = ownerContext.rentedDays != null ? ownerContext.rentedDays : 0
    caveats.push(
      `Histórico operacional informado: ${revenue > 0 ? revenue.toFixed(2) : '0.00'} € faturados e ${days} dias alugados, útil para calibrar a leitura com a operação real.`
    )
  }
  if (lodgraSignal?.dataQuality != null) {
    caveats.push(`Sinal Lodgra/AHS com qualidade ${lodgraSignal.dataQuality} e peso operacional ${lodgraSignal.operationalWeighting.toFixed(2)}.`)
  }
  caveats.push('Manter o relatório publicado apenas após aprovação humana.')

  return {
    recommendedStayType,
    reason,
    caveats,
    comparisonOrder: contextualRanking,
  }
}
