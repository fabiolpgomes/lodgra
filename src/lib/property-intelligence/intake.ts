import type {
  ConditionTier,
  IntakeResult,
  MarketTier,
  NormalizedOwnerContext,
  PropertyIntelligenceInput,
  PropertyLeadInput,
  NormalizedAssumptions,
  NormalizedProperty,
  OwnerFlexibilityLevel,
  OwnerOperatingModel,
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

  return ''
}

function normalizeFlexibility(value: unknown): OwnerFlexibilityLevel | null {
  if (value === 'high' || value === 'medium' || value === 'low') {
    return value
  }

  return null
}

function normalizeOperatingModel(value: unknown): OwnerOperatingModel | null {
  if (value === 'short_mid' || value === 'mixed' || value === 'long') {
    return value
  }

  return null
}

function toOptionalNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function normalizeIntake(input: PropertyIntelligenceInput): IntakeResult {
  const lead: PropertyLeadInput = input.lead ?? {}
  const property = input.property ?? {}
  const ownerContext = input.ownerContext ?? {}
  const assumptions = input.assumptions ?? {}

  const location = typeof property.location === 'string' ? property.location.trim() : ''
  const propertyType = typeof property.propertyType === 'string' ? property.propertyType.trim() : ''
  const typology = typeof property.typology === 'string' ? property.typology.trim() : ''
  const blockingInputs: string[] = []

  const estimatedFields: string[] = []

  if (!location) {
    estimatedFields.push('property.location')
  }

  if (!propertyType) {
    estimatedFields.push('property.propertyType')
  }

  if (!typology) {
    estimatedFields.push('property.typology')
  }

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
    propertyType,
    typology,
    areaM2: toNumber(areaM2, DEFAULT_AREA),
    bedrooms: Math.max(0, toNumber(bedrooms, DEFAULT_BEDROOMS)),
    market: normalizeMarket(property.market, location),
    condition: normalizeCondition(property.condition),
    furnished: toBoolean(property.furnished, false),
    balcony: toBoolean(property.balcony, false),
    pool: toBoolean(property.pool, false),
    garage: toBoolean(property.garage, false),
    highlights: typeof property.highlights === 'string' ? property.highlights.trim() : '',
    listingUrl: typeof property.listingUrl === 'string' ? property.listingUrl.trim() : '',
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

  const historicalRevenue = toOptionalNumber(ownerContext.historicalRevenue)
  const rentedDays = toOptionalNumber(ownerContext.rentedDays)
  const normalizedOwnerContext: NormalizedOwnerContext = {
    flexibility: normalizeFlexibility(ownerContext.flexibility),
    operatingModel: normalizeOperatingModel(ownerContext.operatingModel),
    historicalRevenue,
    rentedDays,
    maintenanceNote: typeof ownerContext.maintenanceNote === 'string' ? ownerContext.maintenanceNote.trim() : '',
    revenuePerRentedDay:
      historicalRevenue != null && rentedDays != null && rentedDays > 0
        ? Math.round((historicalRevenue / rentedDays) * 100) / 100
        : null,
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
    ownerContext: normalizedOwnerContext,
    lead,
  }
}
