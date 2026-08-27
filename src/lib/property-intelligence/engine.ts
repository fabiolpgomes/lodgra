import { randomUUID } from 'node:crypto'

import type {
  ComparableBenchmark,
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
  const netMonthlyReturn = roundMoney(effectiveMonthlyRevenue - costs.totalMonthlyCosts)

  return {
    label,
    grossMonthlyRevenue: roundMoney(grossMonthlyRevenue * multipliers.revenue),
    effectiveMonthlyRevenue,
    occupancyPct: roundMoney(effectiveOccupancy),
    costs,
    netMonthlyReturn,
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
  assumptions: StayAssumptionsInput
): StayModelResult {
  const defaultAssumptions = getDefaultStayAssumptions(stayType)
  const mergedAssumptions: StayAssumptionsInput = {
    ...defaultAssumptions,
    ...assumptions,
  }

  const baseGrossMonthlyRevenue = roundMoney(
    estimateGrossRevenue(stayType, normalizedProperty, locationMultiplier, baseRatePerM2, mergedAssumptions)
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
      intake.normalizedAssumptions.midStay
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
    >
  ) as ComparableBenchmark[]
  const strategy = buildStrategyRecommendation(
    models as Record<StayType, { scenarios: { label: 'base'; netMonthlyReturn: number }[] }>,
    comparables,
    intake.ownerContext
  )

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
