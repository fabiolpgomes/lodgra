import type { ComparableBenchmark, ScenarioLabel, StayType, StrategyRecommendation } from './types'

export function buildStrategyRecommendation(
  models: Record<
    StayType,
    { scenarios: Array<{ label: ScenarioLabel; netMonthlyReturn: number }> }
  >,
  comparables: ComparableBenchmark[]
): StrategyRecommendation {
  const ranking = (['short-stay', 'mid-stay', 'long-stay'] as StayType[]).sort((left, right) => {
    const leftNet = models[left].scenarios.find(scenario => scenario.label === 'base')?.netMonthlyReturn ?? 0
    const rightNet = models[right].scenarios.find(scenario => scenario.label === 'base')?.netMonthlyReturn ?? 0
    return rightNet - leftNet
  })

  const recommendedStayType = ranking[0]
  const bestComparable = comparables[0]
  const secondComparable = comparables[1]

  const reason = bestComparable
    ? `${recommendedStayType} leads the base case with the strongest net return profile, while ${bestComparable.stayType} or comparable benchmarks remain available for validation.`
    : `${recommendedStayType} leads the base case with the strongest net return profile.`

  const caveats: string[] = []
  if (secondComparable) {
    caveats.push(`Compare against ${secondComparable.stayType} if occupancy sensitivity changes.`)
  }
  caveats.push('Keep the report published only after human approval.')

  return {
    recommendedStayType,
    reason,
    caveats,
    comparisonOrder: ranking,
  }
}
