import { execFileSync } from 'node:child_process'
import { unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { buildMarkdownReport, runPropertyIntelligenceAnalysis, serializeJsonReport } from '@/lib/property-intelligence'

const completeInput = {
  lead: {
    name: 'Ana Silva',
    source: 'WhatsApp',
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
} as const

function writeSampleInput(): string {
  const inputPath = join(tmpdir(), `property-intelligence-${Date.now()}-${Math.random().toString(16).slice(2)}.json`)
  writeFileSync(inputPath, `${JSON.stringify(completeInput, null, 2)}\n`, 'utf8')
  return inputPath
}

function runCli(format: 'json' | 'markdown' | 'both', inputPath: string): string {
  return execFileSync('node', ['scripts/property-intelligence-runner.cjs', '--format', format, '--input', inputPath], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
}

describe('property intelligence MVP', () => {
  it('runs a deterministic analysis for a complete input', () => {
    const result = runPropertyIntelligenceAnalysis(completeInput)

    expect(result.status).toBe('ready')
    expect(result.blockedInputs).toHaveLength(0)
    expect(result.location?.marketTier).toBe('coastal')
    expect(result.models?.['short-stay'].scenarios.find(scenario => scenario.label === 'base')?.netMonthlyReturn).toBeGreaterThan(0)
    expect(result.strategy?.recommendedStayType).toBeDefined()

    const report = buildMarkdownReport(result)
    expect(report).toContain('# Dossiê Executivo de Property Intelligence')
    expect(report).toContain('## Identificação do Imóvel')
    expect(report).toContain('**Faro, Algarve** · T2 · 82 m² · 2 quartos · bom estado · mobilado')
    expect(report).toContain('## Resumo Executivo')
    expect(report).toContain('## Destaque da Oportunidade')
    expect(report).toContain('Direção principal')
    expect(report).toContain('## Por que não anual?')
    expect(report).toContain('## Como ler esta análise')
    expect(report).toContain('O objetivo deste dossiê é apoiar uma decisão de negócio')
    expect(report).toContain('## Insight Principal')
    expect(report).toContain('oportunidade consistente')
    expect(report).toContain('## Veredito')
    expect(report).toContain('oportunidade sólida')
    expect(report).toContain('Veredito: o imóvel mostra melhor encaixe')
    expect(report).toContain('Faro, Algarve')
    expect(report).toContain('estadia curta')
    expect(report).toContain('<div style="page-break-after: always;"></div>')
    expect(report).toContain('## Próximos Passos')
  })

  it('allows analysis to continue when the user does not know the core property details', () => {
    const result = runPropertyIntelligenceAnalysis({
      property: {
        typology: null,
        location: null,
      },
    })

    expect(result.status).toBe('ready')
    expect(result.blockedInputs).toHaveLength(0)
    expect(result.intake.estimatedFields).toEqual(expect.arrayContaining(['property.location', 'property.typology']))

    const report = buildMarkdownReport(result)
    expect(report).toContain('## Identificação do Imóvel')
    expect(report).toContain('**Não informado** · não informado · 45 m² · 1 quartos · bom estado · não mobilado')
    expect(report).toContain('## Resumo Executivo')
    expect(report).toContain('## Destaque da Oportunidade')
    expect(report).toContain('Direção principal')
    expect(report).toContain('## Por que não anual?')
    expect(report).toContain('## Como ler esta análise')
    expect(report).toContain('## Insight Principal')
    expect(report).toContain('oportunidade consistente')
    expect(report).toContain('## Veredito')
    expect(report).toContain('Veredito: o imóvel mostra melhor encaixe')
    expect(report).toContain('## Próximos Passos')
  })

  it('serializes a JSON report with the same business signals as the markdown report', () => {
    const result = runPropertyIntelligenceAnalysis(completeInput)

    const json = JSON.parse(serializeJsonReport(result)) as {
      traceId: string
      status: string
      formulaVersion: string
      comparables: Array<{ label: string; stayType: string }>
      models: Record<string, unknown>
      location: { marketTier: string }
      strategy: { recommendedStayType: string }
      audit: { status: string }
      publication: { approved: boolean }
      telemetry: { events: Array<{ name: string }> }
    }

    const markdown = buildMarkdownReport(result)

    expect(json.traceId).toBeTruthy()
    expect(json.status).toBe('ready')
    expect(json.formulaVersion).toBeDefined()
    expect(json.location.marketTier).toBe('coastal')
    expect(json.comparables).toHaveLength(3)
    expect(json.comparables.map(comparable => comparable.stayType)).toEqual(
      expect.arrayContaining(['long-stay', 'mid-stay', 'short-stay'])
    )
    expect(Object.keys(json.models)).toEqual(expect.arrayContaining(['long-stay', 'mid-stay', 'short-stay']))
    expect(json.strategy.recommendedStayType).toBe('mid-stay')
    expect(json.audit.status).toBe('pass')
    expect(json.publication.approved).toBe(false)
    expect(json.telemetry.events.map(event => event.name)).toEqual(
      expect.arrayContaining(['analysis.start', 'analysis.end', 'analysis.publish_approval'])
    )
    expect(markdown).toContain('## Como ler esta análise')
    expect(markdown).toContain('## Referências Comparáveis')
    expect(markdown).toContain('## Cenários')

    expect({
      status: json.status,
      property: {
        location: json.intake.normalizedProperty.location,
        typology: json.intake.normalizedProperty.typology,
        areaM2: json.intake.normalizedProperty.areaM2,
        bedrooms: json.intake.normalizedProperty.bedrooms,
        market: json.intake.normalizedProperty.market,
      },
      location: {
        marketTier: json.location.marketTier,
        baseRatePerM2: json.location.baseRatePerM2,
        confidence: json.location.confidence,
      },
      comparables: json.comparables.map(comparable => ({
        label: comparable.label,
        stayType: comparable.stayType,
        confidence: comparable.confidence,
        provenance: comparable.provenance,
      })),
      strategy: {
        recommendedStayType: json.strategy.recommendedStayType,
        comparisonOrder: json.strategy.comparisonOrder,
      },
      audit: {
        status: json.audit.status,
        coverageScore: json.audit.coverageScore,
        publishApprovalRequired: json.audit.publishApprovalRequired,
      },
    }).toMatchInlineSnapshot(`
      {
        "audit": {
          "coverageScore": 1,
          "publishApprovalRequired": true,
          "status": "pass",
        },
        "comparables": [
          {
            "confidence": "high",
            "label": "Referência interna de estadia longa",
            "provenance": "derived",
            "stayType": "long-stay",
          },
          {
            "confidence": "medium",
            "label": "Referência interna de estadia média",
            "provenance": "derived",
            "stayType": "mid-stay",
          },
          {
            "confidence": "medium",
            "label": "Referência interna de estadia curta",
            "provenance": "derived",
            "stayType": "short-stay",
          },
        ],
        "location": {
          "baseRatePerM2": 12.5,
          "confidence": 0.9,
          "marketTier": "coastal",
        },
        "property": {
          "areaM2": 82,
          "bedrooms": 2,
          "location": "Faro, Algarve",
          "market": "coastal",
          "typology": "T2",
        },
        "status": "ready",
        "strategy": {
          "comparisonOrder": [
            "mid-stay",
            "long-stay",
            "short-stay",
          ],
          "recommendedStayType": "mid-stay",
        },
      }
    `)
  })

  it('emits the same JSON contract through the CLI runner', () => {
    const inputPath = writeSampleInput()

    try {
      const output = runCli('json', inputPath)

      const json = JSON.parse(output) as {
        status: string
        intake: {
          normalizedProperty: {
            location: string
            typology: string
            market: string
          }
        }
        location: { marketTier: string }
        comparables: Array<{ stayType: string }>
        strategy: { recommendedStayType: string }
        audit: { status: string }
      }

      expect(json.status).toBe('ready')
      expect(json.intake.normalizedProperty.location).toBe('Faro, Algarve')
      expect(json.intake.normalizedProperty.typology).toBe('T2')
      expect(json.intake.normalizedProperty.market).toBe('coastal')
      expect(json.location.marketTier).toBe('coastal')
      expect(json.comparables.map(comparable => comparable.stayType)).toEqual(
        expect.arrayContaining(['long-stay', 'mid-stay', 'short-stay'])
      )
      expect(json.strategy.recommendedStayType).toBe('mid-stay')
      expect(json.audit.status).toBe('pass')
    } finally {
      unlinkSync(inputPath)
    }
  })

  it('emits markdown-only output through the CLI runner', () => {
    const inputPath = writeSampleInput()

    try {
      const output = runCli('markdown', inputPath)

      expect(output).toContain('# Dossiê Executivo de Property Intelligence')
      expect(output).toContain('## Identificação do Imóvel')
      expect(output).toContain('## Resumo Executivo')
      expect(output).toContain('## Como ler esta análise')
      expect(output).toContain('## Cenários')
      expect(output).not.toContain('--- JSON ---')
      expect(() => JSON.parse(output)).toThrow()
    } finally {
      unlinkSync(inputPath)
    }
  })

  it('emits combined markdown and JSON output through the CLI runner', () => {
    const inputPath = writeSampleInput()

    try {
      const output = runCli('both', inputPath)
      const [markdownPart, jsonPart] = output.split('\n\n--- JSON ---\n\n')

      expect(markdownPart).toContain('# Dossiê Executivo de Property Intelligence')
      expect(markdownPart).toContain('## Veredito')
      expect(jsonPart).toBeDefined()

      const json = JSON.parse(jsonPart) as {
        status: string
        strategy: { recommendedStayType: string }
        comparables: Array<{ stayType: string }>
      }

      expect(json.status).toBe('ready')
      expect(json.strategy.recommendedStayType).toBe('mid-stay')
      expect(json.comparables.map(comparable => comparable.stayType)).toEqual(
        expect.arrayContaining(['long-stay', 'mid-stay', 'short-stay'])
      )
    } finally {
      unlinkSync(inputPath)
    }
  })
})
