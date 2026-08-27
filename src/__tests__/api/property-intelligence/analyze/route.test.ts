import { afterEach, describe, expect, it } from '@jest/globals'

import { POST } from '@/app/api/property-intelligence/analyze/route'

const completeInput = {
  lead: {
    name: 'Ana Silva',
    source: 'WhatsApp',
    note: 'Pedido para avaliar potencial de exploração.',
  },
  property: {
    location: 'Faro, Algarve',
    propertyType: 'Apartamento',
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
      fixedCostsMonthly: 180,
      variableCostsPct: 0.05,
      commissionPct: 0.08,
    },
    midStay: {
      occupancyPct: 0.87,
      fixedCostsMonthly: 220,
      variableCostsPct: 0.06,
      commissionPct: 0.12,
    },
    shortStay: {
      occupancyPct: 0.74,
      fixedCostsMonthly: 320,
      variableCostsPct: 0.12,
      commissionPct: 0.18,
      cleaningPerTurnover: 50,
      turnoversPerMonth: 7,
    },
  },
}

describe('property intelligence analyze api', () => {
  const originalGate = process.env.PROPERTY_INTELLIGENCE_ANALYSIS_ENABLED

  afterEach(() => {
    if (originalGate === undefined) {
      delete process.env.PROPERTY_INTELLIGENCE_ANALYSIS_ENABLED
      return
    }

    process.env.PROPERTY_INTELLIGENCE_ANALYSIS_ENABLED = originalGate
  })

  it('returns a structured analysis payload for valid input', async () => {
    const response = await POST(
      new Request('http://localhost/api/property-intelligence/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(completeInput),
      }) as Request
    )

    expect(response.status).toBe(200)

    const payload = (await response.json()) as {
      traceId: string
      result: { status: string; telemetry: { events: Array<{ name: string }> } }
      markdown: string
    }

    expect(payload.traceId).toBeTruthy()
    expect(payload.result.status).toBe('ready')
    expect(payload.result.telemetry.events.map(event => event.name)).toEqual(
      expect.arrayContaining(['analysis.start', 'analysis.end', 'analysis.publish_approval'])
    )
    expect(payload.markdown).toContain('# Dossiê Executivo de Property Intelligence')
  })

  it('rejects execution when the feature gate is disabled', async () => {
    process.env.PROPERTY_INTELLIGENCE_ANALYSIS_ENABLED = 'false'

    const response = await POST(
      new Request('http://localhost/api/property-intelligence/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(completeInput),
      }) as Request
    )

    expect(response.status).toBe(503)

    const payload = (await response.json()) as {
      error: { category: string; traceId: string; message: string }
    }

    expect(payload.error.category).toBe('feature_disabled')
    expect(payload.error.traceId).toBeTruthy()
    expect(payload.error.message).toContain('disabled')
  })
})
