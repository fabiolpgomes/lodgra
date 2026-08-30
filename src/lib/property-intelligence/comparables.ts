import type { ComparableBenchmark, ComparableInput, ConfidenceLevel, MarketTier, StayType } from './types'
import type { ScenarioLabel } from './types'

const SOURCE_FEE_PROFILES: Array<{ pattern: RegExp; commissionPct: number }> = [
  { pattern: /airbnb/i, commissionPct: 0.18 },
  { pattern: /booking/i, commissionPct: 0.18 },
  { pattern: /vrbo/i, commissionPct: 0.16 },
  { pattern: /flatio/i, commissionPct: 0.15 },
  { pattern: /hostwise/i, commissionPct: 0.18 },
  { pattern: /idealista/i, commissionPct: 0.08 },
  { pattern: /imovirtual/i, commissionPct: 0.08 },
  { pattern: /casa\s*sapo/i, commissionPct: 0.08 },
  { pattern: /olx/i, commissionPct: 0.08 },
]

const MARKET_TIER_PRIORITY: Record<MarketTier, number> = {
  coastal: 0,
  urban: 1,
  suburban: 2,
  rural: 3,
}

function confidenceFromDistance(distance: number): ConfidenceLevel {
  if (distance <= 0.08) {
    return 'high'
  }

  if (distance <= 0.18) {
    return 'medium'
  }

  return 'low'
}

function parseObservedAt(value: string): number {
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function getSourceCommissionPct(source: string, stayType: StayType | 'mixed'): number {
  const normalizedSource = source.trim()
  const profile = SOURCE_FEE_PROFILES.find(item => item.pattern.test(normalizedSource))

  if (profile) {
    return profile.commissionPct
  }

  if (stayType === 'long-stay') {
    return 0.08
  }

  if (stayType === 'mid-stay') {
    return 0.14
  }

  return 0.18
}

function estimateComparableNetReturn(monthlyGrossRevenue: number, source: string, stayType: StayType | 'mixed'): number {
  const sourceCommissionPct = getSourceCommissionPct(source, stayType)
  const operatingDrag = stayType === 'short-stay' ? 0.08 : stayType === 'mid-stay' ? 0.06 : 0.04
  const multiplier = Math.max(0.2, 1 - sourceCommissionPct - operatingDrag)

  return Math.round(monthlyGrossRevenue * multiplier * 100) / 100
}

function resolveComparableMarketTier(item: ComparableInput, fallbackMarketTier: MarketTier): MarketTier {
  return item.marketTier ?? fallbackMarketTier
}

function sortComparablesByMarketAndRecency(
  comparables: ComparableBenchmark[],
  fallbackMarketTier: MarketTier
): ComparableBenchmark[] {
  return [...comparables].sort((left, right) => {
    const leftMarketScore = left.marketTier === fallbackMarketTier ? 0 : MARKET_TIER_PRIORITY[left.marketTier]
    const rightMarketScore = right.marketTier === fallbackMarketTier ? 0 : MARKET_TIER_PRIORITY[right.marketTier]

    if (leftMarketScore !== rightMarketScore) {
      return leftMarketScore - rightMarketScore
    }

    const observedAtDiff = parseObservedAt(right.observedAt) - parseObservedAt(left.observedAt)
    if (observedAtDiff !== 0) {
      return observedAtDiff
    }

    return right.monthlyNetReturn - left.monthlyNetReturn
  })
}

export function buildComparables(
  providedComparables: ComparableInput[] | null | undefined,
  models: Record<
    StayType,
    { baseGrossMonthlyRevenue: number; scenarios: Array<{ label: ScenarioLabel; netMonthlyReturn: number }> }
  >,
  fallbackMarketTier: MarketTier
): ComparableBenchmark[] {
  if (providedComparables && providedComparables.length > 0) {
    return sortComparablesByMarketAndRecency(
      providedComparables.map(item => {
        const stayType = item.stayType ?? 'mixed'
        const source = item.source?.trim() || 'Referência informada'
        const observedAt = item.observedAt?.trim() || ''
        const monthlyGrossRevenue = Math.round(item.monthlyGrossRevenue * 100) / 100

        return {
          label: item.label,
          stayType,
          marketTier: resolveComparableMarketTier(item, fallbackMarketTier),
          monthlyGrossRevenue,
          monthlyNetReturn:
            typeof item.monthlyNetReturn === 'number' && Number.isFinite(item.monthlyNetReturn)
              ? Math.round(item.monthlyNetReturn * 100) / 100
              : estimateComparableNetReturn(monthlyGrossRevenue, source, stayType),
          confidence: 'high',
          provenance: 'provided',
          source,
          observedAt,
          note: item.note?.trim() || source || 'Referência informada',
        } satisfies ComparableBenchmark
      }),
      fallbackMarketTier
    )
  }

  const baseline: Array<{ stayType: StayType; label: string; gross: number; net: number }> = [
    {
      stayType: 'long-stay',
      label: 'Referência interna de estadia longa',
      gross: models['long-stay'].baseGrossMonthlyRevenue,
      net: models['long-stay'].scenarios.find(scenario => scenario.label === 'base')?.netMonthlyReturn ?? 0,
    },
    {
      stayType: 'mid-stay',
      label: 'Referência interna de estadia média',
      gross: models['mid-stay'].baseGrossMonthlyRevenue,
      net: models['mid-stay'].scenarios.find(scenario => scenario.label === 'base')?.netMonthlyReturn ?? 0,
    },
    {
      stayType: 'short-stay',
      label: 'Referência interna de estadia curta',
      gross: models['short-stay'].baseGrossMonthlyRevenue,
      net: models['short-stay'].scenarios.find(scenario => scenario.label === 'base')?.netMonthlyReturn ?? 0,
    },
  ]

  return sortComparablesByMarketAndRecency(
    baseline.map((item, index) => {
      const distance = index === 0 ? 0.08 : index === 1 ? 0.12 : 0.16

      return {
        label: item.label,
        stayType: item.stayType,
        marketTier: fallbackMarketTier,
        monthlyGrossRevenue: Math.round(item.gross * 100) / 100,
        monthlyNetReturn: Math.round(item.net * 100) / 100,
        confidence: confidenceFromDistance(distance),
        provenance: 'derived',
        source: 'Modelo determinístico do MVP',
        observedAt: '',
        note: 'Derivado do modelo determinístico do MVP; sem scraping.',
      } satisfies ComparableBenchmark
    }),
    fallbackMarketTier
  )
}
