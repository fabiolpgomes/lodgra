import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'
import { NextResponse } from 'next/server'

const requireRole = jest.fn<(...args: unknown[]) => Promise<unknown>>()
const getTenantReportCompany = jest.fn<(...args: unknown[]) => Promise<unknown>>()

jest.mock('server-only', () => ({}))
jest.mock('@/lib/auth/requireRole', () => ({
  requireRole: (...args: unknown[]) => requireRole(...args),
}))
jest.mock('@/lib/property-intelligence/company.server', () => ({
  getTenantReportCompany: (...args: unknown[]) => getTenantReportCompany(...args),
}))

import { POST } from '@/app/api/property-intelligence/analyze/route'

const TENANT_COMPANIES: Record<string, Record<string, string | null>> = {
  'org-a': {
    name: 'Casas do Sul',
    websiteUrl: 'www.casasdosul.example',
    email: 'ola@casasdosul.example',
    phone: '+351 900 000 001',
    whatsappNumber: null,
  },
  'org-b': {
    name: 'Vista Mar Rentals',
    websiteUrl: null,
    email: null,
    phone: null,
    whatsappNumber: '+55 11 90000-0003',
  },
}

function asSession(organizationId: string | undefined) {
  requireRole.mockResolvedValue({
    authorized: true,
    userId: 'user-1',
    role: 'admin',
    accessAllProperties: true,
    organizationId,
  })
}

function post(body: unknown) {
  return POST(
    new Request('http://localhost/api/property-intelligence/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }) as never
  )
}

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

  beforeEach(() => {
    requireRole.mockReset()
    getTenantReportCompany.mockReset()
    getTenantReportCompany.mockImplementation(async (orgId: unknown) => TENANT_COMPANIES[String(orgId)] ?? {})
    asSession('org-a')
  })

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
    expect(payload.markdown).toContain('## Resumo Executivo')
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

  it('builds the report header from the session tenant, not from the payload', async () => {
    asSession('org-a')
    const a = (await (await post({
      ...completeInput,
      companyInfo: { name: 'Nome Forjado pelo Cliente' },
    })).json()) as { markdown: string }

    asSession('org-b')
    const b = (await (await post(completeInput)).json()) as { markdown: string }

    expect(getTenantReportCompany).toHaveBeenNthCalledWith(1, 'org-a')
    expect(getTenantReportCompany).toHaveBeenNthCalledWith(2, 'org-b')

    expect(a.markdown.split('\n')[0]).toBe(
      'Empresa: Casas do Sul · Site: www.casasdosul.example · Email: ola@casasdosul.example · Telefone: +351 900 000 001'
    )
    expect(a.markdown).not.toContain('Nome Forjado')
    expect(b.markdown.split('\n')[0]).toBe('Empresa: Vista Mar Rentals · WhatsApp: +55 11 90000-0003')

    for (const markdown of [a.markdown, b.markdown]) {
      expect(markdown).not.toContain('algarvehomestay')
      expect(markdown).not.toContain('ahspropriedades')
      expect(markdown).not.toContain('912647423')
    }
    expect(b.markdown).not.toContain('casasdosul')
  })

  it('shows no contact lines for a tenant without public profile', async () => {
    asSession('org-sem-perfil')
    const payload = (await (await post(completeInput)).json()) as { markdown: string }

    expect(payload.markdown.split('\n')[0]).toBe('Empresa: Lodgra Site')
    expect(payload.markdown).not.toMatch(/Site:|Email:|Telefone:|WhatsApp:/)
  })

  it('rejects unauthenticated requests', async () => {
    requireRole.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }),
    })

    const response = await post(completeInput)
    expect(response.status).toBe(401)
    expect(getTenantReportCompany).not.toHaveBeenCalled()
  })

  it('rejects a session without organization', async () => {
    asSession(undefined)

    const response = await post(completeInput)
    expect(response.status).toBe(403)
    const payload = (await response.json()) as { error: { category: string } }
    expect(payload.error.category).toBe('organization_required')
    expect(getTenantReportCompany).not.toHaveBeenCalled()
  })
})

