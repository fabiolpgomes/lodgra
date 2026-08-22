import { buildMarkdownReport, runPropertyIntelligenceAnalysis } from '@/lib/property-intelligence'

describe('property intelligence MVP', () => {
  it('runs a deterministic analysis for a complete input', () => {
    const result = runPropertyIntelligenceAnalysis({
      lead: {
        name: 'Ana Silva',
        source: 'WhatsApp',
      },
      property: {
        location: 'Faro, Algarve',
        typology: 'T2',
        areaM2: 82,
        bedrooms: 2,
        market: 'coastal',
        condition: 'good',
        furnished: true,
      },
      assumptions: {
        currency: 'EUR',
        longStay: {
          occupancyPct: 0.96,
        },
        midStay: {
          occupancyPct: 0.87,
        },
        shortStay: {
          occupancyPct: 0.74,
          cleaningPerTurnover: 50,
          turnoversPerMonth: 7,
        },
      },
    })

    expect(result.status).toBe('ready')
    expect(result.blockedInputs).toHaveLength(0)
    expect(result.location?.marketTier).toBe('coastal')
    expect(result.models?.['short-stay'].scenarios.find(scenario => scenario.label === 'base')?.netMonthlyReturn).toBeGreaterThan(0)
    expect(result.strategy?.recommendedStayType).toBeDefined()

    const report = buildMarkdownReport(result)
    expect(report).toContain('# Property Intelligence Analysis')
    expect(report).toContain('Faro, Algarve')
    expect(report).toContain('short-stay')
  })

  it('surfaces missing blockers without inventing a result', () => {
    const result = runPropertyIntelligenceAnalysis({
      property: {
        typology: null,
        location: null,
      },
    })

    expect(result.status).toBe('needs_input')
    expect(result.blockedInputs).toEqual(expect.arrayContaining(['property.location', 'property.typology']))
    expect(result.models).toBeNull()
    expect(result.strategy).toBeNull()
  })
})

