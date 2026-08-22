import type { ComparableBenchmark, ComparableInput, ConfidenceLevel, StayType } from './types'
import type { ScenarioLabel } from './types'

function confidenceFromDistance(distance: number): ConfidenceLevel {
  if (distance <= 0.08) {
    return 'high'
  }

  if (distance <= 0.18) {
    return 'medium'
  }

  return 'low'
}

export function buildComparables(
  providedComparables: ComparableInput[] | null | undefined,
  models: Record<
    StayType,
    { baseGrossMonthlyRevenue: number; scenarios: Array<{ label: ScenarioLabel; netMonthlyReturn: number }> }
  >
): ComparableBenchmark[] {
  if (providedComparables && providedComparables.length > 0) {
    return providedComparables.map(item => ({
      label: item.label,
      stayType: item.stayType ?? 'mixed',
      monthlyGrossRevenue: Math.round(item.monthlyGrossRevenue * 100) / 100,
      monthlyNetReturn: Math.round((item.monthlyGrossRevenue * 0.72) * 100) / 100,
      confidence: 'high',
      provenance: 'provided',
      note: item.note?.trim() || item.source?.trim() || 'Provided comparable',
    }))
  }

  const baseline: Array<{ stayType: StayType; label: string; gross: number; net: number }> = [
    {
      stayType: 'long-stay',
      label: 'Internal long-stay benchmark',
      gross: models['long-stay'].baseGrossMonthlyRevenue,
      net: models['long-stay'].scenarios.find(scenario => scenario.label === 'base')?.netMonthlyReturn ?? 0,
    },
    {
      stayType: 'mid-stay',
      label: 'Internal mid-stay benchmark',
      gross: models['mid-stay'].baseGrossMonthlyRevenue,
      net: models['mid-stay'].scenarios.find(scenario => scenario.label === 'base')?.netMonthlyReturn ?? 0,
    },
    {
      stayType: 'short-stay',
      label: 'Internal short-stay benchmark',
      gross: models['short-stay'].baseGrossMonthlyRevenue,
      net: models['short-stay'].scenarios.find(scenario => scenario.label === 'base')?.netMonthlyReturn ?? 0,
    },
  ]

  return baseline
    .map((item, index) => {
      const distance = index === 0 ? 0.08 : index === 1 ? 0.12 : 0.16

      return {
        label: item.label,
        stayType: item.stayType,
        monthlyGrossRevenue: Math.round(item.gross * 100) / 100,
        monthlyNetReturn: Math.round(item.net * 100) / 100,
        confidence: confidenceFromDistance(distance),
        provenance: 'derived',
        note: 'Derived from the deterministic MVP model; no scraping involved.',
      } satisfies ComparableBenchmark
    })
    .sort((a, b) => b.monthlyNetReturn - a.monthlyNetReturn)
}
