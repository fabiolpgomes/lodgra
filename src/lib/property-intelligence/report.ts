import type { ComparableBenchmark, PropertyIntelligenceResult, StayModelResult } from './types'

function formatMoney(value: number, currency?: string): string {
  if (!currency) {
    return value.toFixed(2)
  }

  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`
}

function renderModelTable(models: StayModelResult[], currency: string): string {
  const rows = models
    .map(model => {
      const baseScenario = model.scenarios.find(scenario => scenario.label === 'base')
      const conservative = model.scenarios.find(scenario => scenario.label === 'conservative')
      const optimized = model.scenarios.find(scenario => scenario.label === 'optimized')

      return `| ${model.stayType} | ${formatMoney(conservative?.netMonthlyReturn ?? 0, currency)} | ${formatMoney(baseScenario?.netMonthlyReturn ?? 0, currency)} | ${formatMoney(optimized?.netMonthlyReturn ?? 0, currency)} | ${model.scenarioConfidence} |`
    })
    .join('\n')

  return [
    '| Stay type | Conservative net | Base net | Optimized net | Confidence |',
    '| --- | ---: | ---: | ---: | --- |',
    rows,
  ].join('\n')
}

function renderComparablesTable(comparables: ComparableBenchmark[], currency: string): string {
  const rows = comparables
    .map(comparable => {
      return `| ${comparable.label} | ${comparable.stayType} | ${formatMoney(comparable.monthlyGrossRevenue, currency)} | ${formatMoney(comparable.monthlyNetReturn, currency)} | ${comparable.provenance} | ${comparable.confidence} |`
    })
    .join('\n')

  return [
    '| Comparable | Type | Gross revenue | Net return | Provenance | Confidence |',
    '| --- | --- | ---: | ---: | --- | --- |',
    rows,
  ].join('\n')
}

export function buildMarkdownReport(result: PropertyIntelligenceResult): string {
  const currency = result.intake.normalizedAssumptions.currency
  const models = result.models ? Object.values(result.models) : []
  const lines: string[] = []

  lines.push('# Property Intelligence Analysis')
  lines.push('')
  lines.push(`- Trace ID: \`${result.traceId}\``)
  lines.push(`- Formula version: \`${result.formulaVersion}\``)
  lines.push(`- Status: \`${result.status}\``)
  lines.push(`- Started at: ${result.startedAt}`)
  lines.push(`- Finished at: ${result.finishedAt}`)
  lines.push(`- Duration: ${result.durationMs} ms`)
  lines.push(`- Currency: ${currency || 'unavailable'}`)
  lines.push(`- Publish approval: ${result.publication.approved ? 'approved' : 'pending'}`)
  lines.push('')
  lines.push('## Intake')
  lines.push(`- Location: ${result.intake.normalizedProperty.location || 'missing'}`)
  lines.push(`- Typology: ${result.intake.normalizedProperty.typology || 'missing'}`)
  lines.push(`- Area: ${result.intake.normalizedProperty.areaM2} m2`)
  lines.push(`- Bedrooms: ${result.intake.normalizedProperty.bedrooms}`)
  lines.push(`- Market tier: ${result.intake.normalizedProperty.market}`)
  lines.push(`- Condition: ${result.intake.normalizedProperty.condition}`)
  lines.push(`- Furnished: ${result.intake.normalizedProperty.furnished ? 'yes' : 'no'}`)
  lines.push(`- Completeness: ${formatPercent(result.intake.completenessScore)}`)
  if (result.blockedInputs.length > 0) {
    lines.push(`- Blockers: ${result.blockedInputs.join(', ')}`)
  }
  if (result.intake.estimatedFields.length > 0) {
    lines.push(`- Estimated fields: ${result.intake.estimatedFields.join(', ')}`)
  }
  lines.push('')
  lines.push('## Location Signal')
  if (result.location) {
    lines.push(`- Market tier: ${result.location.marketTier}`)
    lines.push(`- Base rate per m2: ${formatMoney(result.location.baseRatePerM2, currency)}`)
    lines.push(`- Confidence: ${formatPercent(result.location.confidence)}`)
    lines.push(`- Rationale: ${result.location.rationale}`)
  } else {
    lines.push('- Location signal unavailable because required inputs are missing.')
  }
  lines.push('')
  lines.push('## Comparables')
  lines.push(renderComparablesTable(result.comparables, currency))
  lines.push('')
  lines.push('## Scenarios')
  if (models.length > 0) {
    lines.push(renderModelTable(models, currency))
  } else {
    lines.push('No deterministic scenarios were generated because the input is still blocked.')
  }
  lines.push('')
  lines.push('## Strategy')
  if (result.strategy) {
    lines.push(`- Recommended stay type: ${result.strategy.recommendedStayType}`)
    lines.push(`- Reason: ${result.strategy.reason}`)
    lines.push(`- Comparison order: ${result.strategy.comparisonOrder.join(' > ')}`)
    if (result.strategy.caveats.length > 0) {
      lines.push(`- Caveats: ${result.strategy.caveats.join(' ')}`)
    }
  } else {
    lines.push('- Strategy is unavailable until required inputs are complete.')
  }
  lines.push('')
  lines.push('## Audit')
  lines.push(`- Status: ${result.audit.status}`)
  lines.push(`- Coverage score: ${formatPercent(result.audit.coverageScore)}`)
  lines.push(`- Publish approval required: ${result.audit.publishApprovalRequired ? 'yes' : 'no'}`)
  lines.push(`- Publish approval state: ${result.audit.publishApprovalState}`)
  if (result.audit.issues.length > 0) {
    lines.push(`- Issues: ${result.audit.issues.join(' | ')}`)
  }
  lines.push('')
  lines.push('## Telemetry')
  for (const event of result.telemetry.events) {
    lines.push(`- ${event.name} @ ${event.at}`)
  }

  return lines.join('\n')
}

export function serializeJsonReport(result: PropertyIntelligenceResult): string {
  return `${JSON.stringify(result, null, 2)}`
}
