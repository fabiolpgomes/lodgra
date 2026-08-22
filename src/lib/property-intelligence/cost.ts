import type { CostBreakdown, StayAssumptionsInput, StayType } from './types'

const DEFAULT_COSTS: Record<
  StayType,
  {
    fixedMonthlyCosts: number
    variableCostsPct: number
    commissionPct: number
    cleaningPerTurnover: number
    turnoversPerMonth: number
    occupancyPct: number
  }
> = {
  'long-stay': {
    fixedMonthlyCosts: 180,
    variableCostsPct: 0.05,
    commissionPct: 0.08,
    cleaningPerTurnover: 0,
    turnoversPerMonth: 0,
    occupancyPct: 0.95,
  },
  'mid-stay': {
    fixedMonthlyCosts: 220,
    variableCostsPct: 0.06,
    commissionPct: 0.12,
    cleaningPerTurnover: 0,
    turnoversPerMonth: 0,
    occupancyPct: 0.84,
  },
  'short-stay': {
    fixedMonthlyCosts: 320,
    variableCostsPct: 0.12,
    commissionPct: 0.18,
    cleaningPerTurnover: 45,
    turnoversPerMonth: 6,
    occupancyPct: 0.68,
  },
}

function toNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function clampPct(value: number): number {
  return Math.max(0, Math.min(1, value))
}

export function getDefaultStayAssumptions(stayType: StayType): StayAssumptionsInput {
  const defaults = DEFAULT_COSTS[stayType]

  return {
    occupancyPct: defaults.occupancyPct,
    fixedCostsMonthly: defaults.fixedMonthlyCosts,
    variableCostsPct: defaults.variableCostsPct,
    commissionPct: defaults.commissionPct,
    cleaningPerTurnover: defaults.cleaningPerTurnover,
    turnoversPerMonth: defaults.turnoversPerMonth,
  }
}

export function calculateCostBreakdown(
  stayType: StayType,
  effectiveMonthlyRevenue: number,
  assumptions: StayAssumptionsInput
): CostBreakdown {
  const defaults = DEFAULT_COSTS[stayType]
  const fixedMonthlyCosts = toNumber(assumptions.fixedCostsMonthly, defaults.fixedMonthlyCosts)
  const variableCostsPct = clampPct(toNumber(assumptions.variableCostsPct, defaults.variableCostsPct))
  const commissionPct = clampPct(toNumber(assumptions.commissionPct, defaults.commissionPct))
  const cleaningPerTurnover = toNumber(assumptions.cleaningPerTurnover, defaults.cleaningPerTurnover)
  const turnoversPerMonth = toNumber(assumptions.turnoversPerMonth, defaults.turnoversPerMonth)

  const variableMonthlyCosts = Math.round(effectiveMonthlyRevenue * variableCostsPct * 100) / 100
  const commissionMonthlyCosts = Math.round(effectiveMonthlyRevenue * commissionPct * 100) / 100
  const cleaningMonthlyCosts = Math.round(cleaningPerTurnover * turnoversPerMonth * 100) / 100
  const totalMonthlyCosts = Math.round(
    (fixedMonthlyCosts + variableMonthlyCosts + commissionMonthlyCosts + cleaningMonthlyCosts) * 100
  ) / 100

  return {
    fixedMonthlyCosts: Math.round(fixedMonthlyCosts * 100) / 100,
    variableMonthlyCosts,
    commissionMonthlyCosts,
    cleaningMonthlyCosts,
    totalMonthlyCosts,
  }
}

