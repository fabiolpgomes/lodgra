export type StayType = 'long-stay' | 'mid-stay' | 'short-stay'

export type ScenarioLabel = 'conservative' | 'base' | 'optimized'

export type MarketTier = 'coastal' | 'urban' | 'suburban' | 'rural'

export type ConditionTier = 'poor' | 'fair' | 'good' | 'excellent'

export type ConfidenceLevel = 'low' | 'medium' | 'high'

export type Provenance = 'provided' | 'estimated' | 'derived'

export type AnalysisStatus = 'needs_input' | 'ready'

export interface PropertyLeadInput {
  name?: string | null
  source?: string | null
  note?: string | null
}

export interface PropertyInput {
  location?: string | null
  typology?: string | null
  areaM2?: number | null
  bedrooms?: number | null
  market?: MarketTier | null
  condition?: ConditionTier | null
  furnished?: boolean | null
}

export interface StayAssumptionsInput {
  monthlyGrossRevenue?: number | null
  occupancyPct?: number | null
  fixedCostsMonthly?: number | null
  variableCostsPct?: number | null
  commissionPct?: number | null
  cleaningPerTurnover?: number | null
  turnoversPerMonth?: number | null
}

export interface PropertyIntelligenceInput {
  lead?: PropertyLeadInput | null
  property?: PropertyInput | null
  assumptions?: {
    currency?: string | null
    longStay?: StayAssumptionsInput | null
    midStay?: StayAssumptionsInput | null
    shortStay?: StayAssumptionsInput | null
  } | null
  comparables?: ComparableInput[] | null
}

export interface ComparableInput {
  label: string
  stayType?: StayType | null
  monthlyGrossRevenue: number
  note?: string | null
  source?: string | null
}

export interface NormalizedProperty {
  location: string
  typology: string
  areaM2: number
  bedrooms: number
  market: MarketTier
  condition: ConditionTier
  furnished: boolean
}

export interface NormalizedAssumptions {
  currency: string
  longStay: StayAssumptionsInput
  midStay: StayAssumptionsInput
  shortStay: StayAssumptionsInput
}

export interface IntakeResult {
  blockingInputs: string[]
  estimatedFields: string[]
  completenessScore: number
  normalizedProperty: NormalizedProperty
  normalizedAssumptions: NormalizedAssumptions
  lead: PropertyLeadInput
}

export interface LocationSignal {
  marketTier: MarketTier
  baseRatePerM2: number
  confidence: number
  rationale: string
  provenance: Provenance
}

export interface ComparableBenchmark {
  label: string
  stayType: StayType | 'mixed'
  monthlyGrossRevenue: number
  monthlyNetReturn: number
  confidence: ConfidenceLevel
  provenance: Provenance
  note: string
}

export interface CostBreakdown {
  fixedMonthlyCosts: number
  variableMonthlyCosts: number
  commissionMonthlyCosts: number
  cleaningMonthlyCosts: number
  totalMonthlyCosts: number
}

export interface ScenarioResult {
  label: ScenarioLabel
  grossMonthlyRevenue: number
  effectiveMonthlyRevenue: number
  occupancyPct: number
  costs: CostBreakdown
  netMonthlyReturn: number
  annualNetReturn: number
  confidence: ConfidenceLevel
  provenance: Provenance
  notes: string[]
}

export interface StayModelResult {
  stayType: StayType
  baseGrossMonthlyRevenue: number
  baseOccupancyPct: number
  scenarioConfidence: ConfidenceLevel
  scenarios: ScenarioResult[]
  assumptionsUsed: StayAssumptionsInput
}

export interface StrategyRecommendation {
  recommendedStayType: StayType
  reason: string
  caveats: string[]
  comparisonOrder: StayType[]
}

export interface AuditResult {
  status: 'pass' | 'warn' | 'fail'
  issues: string[]
  coverageScore: number
  publishApprovalRequired: boolean
  publishApprovalState: 'pending' | 'approved'
}

export interface TelemetryEvent {
  name: string
  at: string
  payload?: Record<string, string | number | boolean | null>
}

export interface PropertyIntelligenceResult {
  traceId: string
  formulaVersion: string
  startedAt: string
  finishedAt: string
  durationMs: number
  status: AnalysisStatus
  blockedInputs: string[]
  intake: IntakeResult
  location: LocationSignal | null
  comparables: ComparableBenchmark[]
  models: Record<StayType, StayModelResult> | null
  strategy: StrategyRecommendation | null
  audit: AuditResult
  publication: {
    required: boolean
    approved: boolean
  }
  telemetry: {
    events: TelemetryEvent[]
  }
}

