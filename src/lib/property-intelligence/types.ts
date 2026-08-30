export type StayType = 'long-stay' | 'mid-stay' | 'short-stay'

export type ScenarioLabel = 'conservative' | 'base' | 'optimized'

export type MarketTier = 'coastal' | 'urban' | 'suburban' | 'rural'

export type ConditionTier = 'poor' | 'fair' | 'good' | 'excellent'

export type ConfidenceLevel = 'low' | 'medium' | 'high'

export type Provenance = 'provided' | 'estimated' | 'derived'

export type AnalysisStatus = 'needs_input' | 'ready'

export type OwnerFlexibilityLevel = 'high' | 'medium' | 'low'

export type OwnerOperatingModel = 'short_mid' | 'mixed' | 'long'

export type ReadingObjective = 'viability' | 'executive_report' | 'compare_scenarios'

export interface PropertyLeadInput {
  name?: string | null
  source?: string | null
  note?: string | null
}

export interface PropertyInput {
  location?: string | null
  propertyType?: string | null
  typology?: string | null
  areaM2?: number | null
  bedrooms?: number | null
  market?: MarketTier | null
  condition?: ConditionTier | null
  furnished?: boolean | null
  balcony?: boolean | null
  pool?: boolean | null
  garage?: boolean | null
  highlights?: string | null
  listingUrl?: string | null
}

export interface OwnerContextInput {
  flexibility?: OwnerFlexibilityLevel | null
  operatingModel?: OwnerOperatingModel | null
  historicalRevenue?: number | null
  rentedDays?: number | null
  occupancyPct?: number | null
  historicalAdr?: number | null
  operationalCostsMonthly?: number | null
  channelMix?: Record<string, number> | null
  monthlySeasonality?: Record<string, number> | null
  maintenanceNote?: string | null
}

export interface StayAssumptionsInput {
  monthlyGrossRevenue?: number | null
  occupancyPct?: number | null
  fixedCostsMonthly?: number | null
  variableCostsPct?: number | null
  commissionPct?: number | null
  cleaningPerTurnover?: number | null
  turnoversPerMonth?: number | null
  channelMix?: Record<string, number> | null
  minStayNights?: number | null
  highSeasonMinStayNights?: number | null
  highSeasonMonths?: string[] | null
  dynamicPricingEnabled?: boolean | null
  monthlySeasonality?: Record<string, number> | null
}

export interface PropertyIntelligenceInput {
  companyInfo?: {
    name?: string | null
  } | null
  lead?: PropertyLeadInput | null
  property?: PropertyInput | null
  ownerContext?: OwnerContextInput | null
  readingObjectives?: ReadingObjective[] | null
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
  marketTier?: MarketTier | null
  monthlyGrossRevenue: number
  monthlyNetReturn?: number | null
  channelMix?: Record<string, number> | null
  occupancyPct?: number | null
  adr?: number | null
  seasonalityTag?: string | null
  isInternalBenchmark?: boolean | null
  note?: string | null
  source?: string | null
  observedAt?: string | null
}

export interface NormalizedProperty {
  location: string
  propertyType: string
  typology: string
  areaM2: number
  bedrooms: number
  market: MarketTier
  condition: ConditionTier
  furnished: boolean
  balcony: boolean
  pool: boolean
  garage: boolean
  highlights: string
  listingUrl: string
}

export interface NormalizedAssumptions {
  currency: string
  longStay: StayAssumptionsInput
  midStay: StayAssumptionsInput
  shortStay: StayAssumptionsInput
}

export interface NormalizedOwnerContext {
  flexibility: OwnerFlexibilityLevel | null
  operatingModel: OwnerOperatingModel | null
  historicalRevenue: number | null
  rentedDays: number | null
  occupancyPct: number | null
  historicalAdr: number | null
  operationalCostsMonthly: number | null
  channelMix: Record<string, number> | null
  monthlySeasonality: Record<string, number> | null
  maintenanceNote: string
  revenuePerRentedDay: number | null
  dataQuality: ConfidenceLevel
}

export interface IntakeResult {
  blockingInputs: string[]
  estimatedFields: string[]
  completenessScore: number
  readingObjectives: ReadingObjective[]
  normalizedProperty: NormalizedProperty
  normalizedAssumptions: NormalizedAssumptions
  ownerContext: NormalizedOwnerContext
  lead: PropertyLeadInput
}

export interface LocationSignal {
  marketTier: MarketTier
  baseRatePerM2: number
  confidence: number
  rationale: string
  provenance: Provenance
}

export type MarketSegment = 'short_mid' | 'annual'

export interface MarketRange {
  min: number
  max: number
}

export interface MarketSnapshot {
  segment: MarketSegment
  marketTier: MarketTier
  observedAt: string
  comparables: ComparableBenchmark[]
  medianGross: number
  medianNet: number
  rangeGross: MarketRange
  rangeNet: MarketRange
  confidence: ConfidenceLevel
}

export interface LodgraSignal {
  historicalRevenue: number | null
  historicalOccupancyPct: number | null
  historicalAdr: number | null
  monthlySeasonality: Record<string, number> | null
  channelMix: Record<string, number> | null
  operationalCostsMonthly: number | null
  dataQuality: ConfidenceLevel
  ownerRealityScore: number
  historicalVsMarketDelta: number | null
  operationalWeighting: number
  sourceLabel: string
}

export interface AILayerResult {
  confidence: ConfidenceLevel
  narrative: string
  recommendation: StrategyRecommendation | null
  promptVersion: string
}

export interface ComparableBenchmark {
  label: string
  stayType: StayType | 'mixed'
  marketTier: MarketTier
  monthlyGrossRevenue: number
  monthlyNetReturn: number
  channelMix?: Record<string, number> | null
  occupancyPct?: number | null
  adr?: number | null
  seasonalityTag?: string | null
  isInternalBenchmark?: boolean
  confidence: ConfidenceLevel
  provenance: Provenance
  source: string
  observedAt: string
  note: string
}

export interface CostBreakdown {
  fixedMonthlyCosts: number
  channelMonthlyCosts: number
  variableMonthlyCosts: number
  commissionMonthlyCosts: number
  cleaningMonthlyCosts: number
  afterChannelRevenue: number
  totalMonthlyCosts: number
}

export interface ScenarioResult {
  label: ScenarioLabel
  grossMonthlyRevenue: number
  effectiveMonthlyRevenue: number
  afterChannelRevenue: number
  occupancyPct: number
  costs: CostBreakdown
  netMonthlyReturn: number
  ownerNetReturn: number
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
  marketSnapshot: Record<MarketSegment, MarketSnapshot> | null
  lodgraSignal: LodgraSignal | null
  analysisLayers: {
    market: Record<MarketSegment, MarketSnapshot> | null
    lodgra: LodgraSignal | null
    ai: AILayerResult | null
  }
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
