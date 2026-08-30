import type { CostBreakdown, StayAssumptionsInput, StayType } from './types'

const CHANNEL_FEE_RATES: Record<string, number> = {
  airbnb: 0.18,
  booking: 0.18,
  vrbo: 0.16,
  flatio: 0.15,
  hostwise: 0.18,
  direct: 0,
  idealista: 0.08,
  imovirtual: 0.08,
  'casa-sapo': 0.08,
  casasapo: 0.08,
  olx: 0.08,
}

const DEFAULT_CHANNEL_MIX: Record<StayType, Record<string, number>> = {
  'short-stay': {
    airbnb: 0.4,
    booking: 0.32,
    vrbo: 0.16,
    direct: 0.06,
    flatio: 0.04,
    hostwise: 0.02,
  },
  'mid-stay': {
    airbnb: 0.28,
    booking: 0.34,
    flatio: 0.2,
    direct: 0.12,
    hostwise: 0.06,
  },
  'long-stay': {
    idealista: 0.3,
    imovirtual: 0.25,
    casasapo: 0.2,
    olx: 0.15,
    direct: 0.1,
  },
}

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
    variableCostsPct: 0.04,
    commissionPct: 0.08,
    cleaningPerTurnover: 0,
    turnoversPerMonth: 0,
    occupancyPct: 0.95,
  },
  'mid-stay': {
    fixedMonthlyCosts: 220,
    variableCostsPct: 0.05,
    commissionPct: 0.12,
    cleaningPerTurnover: 0,
    turnoversPerMonth: 0,
    occupancyPct: 0.84,
  },
  'short-stay': {
    fixedMonthlyCosts: 300,
    variableCostsPct: 0.08,
    commissionPct: 0.18,
    cleaningPerTurnover: 40,
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
    channelMix: DEFAULT_CHANNEL_MIX[stayType],
    minStayNights: stayType === 'mid-stay' ? 7 : stayType === 'short-stay' ? 5 : 30,
    highSeasonMinStayNights: stayType === 'mid-stay' ? 5 : stayType === 'short-stay' ? 4 : 30,
    highSeasonMonths: stayType === 'mid-stay' || stayType === 'short-stay' ? ['jun', 'jul', 'aug', 'sep'] : ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'],
    dynamicPricingEnabled: stayType === 'mid-stay' || stayType === 'short-stay',
  }
}

function normalizeChannelKey(channel: string): string {
  return channel.trim().toLowerCase().replace(/[\s_]+/g, '-')
}

function calculateWeightedChannelPct(stayType: StayType, assumptions: StayAssumptionsInput): number {
  const channelMix = assumptions.channelMix ?? DEFAULT_CHANNEL_MIX[stayType]
  const entries = Object.entries(channelMix).filter(([, weight]) => typeof weight === 'number' && Number.isFinite(weight) && weight > 0)

  if (entries.length === 0) {
    return clampPct(toNumber(assumptions.commissionPct, DEFAULT_COSTS[stayType].commissionPct))
  }

  const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0)
  if (totalWeight <= 0) {
    return clampPct(toNumber(assumptions.commissionPct, DEFAULT_COSTS[stayType].commissionPct))
  }

  const weightedPct = entries.reduce((sum, [channel, weight]) => {
    const normalizedChannel = normalizeChannelKey(channel)
    const rate = CHANNEL_FEE_RATES[normalizedChannel] ?? clampPct(toNumber(assumptions.commissionPct, DEFAULT_COSTS[stayType].commissionPct))
    return sum + rate * (weight / totalWeight)
  }, 0)

  return clampPct(weightedPct)
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
  const channelMonthlyCosts = Math.round(effectiveMonthlyRevenue * calculateWeightedChannelPct(stayType, assumptions) * 100) / 100
  const afterChannelRevenue = Math.round((effectiveMonthlyRevenue - channelMonthlyCosts) * 100) / 100

  const variableMonthlyCosts = Math.round(afterChannelRevenue * variableCostsPct * 100) / 100
  const commissionMonthlyCosts = Math.round(channelMonthlyCosts * 100) / 100
  const cleaningMonthlyCosts = Math.round(cleaningPerTurnover * turnoversPerMonth * 100) / 100
  const totalMonthlyCosts = Math.round(
    (fixedMonthlyCosts + channelMonthlyCosts + variableMonthlyCosts + cleaningMonthlyCosts) * 100
  ) / 100

  return {
    fixedMonthlyCosts: Math.round(fixedMonthlyCosts * 100) / 100,
    channelMonthlyCosts,
    variableMonthlyCosts,
    commissionMonthlyCosts,
    cleaningMonthlyCosts,
    afterChannelRevenue,
    totalMonthlyCosts,
  }
}
