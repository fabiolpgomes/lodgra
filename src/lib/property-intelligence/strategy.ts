import type {
  ComparableBenchmark,
  NormalizedOwnerContext,
  ScenarioLabel,
  StayType,
  StrategyRecommendation,
} from './types'

function formatStayTypeLabel(stayType: StayType): string {
  if (stayType === 'long-stay') {
    return 'estadia longa'
  }

  if (stayType === 'mid-stay') {
    return 'estadia média'
  }

  return 'estadia curta'
}

export function buildStrategyRecommendation(
  models: Record<
    StayType,
    { scenarios: Array<{ label: ScenarioLabel; netMonthlyReturn: number }> }
  >,
  comparables: ComparableBenchmark[],
  ownerContext?: NormalizedOwnerContext
): StrategyRecommendation {
  const baseRanking = (['short-stay', 'mid-stay', 'long-stay'] as StayType[]).sort((left, right) => {
    const leftNet = models[left].scenarios.find(scenario => scenario.label === 'base')?.netMonthlyReturn ?? 0
    const rightNet = models[right].scenarios.find(scenario => scenario.label === 'base')?.netMonthlyReturn ?? 0
    return rightNet - leftNet
  })

  const contextualRanking = [...baseRanking]

  if (ownerContext?.operatingModel === 'short_mid' || ownerContext?.flexibility === 'high') {
    contextualRanking.sort((left, right) => {
      const orderScore = (stayType: StayType): number => {
        if (stayType === 'short-stay') {
          return 3
        }

        if (stayType === 'mid-stay') {
          return 2
        }

        return 1
      }

      const leftScore = orderScore(left)
      const rightScore = orderScore(right)
      if (leftScore !== rightScore) {
        return rightScore - leftScore
      }

      const leftNet = models[left].scenarios.find(scenario => scenario.label === 'base')?.netMonthlyReturn ?? 0
      const rightNet = models[right].scenarios.find(scenario => scenario.label === 'base')?.netMonthlyReturn ?? 0
      return rightNet - leftNet
    })
  } else if (ownerContext?.operatingModel === 'long') {
    contextualRanking.sort((left, right) => {
      const orderScore = (stayType: StayType): number => {
        if (stayType === 'long-stay') {
          return 3
        }

        if (stayType === 'mid-stay') {
          return 2
        }

        return 1
      }

      const leftScore = orderScore(left)
      const rightScore = orderScore(right)
      if (leftScore !== rightScore) {
        return rightScore - leftScore
      }

      const leftNet = models[left].scenarios.find(scenario => scenario.label === 'base')?.netMonthlyReturn ?? 0
      const rightNet = models[right].scenarios.find(scenario => scenario.label === 'base')?.netMonthlyReturn ?? 0
      return rightNet - leftNet
    })
  }

  const recommendedStayType = contextualRanking[0]
  const bestComparable = comparables[0]
  const secondComparable = comparables[1]

  const reason = bestComparable
    ? `${formatStayTypeLabel(recommendedStayType)} lidera o cenário base com o perfil de retorno líquido mais forte, enquanto ${formatStayTypeLabel(bestComparable.stayType as StayType)} ou referências comparáveis permanecem disponíveis para validação.`
    : `${formatStayTypeLabel(recommendedStayType)} lidera o cenário base com o perfil de retorno líquido mais forte.`

  const caveats: string[] = []
  if (secondComparable) {
    caveats.push(`Comparar com ${formatStayTypeLabel(secondComparable.stayType as StayType)} se a sensibilidade da ocupação mudar.`)
  }
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
  caveats.push('Manter o relatório publicado apenas após aprovação humana.')

  return {
    recommendedStayType,
    reason,
    caveats,
    comparisonOrder: ranking,
  }
}
