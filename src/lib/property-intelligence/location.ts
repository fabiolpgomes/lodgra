import type { LocationSignal, MarketTier, NormalizedProperty } from './types'

const MARKET_BASE_RATE: Record<MarketTier, number> = {
  coastal: 12.5,
  urban: 14.5,
  suburban: 10,
  rural: 7.5,
}

const LOCATION_HINTS: Array<{
  pattern: RegExp
  marketTier: MarketTier
  rationale: string
  confidence: number
}> = [
  {
    pattern: /(algarve|faro|lagos|lagoa|albufeira|loul[eé]|portim[aã]o|tavira|vila real de santo ant[oó]nio)/i,
    marketTier: 'coastal',
    rationale: 'A correspondência por palavra-chave indica um mercado costeiro ou orientado ao lazer.',
    confidence: 0.9,
  },
  {
    pattern: /(lisboa|porto|cascais|oeiras|gaia|braga)/i,
    marketTier: 'urban',
    rationale: 'A correspondência por palavra-chave indica um mercado urbano ou metropolitano.',
    confidence: 0.9,
  },
  {
    pattern: /(sintra|set[uú]bal|coimbra|aveiro|funchal)/i,
    marketTier: 'suburban',
    rationale: 'A correspondência por palavra-chave indica um mercado misto ou suburbano.',
    confidence: 0.8,
  },
]

export function deriveLocationSignal(property: NormalizedProperty): LocationSignal {
  const match = LOCATION_HINTS.find(hint => hint.pattern.test(property.location))
  const marketTier = match?.marketTier ?? property.market
  const baseRatePerM2 = MARKET_BASE_RATE[marketTier]
  const confidence = match?.confidence ?? 0.65

  const rationale = match
    ? match.rationale
    : `Foi usado o perfil de propriedade informado para assumir o mercado ${marketTier}.`

  return {
    marketTier,
    baseRatePerM2,
    confidence,
    rationale,
    provenance: match ? 'derived' : 'estimated',
  }
}
