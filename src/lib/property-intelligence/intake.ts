import type {
  ConditionTier,
  IntakeResult,
  MarketTier,
  PropertyIntelligenceInput,
  PropertyLeadInput,
  NormalizedAssumptions,
  NormalizedProperty,
} from './types'

const DEFAULT_AREA = 45
const DEFAULT_BEDROOMS = 1

function toNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function toBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function normalizeMarket(market: unknown, location: string): MarketTier {
  if (market === 'coastal' || market === 'urban' || market === 'suburban' || market === 'rural') {
    return market
  }

  const text = location.toLowerCase()
  if (/(algarve|faro|lagos|lagoa|albufeira|loul[eé]|portim[aã]o|tavira|vila real de santo ant[oó]nio)/i.test(text)) {
    return 'coastal'
  }

  if (/(lisboa|porto|gaia|cascais|oeiras|braga)/i.test(text)) {
    return 'urban'
  }

  if (/(sintra|set[uú]bal|coimbra|aveiro|funchal)/i.test(text)) {
    return 'suburban'
  }

  return 'rural'
}

function normalizeCondition(condition: unknown): ConditionTier {
  if (condition === 'poor' || condition === 'fair' || condition === 'good' || condition === 'excellent') {
    return condition
  }

  return 'good'
}

function normalizeCurrency(currency: unknown): string {
  if (typeof currency === 'string' && currency.trim()) {
    return currency.trim().toUpperCase()
  }

  return 'EUR'
}

export function normalizeIntake(input: PropertyIntelligenceInput): IntakeResult {
  const lead: PropertyLeadInput = input.lead ?? {}
  const property = input.property ?? {}
  const assumptions = input.assumptions ?? {}

  const location = typeof property.location === 'string' ? property.location.trim() : ''
  const typology = typeof property.typology === 'string' ? property.typology.trim() : ''
  const blockingInputs: string[] = []

  if (!location) {
    blockingInputs.push('property.location')
  }

  if (!typology) {
    blockingInputs.push('property.typology')
  }

  const estimatedFields: string[] = []

  const areaM2 = property.areaM2 ?? DEFAULT_AREA
  if (property.areaM2 == null) {
    estimatedFields.push('property.areaM2')
  }

  const bedrooms = property.bedrooms ?? DEFAULT_BEDROOMS
  if (property.bedrooms == null) {
    estimatedFields.push('property.bedrooms')
  }

  const normalizedProperty: NormalizedProperty = {
    location,
    typology,
    areaM2: toNumber(areaM2, DEFAULT_AREA),
    bedrooms: Math.max(0, toNumber(bedrooms, DEFAULT_BEDROOMS)),
    market: normalizeMarket(property.market, location),
    condition: normalizeCondition(property.condition),
    furnished: toBoolean(property.furnished, false),
  }

  if (property.market == null) {
    estimatedFields.push('property.market')
  }

  if (property.condition == null) {
    estimatedFields.push('property.condition')
  }

  if (property.furnished == null) {
    estimatedFields.push('property.furnished')
  }

  const normalizedAssumptions: NormalizedAssumptions = {
    currency: normalizeCurrency(assumptions.currency),
    longStay: assumptions.longStay ?? {},
    midStay: assumptions.midStay ?? {},
    shortStay: assumptions.shortStay ?? {},
  }

  const completenessScore = Math.max(
    0,
    Math.min(
      1,
      1 -
        blockingInputs.length * 0.25 -
        estimatedFields.length * 0.03
    )
  )

  return {
    blockingInputs,
    estimatedFields,
    completenessScore: Math.round(completenessScore * 100) / 100,
    normalizedProperty,
    normalizedAssumptions,
    lead,
  }
}

