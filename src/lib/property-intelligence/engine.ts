import { randomUUID } from 'node:crypto'

import type {
  ComparableBenchmark,
  AILayerResult,
  LodgraSignal,
  MarketSegment,
  MarketSnapshot,
  PropertyIntelligenceInput,
  PropertyIntelligenceResult,
  ScenarioResult,
  StayAssumptionsInput,
  StayModelResult,
  StayType,
  ScenarioLabel,
  TelemetryEvent,
} from './types'
import { auditPropertyIntelligenceResult } from './audit'
import { buildComparables } from './comparables'
import { calculateCostBreakdown, getDefaultStayAssumptions } from './cost'
import { deriveLocationSignal } from './location'
import { normalizeIntake } from './intake'
import { buildStrategyRecommendation } from './strategy'

export const FORMULA_VERSION = '2026.08.22-dev3'

const SCENARIO_MULTIPLIERS: Record<ScenarioLabel, { revenue: number; costs: number; confidence: number }> = {
  conservative: {
    revenue: 0.9,
    costs: 1.05,
    confidence: 0.82,
  },
  base: {
    revenue: 1,
    costs: 1,
    confidence: 0.9,
  },
  optimized: {
    revenue: 1.12,
    costs: 0.95,
    confidence: 0.86,
  },
}

const STAY_TYPE_ORDER: StayType[] = ['long-stay', 'mid-stay', 'short-stay']

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function parseDate(value: string): number {
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function median(values: number[]): number {
  if (values.length === 0) {
    return 0
  }

  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? roundMoney((sorted[middle - 1] + sorted[middle]) / 2) : roundMoney(sorted[middle])
}

function range(values: number[]): { min: number; max: number } {
  if (values.length === 0) {
    return { min: 0, max: 0 }
  }

  return {
    min: roundMoney(Math.min(...values)),
    max: roundMoney(Math.max(...values)),
  }
}

function confidenceFromSample(sampleSize: number, latestObservedAt: number): 'low' | 'medium' | 'high' {
  const recencyBoost = latestObservedAt > 0 && Date.now() - latestObservedAt <= 1000 * 60 * 60 * 24 * 45
  if (sampleSize >= 4 || (sampleSize >= 3 && recencyBoost)) {
    return 'high'
  }

  if (sampleSize >= 2) {
    return 'medium'
  }

  return 'low'
}

const MID_STAY_HIGH_SEASON_MONTHS = ['jun', 'jul', 'aug', 'sep']
const MID_STAY_SEASONAL_WEIGHTS: Record<string, number> = {
  jan: 0.02,
  feb: 0.02,
  mar: 0.03,
  apr: 0.04,
  may: 0.06,
  jun: 0.12,
  jul: 0.24,
  aug: 0.26,
  sep: 0.14,
  oct: 0.05,
  nov: 0.02,
  dec: 0.01,
}
const SHORT_STAY_SEASONAL_WEIGHTS: Record<string, number> = {
  jan: 0.01,
  feb: 0.01,
  mar: 0.02,
  apr: 0.03,
  may: 0.05,
  jun: 0.1,
  jul: 0.29,
  aug: 0.3,
  sep: 0.12,
  oct: 0.04,
  nov: 0.02,
  dec: 0.01,
}
const MARKET_SEASONALITY_BIAS: Record<string, number> = {
  coastal: 1.14,
  urban: 0.88,
  suburban: 0.96,
  rural: 0.84,
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function normalizeSeasonalityMonths(assumptions: StayAssumptionsInput): Record<string, number> {
  if (!assumptions.monthlySeasonality || typeof assumptions.monthlySeasonality !== 'object') {
    return {}
  }

  return Object.fromEntries(
    Object.entries(assumptions.monthlySeasonality)
      .map(([month, value]) => [month.trim().toLowerCase(), Number(value)] as const)
      .filter(([, value]) => Number.isFinite(value))
  )
}

function weightedAverageSeasonality(
  seasonality: Record<string, number>,
  weights: Record<string, number>
): number {
  const entries = Object.entries(weights)
    .map(([month, weight]) => {
      const value = seasonality[month]
      if (!Number.isFinite(value) || !Number.isFinite(weight) || weight <= 0) {
        return null
      }

      return { value, weight }
    })
    .filter((item): item is { value: number; weight: number } => item != null)

  if (entries.length === 0) {
    return 0
  }

  const totalWeight = entries.reduce((sum, item) => sum + item.weight, 0)
  if (totalWeight <= 0) {
    return 0
  }

  return entries.reduce((sum, item) => sum + item.value * item.weight, 0) / totalWeight
}

function getTypologySeasonalityBias(typologyText: string, stayType: StayType): number {
  if (/t4\+/.test(typologyText)) {
    return stayType === 'short-stay' ? 1.1 : 1.08
  }

  if (/t3/.test(typologyText)) {
    return stayType === 'short-stay' ? 1.08 : 1.05
  }

  if (/t2/.test(typologyText)) {
    return stayType === 'short-stay' ? 1.04 : 1.02
  }

  if (/t1/.test(typologyText)) {
    return stayType === 'short-stay' ? 0.98 : 0.97
  }

  if (/studio|t0/.test(typologyText)) {
    return stayType === 'short-stay' ? 0.96 : 0.95
  }

  return 1
}

function calculateMidStaySeasonalRevenueMultiplier(
  assumptions: StayAssumptionsInput,
  seasonalityInput?: Record<string, number> | null,
  marketTier?: ReturnType<typeof normalizeIntake>['normalizedProperty']['market'],
  typologyText = ''
): number {
  const minStayNights = Math.max(1, Math.round(assumptions.minStayNights ?? 7))
  const highSeasonMinStayNights = Math.max(1, Math.round(assumptions.highSeasonMinStayNights ?? 5))
  const dynamicPricingEnabled = assumptions.dynamicPricingEnabled !== false
  const configuredHighSeasonMonths = Array.isArray(assumptions.highSeasonMonths)
    ? assumptions.highSeasonMonths.map(month => month.trim().toLowerCase()).filter(Boolean)
    : MID_STAY_HIGH_SEASON_MONTHS
  const seasonality = normalizeSeasonalityMonths({
    ...assumptions,
    monthlySeasonality: seasonalityInput ?? assumptions.monthlySeasonality ?? null,
  })

  if (!dynamicPricingEnabled) {
    return 1
  }

  const nightsDelta = Math.max(0, minStayNights - highSeasonMinStayNights)
  const nightsBonus = Math.min(0.08, nightsDelta * 0.015)
  const calendarBonus = Math.min(0.04, configuredHighSeasonMonths.length * 0.005)

  const seasonalityValues = Object.values(seasonality)
  if (seasonalityValues.length === 0) {
    return 1 + nightsBonus + calendarBonus
  }

  const annualAverage = average(seasonalityValues)
  const peakMonths = configuredHighSeasonMonths.length > 0 ? configuredHighSeasonMonths : MID_STAY_HIGH_SEASON_MONTHS
  const weightedAnnualAverage = weightedAverageSeasonality(seasonality, MID_STAY_SEASONAL_WEIGHTS)
  const weightedPeakAverage = weightedAverageSeasonality(
    seasonality,
    Object.fromEntries(peakMonths.map(month => [month, MID_STAY_SEASONAL_WEIGHTS[month] ?? 0]))
  )
  const julAugAverage = average(
    ['jul', 'aug']
      .map(month => seasonality[month])
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  )
  const junSepAverage = average(
    ['jun', 'sep']
      .map(month => seasonality[month])
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  )
  const shoulderSpread = julAugAverage > 0 && junSepAverage > 0 ? julAugAverage - junSepAverage : 0
  const referenceAverage = weightedPeakAverage > 0 ? weightedPeakAverage : weightedAnnualAverage > 0 ? weightedAnnualAverage : annualAverage
  const seasonalitySpread = referenceAverage - annualAverage
  const marketBias = MARKET_SEASONALITY_BIAS[marketTier ?? 'coastal'] ?? 1
  const typologyBias = getTypologySeasonalityBias(typologyText, 'mid-stay')
  const seasonalityBonus = clamp(
    (seasonalitySpread * 0.45 + (weightedAnnualAverage - annualAverage) * 0.2) * marketBias * typologyBias,
    -0.03,
    0.24
  )
  const peakIntensityBonus = clamp(
    (Math.max(0, referenceAverage - 1) * 0.05 + Math.max(0, shoulderSpread) * 0.03) * marketBias * typologyBias,
    0,
    0.14
  )

  return 1 + nightsBonus + calendarBonus + seasonalityBonus + peakIntensityBonus
}

function calculateShortStaySeasonalRevenueMultiplier(
  assumptions: StayAssumptionsInput,
  seasonalityInput?: Record<string, number> | null,
  marketTier?: ReturnType<typeof normalizeIntake>['normalizedProperty']['market'],
  typologyText = ''
): number {
  const minStayNights = Math.max(1, Math.round(assumptions.minStayNights ?? 5))
  const highSeasonMinStayNights = Math.max(1, Math.round(assumptions.highSeasonMinStayNights ?? 4))
  const dynamicPricingEnabled = assumptions.dynamicPricingEnabled !== false
  const seasonality = normalizeSeasonalityMonths({
    ...assumptions,
    monthlySeasonality: seasonalityInput ?? assumptions.monthlySeasonality ?? null,
  })

  if (!dynamicPricingEnabled) {
    return 1
  }

  const seasonalityValues = Object.values(seasonality)
  if (seasonalityValues.length === 0) {
    return 1 + Math.min(0.08, Math.max(0, minStayNights - highSeasonMinStayNights) * 0.018)
  }

  const annualAverage = average(seasonalityValues)
  const weightedPeakAverage = weightedAverageSeasonality(seasonality, SHORT_STAY_SEASONAL_WEIGHTS)
  const peakIntensity = Math.max(0, weightedPeakAverage - annualAverage)
  const marketBias = MARKET_SEASONALITY_BIAS[marketTier ?? 'coastal'] ?? 1
  const typologyBias = getTypologySeasonalityBias(typologyText, 'short-stay')
  const nightsBonus = Math.min(0.08, Math.max(0, minStayNights - highSeasonMinStayNights) * 0.018)
  const seasonalLift = clamp(
    (peakIntensity * 0.55 + Math.max(0, weightedPeakAverage - 1) * 0.08) * marketBias * typologyBias,
    0,
    0.28
  )
  const shoulderProtection = clamp(
    Math.max(0, (seasonality['jun'] ?? annualAverage) - (seasonality['apr'] ?? annualAverage)) * 0.04,
    0,
    0.05
  )

  return 1 + nightsBonus + seasonalLift + shoulderProtection
}

function getMarketSegmentComparables(comparables: ComparableBenchmark[], segment: MarketSegment): ComparableBenchmark[] {
  if (segment === 'short_mid') {
    return comparables.filter(comparable => comparable.stayType === 'short-stay' || comparable.stayType === 'mid-stay' || comparable.stayType === 'mixed')
  }

  return comparables.filter(comparable => comparable.stayType === 'long-stay' || comparable.stayType === 'mixed')
}

function buildMarketSnapshot(
  segment: MarketSegment,
  comparables: ComparableBenchmark[],
  fallbackMarketTier: ReturnType<typeof normalizeIntake>['normalizedProperty']['market']
): MarketSnapshot {
  const segmentComparables = getMarketSegmentComparables(comparables, segment)
  const sortedComparables = [...segmentComparables].sort((left, right) => {
    const leftDate = parseDate(left.observedAt)
    const rightDate = parseDate(right.observedAt)

    if (leftDate !== rightDate) {
      return rightDate - leftDate
    }

    return right.monthlyNetReturn - left.monthlyNetReturn
  })

  const grossValues = sortedComparables.map(comparable => comparable.monthlyGrossRevenue)
  const netValues = sortedComparables.map(comparable => comparable.monthlyNetReturn)
  const latestObservedAt = sortedComparables.reduce((latest, comparable) => {
    const current = parseDate(comparable.observedAt)
    return current > latest ? current : latest
  }, 0)

  return {
    segment,
    marketTier: sortedComparables[0]?.marketTier ?? fallbackMarketTier,
    observedAt: latestObservedAt > 0 ? new Date(latestObservedAt).toISOString().slice(0, 10) : '',
    comparables: sortedComparables,
    medianGross: median(grossValues),
    medianNet: median(netValues),
    rangeGross: range(grossValues),
    rangeNet: range(netValues),
    confidence: confidenceFromSample(sortedComparables.length, latestObservedAt),
  }
}

function buildLodgraSignal(
  ownerContext: ReturnType<typeof normalizeIntake>['ownerContext'],
  marketSnapshot: Record<MarketSegment, MarketSnapshot>
): LodgraSignal {
  const dataQuality = ownerContext.dataQuality
  const qualityWeight = dataQuality === 'high' ? 0.9 : dataQuality === 'medium' ? 0.65 : 0.35
  const operatingWeight = ownerContext.operatingModel === 'short_mid' ? 0.8 : ownerContext.operatingModel === 'long' ? 0.45 : 0.6
  const ownerRealityScore = roundMoney(Math.max(0.15, Math.min(1, qualityWeight * 0.7 + operatingWeight * 0.3)))
  const marketReference = marketSnapshot.short_mid.medianNet || marketSnapshot.annual.medianNet || 0
  const historicalRevenue = ownerContext.historicalRevenue
  const historicalVsMarketDelta = historicalRevenue != null ? roundMoney(historicalRevenue - marketReference) : null

  return {
    historicalRevenue,
    historicalOccupancyPct: ownerContext.occupancyPct,
    historicalAdr: ownerContext.historicalAdr,
    monthlySeasonality: ownerContext.monthlySeasonality,
    channelMix: ownerContext.channelMix,
    operationalCostsMonthly: ownerContext.operationalCostsMonthly,
    dataQuality,
    ownerRealityScore,
    historicalVsMarketDelta,
    operationalWeighting: operatingWeight,
    sourceLabel:
      historicalRevenue != null || ownerContext.occupancyPct != null || ownerContext.historicalAdr != null
        ? 'Histórico operacional Lodgra/AHS'
        : 'Sem histórico operacional explícito',
  }
}

function estimateGrossRevenue(
  stayType: StayType,
  normalizedProperty: ReturnType<typeof normalizeIntake>['normalizedProperty'],
  locationMultiplier: number,
  baseRatePerM2: number,
  assumptions: StayAssumptionsInput
): number {
  if (typeof assumptions.monthlyGrossRevenue === 'number' && Number.isFinite(assumptions.monthlyGrossRevenue)) {
    return assumptions.monthlyGrossRevenue
  }

  const typologyText = normalizedProperty.typology.toLowerCase()
  const propertyTypeText = normalizedProperty.propertyType.toLowerCase()
  const typologyMultiplier = /studio|t0/.test(typologyText)
    ? 0.88
    : /t1/.test(typologyText)
      ? 1
      : /t2/.test(typologyText)
        ? 1.14
        : /t3/.test(typologyText)
          ? 1.28
          : /t4\+/.test(typologyText)
            ? 1.38
            : 1.05

  const propertyTypeMultiplier = /vivenda|cabana|house|villa/.test(propertyTypeText)
    ? 1.08
    : /pr[eé]dio/.test(propertyTypeText)
      ? 1.02
      : 1

  const conditionMultiplier =
    normalizedProperty.condition === 'poor'
      ? 0.85
      : normalizedProperty.condition === 'fair'
        ? 0.95
        : normalizedProperty.condition === 'excellent'
          ? 1.12
          : 1.04

  const furnishedMultiplier = normalizedProperty.furnished ? 1.05 : 0.96
  const balconyMultiplier = normalizedProperty.balcony ? 1.02 : 1
  const poolMultiplier = normalizedProperty.pool ? 1.05 : 1
  const garageMultiplier = normalizedProperty.garage ? 1.03 : 1
  const bedroomsMultiplier = 1 + Math.max(0, normalizedProperty.bedrooms - 1) * 0.07
  const area = normalizedProperty.areaM2 || 45
  const base =
    area *
    baseRatePerM2 *
    typologyMultiplier *
    propertyTypeMultiplier *
    conditionMultiplier *
    furnishedMultiplier *
    balconyMultiplier *
    poolMultiplier *
    garageMultiplier *
    bedroomsMultiplier *
    locationMultiplier

  if (stayType === 'mid-stay') {
    return base * 1.18
  }

  if (stayType === 'short-stay') {
    return base * 1.92
  }

  return base
}

function buildScenario(
  stayType: StayType,
  label: ScenarioLabel,
  grossMonthlyRevenue: number,
  assumptions: StayAssumptionsInput,
  occupancyPct: number
): ScenarioResult {
  const multipliers = SCENARIO_MULTIPLIERS[label]
  const effectiveOccupancy = clamp(occupancyPct * (label === 'conservative' ? 0.94 : label === 'optimized' ? 1.03 : 1), 0.35, 0.98)
  const effectiveMonthlyRevenue = roundMoney(grossMonthlyRevenue * effectiveOccupancy * multipliers.revenue)
  const adjustedAssumptions: StayAssumptionsInput = {
    ...assumptions,
    fixedCostsMonthly: roundMoney((assumptions.fixedCostsMonthly ?? 0) * multipliers.costs),
  }
  const costs = calculateCostBreakdown(stayType, effectiveMonthlyRevenue, adjustedAssumptions)
  const netMonthlyReturn = roundMoney(costs.afterChannelRevenue - (costs.totalMonthlyCosts - costs.channelMonthlyCosts))

  return {
    label,
    grossMonthlyRevenue: roundMoney(grossMonthlyRevenue * multipliers.revenue),
    effectiveMonthlyRevenue,
    afterChannelRevenue: costs.afterChannelRevenue,
    occupancyPct: roundMoney(effectiveOccupancy),
    costs,
    netMonthlyReturn,
    ownerNetReturn: netMonthlyReturn,
    annualNetReturn: roundMoney(netMonthlyReturn * 12),
    confidence: label === 'base' ? 'high' : label === 'optimized' ? 'medium' : 'medium',
    provenance: 'derived',
    notes: [
      `Scenario multiplier: ${label}`,
      stayType === 'short-stay' ? 'Includes turnover cleaning assumptions.' : 'Uses a simplified monthly cost model.',
    ],
  }
}

function buildStayModel(
  stayType: StayType,
  normalizedProperty: ReturnType<typeof normalizeIntake>['normalizedProperty'],
  locationMultiplier: number,
  baseRatePerM2: number,
  assumptions: StayAssumptionsInput,
  seasonalityInput?: Record<string, number> | null
): StayModelResult {
  const defaultAssumptions = getDefaultStayAssumptions(stayType)
  const mergedAssumptions: StayAssumptionsInput = {
    ...defaultAssumptions,
    ...assumptions,
  }

  const baseGrossMonthlyRevenue = roundMoney(
    estimateGrossRevenue(stayType, normalizedProperty, locationMultiplier, baseRatePerM2, mergedAssumptions) *
      (stayType === 'mid-stay'
        ? calculateMidStaySeasonalRevenueMultiplier(
            mergedAssumptions,
            seasonalityInput,
            normalizedProperty.market,
            normalizedProperty.typology
          )
        : stayType === 'short-stay'
          ? calculateShortStaySeasonalRevenueMultiplier(
              mergedAssumptions,
              seasonalityInput,
              normalizedProperty.market,
              normalizedProperty.typology
            )
          : 1)
  )
  const baseOccupancyPct = roundMoney(
    clamp(
      mergedAssumptions.occupancyPct ?? defaultAssumptions.occupancyPct ?? 0.8,
      0.35,
      0.98
    )
  )

  const scenarios: ScenarioResult[] = (['conservative', 'base', 'optimized'] as ScenarioLabel[]).map(label =>
    buildScenario(stayType, label, baseGrossMonthlyRevenue, mergedAssumptions, baseOccupancyPct)
  )

  const scenarioConfidence = baseOccupancyPct >= 0.8 ? 'high' : baseOccupancyPct >= 0.65 ? 'medium' : 'low'

  return {
    stayType,
    baseGrossMonthlyRevenue,
    baseOccupancyPct,
    scenarioConfidence,
    scenarios,
    assumptionsUsed: mergedAssumptions,
  }
}

export function runPropertyIntelligenceAnalysis(
  input: PropertyIntelligenceInput,
  context?: { traceId?: string; startedAt?: string }
): PropertyIntelligenceResult {
  const traceId = context?.traceId ?? randomUUID()
  const startedAt = context?.startedAt ?? new Date().toISOString()
  const telemetryEvents: TelemetryEvent[] = [
    {
      name: 'analysis.start',
      at: startedAt,
      payload: { traceId },
    },
  ]

  const intake = normalizeIntake(input)
  const blockedInputs = [...intake.blockingInputs]

  if (blockedInputs.length > 0) {
    const finishedAt = new Date().toISOString()
    telemetryEvents.push({
      name: 'analysis.blocked_inputs',
      at: finishedAt,
      payload: { traceId, blockedInputs: blockedInputs.length },
    })
    telemetryEvents.push({
      name: 'analysis.publish_approval',
      at: finishedAt,
      payload: {
        traceId,
        required: true,
        approved: false,
      },
    })

    const provisionalResult: PropertyIntelligenceResult = {
      traceId,
      formulaVersion: FORMULA_VERSION,
      startedAt,
      finishedAt,
      durationMs: new Date(finishedAt).getTime() - new Date(startedAt).getTime(),
      status: 'needs_input',
      blockedInputs,
      intake,
      location: null,
      marketSnapshot: null,
      lodgraSignal: null,
      analysisLayers: {
        market: null,
        lodgra: null,
        ai: null,
      },
      comparables: [],
      models: null,
      strategy: null,
      audit: {
        status: 'fail',
        issues: ['Required inputs are missing.'],
        coverageScore: 0,
        publishApprovalRequired: true,
        publishApprovalState: 'pending',
      },
      publication: {
        required: true,
        approved: false,
      },
      telemetry: {
        events: telemetryEvents,
      },
    }

    telemetryEvents.push({
      name: 'analysis.end',
      at: finishedAt,
      payload: {
        traceId,
        status: provisionalResult.status === 'needs_input',
      },
    })

    return provisionalResult
  }

  const location = deriveLocationSignal(intake.normalizedProperty)
  const locationMultiplier =
    location.marketTier === 'coastal'
      ? 1.18
      : location.marketTier === 'urban'
        ? 1.12
        : location.marketTier === 'suburban'
          ? 1
          : 0.9

  const models = {
    'long-stay': buildStayModel(
      'long-stay',
      intake.normalizedProperty,
      locationMultiplier,
      location.baseRatePerM2,
      intake.normalizedAssumptions.longStay
    ),
    'mid-stay': buildStayModel(
      'mid-stay',
      intake.normalizedProperty,
      locationMultiplier,
      location.baseRatePerM2,
      intake.normalizedAssumptions.midStay,
      intake.ownerContext.monthlySeasonality
    ),
    'short-stay': buildStayModel(
      'short-stay',
      intake.normalizedProperty,
      locationMultiplier,
      location.baseRatePerM2,
      intake.normalizedAssumptions.shortStay
    ),
  } satisfies Record<StayType, StayModelResult>

  const comparables = buildComparables(
    input.comparables,
    models as Record<
      StayType,
      {
        baseGrossMonthlyRevenue: number
        scenarios: Array<{ label: ScenarioLabel; netMonthlyReturn: number }>
      }
    >,
    intake.normalizedProperty.market
  ) as ComparableBenchmark[]
  const marketSnapshot: Record<MarketSegment, MarketSnapshot> = {
    short_mid: buildMarketSnapshot('short_mid', comparables, intake.normalizedProperty.market),
    annual: buildMarketSnapshot('annual', comparables, intake.normalizedProperty.market),
  }
  const lodgraSignal = buildLodgraSignal(intake.ownerContext, marketSnapshot)
  const strategy = buildStrategyRecommendation(
    models as Record<StayType, { scenarios: { label: 'base'; netMonthlyReturn: number }[] }>,
    comparables,
    intake.ownerContext,
    { marketSnapshot, lodgraSignal }
  )
  const aiLayer: AILayerResult = {
    confidence: strategy.recommendedStayType === 'short-stay' ? 'medium' : 'high',
    narrative:
      `${strategy.reason} A leitura cruza mercado observado, inteligência Lodgra/AHS e contexto do proprietário para chegar à decisão executiva.`,
    recommendation: strategy,
  }

  const provisionalResult: PropertyIntelligenceResult = {
    traceId,
    formulaVersion: FORMULA_VERSION,
    startedAt,
    finishedAt: new Date().toISOString(),
    durationMs: 0,
    status: 'ready',
    blockedInputs: [],
    intake,
    location,
    marketSnapshot,
    lodgraSignal,
    analysisLayers: {
      market: marketSnapshot,
      lodgra: lodgraSignal,
      ai: aiLayer,
    },
    comparables,
    models,
    strategy,
    audit: {
      status: 'pass',
      issues: [],
      coverageScore: 0,
      publishApprovalRequired: true,
      publishApprovalState: 'pending',
    },
    publication: {
      required: true,
      approved: false,
    },
    telemetry: {
      events: telemetryEvents,
    },
  }

  provisionalResult.audit = auditPropertyIntelligenceResult(provisionalResult)

  const finishedAt = new Date().toISOString()
  provisionalResult.finishedAt = finishedAt
  provisionalResult.durationMs = new Date(finishedAt).getTime() - new Date(startedAt).getTime()

  telemetryEvents.push({
    name: 'analysis.end',
    at: finishedAt,
    payload: {
      traceId,
      status: true,
    },
  })
  telemetryEvents.push({
    name: 'analysis.publish_approval',
    at: finishedAt,
    payload: {
      traceId,
      required: provisionalResult.publication.required,
      approved: provisionalResult.publication.approved,
    },
  })

  return provisionalResult
}
