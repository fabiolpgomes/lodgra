import type { ComparableBenchmark, PropertyIntelligenceResult, StayModelResult } from './types'
import type { ReadingObjective } from './types'

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

function formatConfidence(value: string): string {
  if (value === 'high') {
    return 'alta'
  }

  if (value === 'medium') {
    return 'média'
  }

  if (value === 'low') {
    return 'baixa'
  }

  return value
}

function formatProvenance(value: string): string {
  if (value === 'derived') {
    return 'derivada'
  }

  if (value === 'provided') {
    return 'informada'
  }

  if (value === 'estimated') {
    return 'estimada'
  }

  return value
}

function formatObservedAt(value: string): string {
  if (!value) {
    return '—'
  }

  return value
}

function formatCondition(value: string): string {
  if (value === 'excellent') {
    return 'excelente estado'
  }

  if (value === 'good') {
    return 'bom estado'
  }

  if (value === 'fair') {
    return 'estado razoável'
  }

  if (value === 'poor') {
    return 'necessita intervenção'
  }

  return value
}

function formatMarketTier(value: string): string {
  if (value === 'coastal') {
    return 'costeiro'
  }

  if (value === 'urban') {
    return 'urbano'
  }

  if (value === 'suburban') {
    return 'periurbano'
  }

  if (value === 'rural') {
    return 'rural'
  }

  return value
}

function getPrimaryMarketTier(result: PropertyIntelligenceResult): string {
  return formatMarketTier(result.location?.marketTier ?? result.intake.normalizedProperty.market)
}

function formatStayType(stayType: string): string {
  if (stayType === 'long-stay') {
    return 'estadia longa'
  }

  if (stayType === 'mid-stay') {
    return 'estadia média'
  }

  if (stayType === 'short-stay') {
    return 'estadia curta'
  }

  if (stayType === 'mixed') {
    return 'estadia mista'
  }

  return 'estadia'
}

function formatScenarioFamilyLabel(stayType: string): string {
  if (stayType === 'long-stay') {
    return 'locação anual'
  }

  if (stayType === 'mid-stay') {
    return 'locação de média duração'
  }

  if (stayType === 'short-stay') {
    return 'locação de curta duração'
  }

  return 'locação'
}

function formatReadingObjective(objective: ReadingObjective): string {
  if (objective === 'viability') {
    return 'Viabilidade'
  }

  if (objective === 'executive_report') {
    return 'Relatório executivo'
  }

  if (objective === 'compare_scenarios') {
    return 'Comparar cenários'
  }

  return objective
}

function formatMoneyWithSigned(value: number, currency: string): string {
  const formatted = formatMoney(Math.abs(value), currency)
  return value < 0 ? `-${formatted}` : formatted
}

function getBaseScenario(model?: StayModelResult) {
  return model?.scenarios.find(scenario => scenario.label === 'base')
}

function parseObservedAt(value: string): number {
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function sortComparablesForDisplay(comparables: ComparableBenchmark[]): ComparableBenchmark[] {
  return [...comparables].sort((left, right) => {
    const dateDiff = parseObservedAt(right.observedAt) - parseObservedAt(left.observedAt)
    if (dateDiff !== 0) {
      return dateDiff
    }

    return right.monthlyNetReturn - left.monthlyNetReturn
  })
}

function renderDocumentHeader(): string[] {
  return [
    'Lodgra Site: www.algarvehomestay.pt · Email: ahspropriedades@gmail.com · Telefone: +351912647423 · WhatsApp: +351912647423',
    '',
  ]
}

function renderExecutiveSummary(result: PropertyIntelligenceResult, currency: string): string[] {
  const lines: string[] = []

  lines.push('## Resumo Executivo')

  if (result.status === 'needs_input') {
    lines.push('- A análise ainda está em triagem e aguarda os dados críticos em falta.')
    lines.push('- Assim que a entrada for completada, o dossiê ganha leitura executiva, cenários e recomendação.')
    return lines
  }

  const selectedObjectives = result.intake.readingObjectives.map(formatReadingObjective).join(', ')
  const recommendedStayType = result.strategy?.recommendedStayType ?? 'long-stay'
  const recommendedFamily = formatScenarioFamilyLabel(recommendedStayType)

  lines.push(`- Objetivos selecionados: ${selectedObjectives}.`)
  lines.push(`- Direção principal: ${recommendedFamily} como leitura mais coerente para a operação.`)
  lines.push('- O dossiê consolida viabilidade, posicionamento comercial e comparação de cenários no mesmo documento.')
  lines.push('- A leitura separa mercado, inteligência Lodgra/AHS e IA para deixar a tese clara em três camadas.')
  lines.push('- A leitura separa claramente curta/média duração e locação anual para acelerar a decisão sem ruído.')
  if (
    result.intake.ownerContext.historicalRevenue != null ||
    result.intake.ownerContext.rentedDays != null
  ) {
    const revenue = result.intake.ownerContext.historicalRevenue
    const rentedDays = result.intake.ownerContext.rentedDays
    lines.push(
      `- Histórico informado: ${revenue != null ? formatMoney(revenue, currency) : 'sem faturamento informado'} e ${rentedDays != null ? `${rentedDays} dias alugados` : 'dias alugados não informados'}.`
    )
  }

  return lines
}

function renderMarketLayer(result: PropertyIntelligenceResult, currency: string): string[] {
  const lines: string[] = []

  lines.push('## Mercado')

  if (result.status === 'needs_input' || !result.marketSnapshot) {
    lines.push('- Sem mercado consolidado porque a entrada ainda está em triagem.')
    return lines
  }

  const shortMid = result.marketSnapshot.short_mid
  const annual = result.marketSnapshot.annual

  lines.push(
    `- Short + mid stay: ${shortMid.comparables.length} comparáveis, mediana bruta de ${formatMoney(shortMid.medianGross, currency)} e mediana líquida de ${formatMoney(shortMid.medianNet, currency)}.`
  )
  lines.push(
    `- Anual: ${annual.comparables.length} comparáveis, mediana bruta de ${formatMoney(annual.medianGross, currency)} e mediana líquida de ${formatMoney(annual.medianNet, currency)}.`
  )
  lines.push(`- Mercado predominante da leitura: ${formatMarketTier(shortMid.marketTier)}.`)
  lines.push(
    `- Confiança do sinal de mercado: ${formatConfidence(shortMid.confidence)} em curta/média duração e ${formatConfidence(annual.confidence)} em anual.`
  )
  lines.push(`- Janela observada: ${shortMid.observedAt || annual.observedAt || 'sem data consolidada'}.`)
  lines.push('- Fontes da camada de mercado: Airbnb, Booking, VRBO, Flatio, Hostwise, Idealista, Imovirtual, Casa Sapo e OLX Portugal conforme o cenário.')
  lines.push(
    `- Faixa short + mid: ${formatMoney(shortMid.rangeGross.min, currency)} a ${formatMoney(shortMid.rangeGross.max, currency)} bruto e ${formatMoney(shortMid.rangeNet.min, currency)} a ${formatMoney(shortMid.rangeNet.max, currency)} líquido.`
  )
  lines.push(
    `- Faixa anual: ${formatMoney(annual.rangeGross.min, currency)} a ${formatMoney(annual.rangeGross.max, currency)} bruto e ${formatMoney(annual.rangeNet.min, currency)} a ${formatMoney(annual.rangeNet.max, currency)} líquido.`
  )

  return lines
}

function renderLodgraLayer(result: PropertyIntelligenceResult, currency: string): string[] {
  const lines: string[] = []

  lines.push('## Inteligência Lodgra/AHS')

  if (result.status === 'needs_input' || !result.lodgraSignal) {
    lines.push('- Ainda não existe sinal Lodgra/AHS consolidado porque faltam dados críticos.')
    return lines
  }

  const signal = result.lodgraSignal

  lines.push(
    `- Leitura do histórico: ${signal.historicalRevenue != null ? formatMoney(signal.historicalRevenue, currency) : 'sem faturamento histórico explícito'}.`
  )
  lines.push(`- Ocupação histórica: ${signal.historicalOccupancyPct != null ? formatPercent(signal.historicalOccupancyPct) : 'não informada'}.`)
  lines.push(`- ADR histórico: ${signal.historicalAdr != null ? formatMoney(signal.historicalAdr, currency) : 'não informado'}.`)
  lines.push(
    `- Custos operacionais mensais: ${signal.operationalCostsMonthly != null ? formatMoney(signal.operationalCostsMonthly, currency) : 'não informados'}.`
  )
  lines.push(
    `- Mistura de canais: ${signal.channelMix ? Object.entries(signal.channelMix).map(([channel, share]) => `${channel}:${Math.round(share * 100)}%`).join(', ') : 'não informada'}.`
  )
  lines.push(
    `- Sazonalidade mensal: ${signal.monthlySeasonality ? Object.entries(signal.monthlySeasonality).map(([month, factor]) => `${month}:${factor.toFixed(2)}`).join(', ') : 'não informada'}.`
  )
  lines.push(`- Qualidade do sinal: ${formatConfidence(signal.dataQuality)}.`)
  lines.push(`- Score de realidade do proprietário: ${signal.ownerRealityScore.toFixed(2)}.`)
  lines.push(`- Delta histórico vs mercado: ${signal.historicalVsMarketDelta != null ? formatMoneyWithSigned(signal.historicalVsMarketDelta, currency) : 'sem base para comparação'}.`)
  lines.push(`- Peso operacional da leitura: ${signal.operationalWeighting.toFixed(2)}.`)
  lines.push(`- Origem do sinal: ${signal.sourceLabel}.`)

  return lines
}

function renderAiLayer(result: PropertyIntelligenceResult): string[] {
  const lines: string[] = []

  lines.push('## IA')

  if (result.status === 'needs_input' || !result.analysisLayers.ai) {
    lines.push('- A camada de IA ainda não fechou recomendação porque faltam dados críticos.')
    return lines
  }

  const ai = result.analysisLayers.ai

  lines.push(`- Confiança da camada: ${formatConfidence(ai.confidence)}.`)
  lines.push(`- Narrativa: ${ai.narrative}`)
  if (ai.recommendation) {
    lines.push(`- Recomendação final: ${formatScenarioFamilyLabel(ai.recommendation.recommendedStayType)}.`)
    lines.push(`- Ordem da leitura: ${ai.recommendation.comparisonOrder.map(formatStayType).join(' > ')}.`)
  }

  return lines
}

function renderScenarioFinancialSummary(result: PropertyIntelligenceResult, currency: string): string[] {
  if (result.status === 'needs_input') {
    return []
  }

  const recommendedStayType = result.strategy?.recommendedStayType ?? 'long-stay'
  const baseScenario = result.models?.[recommendedStayType]?.scenarios.find(scenario => scenario.label === 'base')
  if (!baseScenario) {
    return []
  }

  return [
    `- Receita bruta: ${formatMoney(baseScenario.grossMonthlyRevenue, currency)} por mês.`,
    `- Receita após canais: ${formatMoney(baseScenario.afterChannelRevenue, currency)} por mês.`,
    `- Líquido do proprietário: ${formatMoney(baseScenario.ownerNetReturn, currency)} por mês (${formatMoney(baseScenario.annualNetReturn, currency)} por ano).`,
    `- Custos totais estimados: ${formatMoney(baseScenario.costs.totalMonthlyCosts, currency)} por mês.`,
  ]
}

function renderShortMidScenario(result: PropertyIntelligenceResult, currency: string): string[] {
  const lines: string[] = []

  lines.push('## Cenário 1 - Locação de curta e média duração')

  if (result.status === 'needs_input') {
    lines.push('- A resposta ainda depende dos dados críticos em falta.')
    return lines
  }

  const shortModel = result.models?.['short-stay']
  const midModel = result.models?.['mid-stay']
  const shortBase = getBaseScenario(shortModel)
  const midBase = getBaseScenario(midModel)
  const recommendedStayType = result.strategy?.recommendedStayType ?? 'long-stay'
  const recommendedFamily = formatScenarioFamilyLabel(recommendedStayType)
  const shortNet = shortBase?.netMonthlyReturn ?? 0
  const midNet = midBase?.netMonthlyReturn ?? 0
  const shortAnnual = shortBase?.annualNetReturn ?? 0
  const midAnnual = midBase?.annualNetReturn ?? 0
  const marketLabel = getPrimaryMarketTier(result)

  lines.push(`- Curta duração base: ${formatMoney(shortNet, currency)} por mês (${formatMoney(shortAnnual, currency)} por ano).`)
  lines.push(`- Curta duração pós-canais: ${formatMoney(shortBase?.afterChannelRevenue ?? 0, currency)} por mês.`)
  lines.push(`- Média duração base: ${formatMoney(midNet, currency)} por mês (${formatMoney(midAnnual, currency)} por ano).`)
  lines.push(`- Média duração pós-canais: ${formatMoney(midBase?.afterChannelRevenue ?? 0, currency)} por mês.`)
  lines.push(`- Direção comercial atual: ${recommendedFamily}.`)
  lines.push(`- Zona-base observada nesta leitura: ${marketLabel}.`)
  lines.push('- Este bloco privilegia Airbnb, Booking, VRBO, Flatio e Hostwise como fontes de leitura para a operação.')
  lines.push('- A comissão média de OTA é tratada como cerca de 18% sobre a receita bruta anunciada, antes dos custos operacionais internos.')
  lines.push('- O contexto do proprietário continua relevante: uso flexível, manutenção preventiva e rotação comercial pesam a favor deste cenário.')

  return lines
}

function renderAnnualScenario(result: PropertyIntelligenceResult, currency: string): string[] {
  const lines: string[] = []

  lines.push('## Cenário 2 - Locação anual')
  if (result.status === 'needs_input') {
    const missingInputs = result.blockedInputs.length > 0 ? result.blockedInputs.join(', ') : 'required inputs'
    lines.push(`- Ainda falta ${missingInputs} para fechar a leitura com segurança.`)
    lines.push('- Assim que essa informação entrar, o relatório entrega a leitura anual com mais precisão.')
    return lines
  }

  const annualModel = result.models?.['long-stay']
  const annualBase = getBaseScenario(annualModel)
  const annualNetReturn = annualBase?.netMonthlyReturn ?? 0
  const annualNetYear = annualBase?.annualNetReturn ?? 0
  const confidence = annualModel?.scenarioConfidence ?? 'medium'
  const marketLabel = getPrimaryMarketTier(result)

  lines.push(`- Direção recomendada: ${formatScenarioFamilyLabel('long-stay')}.`)
  lines.push(`- Retorno líquido base estimado: ${formatMoney(annualNetReturn, currency)} por mês (${formatMoney(annualNetYear, currency)} por ano).`)
  lines.push(`- Receita após canais: ${formatMoney(annualBase?.afterChannelRevenue ?? 0, currency)} por mês.`)
  lines.push(`- Confiança da leitura: ${formatConfidence(confidence)}.`)
  lines.push(`- Zona-base observada nesta leitura: ${marketLabel}.`)
  lines.push('- Este bloco privilegia Idealista, Imovirtual, Casa Sapo e OLX Portugal como fontes de leitura para renda recorrente.')
  lines.push('- O anual tende a ser mais coerente quando a prioridade é previsibilidade, menor rotação e menor fricção operacional.')
  lines.push('- A decisão final continua dependente do equilíbrio entre retorno, risco operacional e uso próprio.')

  return lines
}

function renderReadingGuide(): string[] {
  return [
    '## Como ler esta análise',
    '- O objetivo deste dossiê é apoiar uma decisão de negócio com leitura executiva, não apenas mostrar números.',
    '- A leitura combina localização, tipologia, estado do ativo, contexto do proprietário e evidência de mercado recente.',
    '- O documento separa curta/média duração e anual para que os dois caminhos fiquem comparáveis na mesma peça.',
    '- As referências comparáveis servem para validar cada cenário e ancorar a narrativa na realidade atual do mercado.',
    '- O cenário base representa a leitura principal dentro de cada família; conservador e otimizado calibram risco e margem.',
    '- A confiança mostra o grau de segurança da leitura em cada linha de exploração.',
    '- A estratégia final privilegia o regime que melhor equilibra retorno, flexibilidade, preservação do ativo e facilidade comercial.',
    '- A validação indica se a análise já está pronta para conversa comercial ou se ainda precisa de algum dado crítico.',
  ]
}

function renderPropertyIdentity(result: PropertyIntelligenceResult): string[] {
  const property = result.intake.normalizedProperty
  const leadName = result.intake.lead?.name?.trim()
  const leadSource = result.intake.lead?.source?.trim()
  const amenities = [
    property.furnished ? 'mobilado' : null,
    property.balcony ? 'varanda' : null,
    property.pool ? 'piscina' : null,
    property.garage ? 'garagem' : null,
  ].filter(Boolean)

  return [
    '## Identificação do Imóvel',
    leadName ? `**${leadName}**` : '',
    `**${property.location || 'Não informado'}** · ${property.typology || 'não informado'} · ${property.areaM2} m² · ${property.bedrooms} quartos · ${formatCondition(property.condition)} · ${property.furnished ? 'mobilado' : 'não mobilado'}`,
    property.propertyType ? `- Tipo do imóvel: ${property.propertyType}` : '',
    amenities.length > 0 ? `- Destaques rápidos: ${amenities.join(', ')}` : '',
    property.highlights ? `- Comodidades a destacar: ${property.highlights}` : '',
    property.listingUrl ? `- URL do anúncio: ${property.listingUrl}` : '',
    leadSource ? `- Origem da avaliação: ${leadSource}` : '',
  ]
    .filter(Boolean)
}

function renderOwnerContext(result: PropertyIntelligenceResult): string[] {
  const ownerContext = result.intake.ownerContext
  const lines: string[] = []

  lines.push('## Contexto do Proprietário')

  if (
    ownerContext.flexibility == null &&
    ownerContext.operatingModel == null &&
    ownerContext.historicalRevenue == null &&
    ownerContext.rentedDays == null &&
    !ownerContext.maintenanceNote
  ) {
    lines.push('- Sem contexto adicional informado pelo proprietário.')
    lines.push('- A análise segue a leitura financeira base, sem ponderar uso pessoal, histórico ou manutenção adicional.')
    return lines
  }

  const flexibilityLabel =
    ownerContext.flexibility === 'high'
      ? 'alta'
      : ownerContext.flexibility === 'medium'
        ? 'média'
        : ownerContext.flexibility === 'low'
          ? 'baixa'
          : 'não informada'

  const operatingModelLabel =
    ownerContext.operatingModel === 'short_mid'
      ? 'curta e média duração'
      : ownerContext.operatingModel === 'mixed'
        ? 'mista'
        : ownerContext.operatingModel === 'long'
          ? 'longa duração'
          : 'não informada'

  lines.push(`- Flexibilidade de uso: ${flexibilityLabel}.`)
  lines.push(`- Modelo real de exploração: ${operatingModelLabel}.`)

  if (ownerContext.historicalRevenue != null || ownerContext.rentedDays != null) {
    const revenue = ownerContext.historicalRevenue ?? 0
    const days = ownerContext.rentedDays ?? 0
    const perDay =
      ownerContext.revenuePerRentedDay != null
        ? `${ownerContext.revenuePerRentedDay.toFixed(2)} € por dia alugado`
        : 'não calculado'
    lines.push(
      `- Histórico operacional: ${revenue > 0 ? `${revenue.toFixed(2)} € faturados` : 'receita não informada'} e ${days > 0 ? `${days} dias alugados` : 'dias alugados não informados'}.`
    )
    lines.push(`- Receita média por dia alugado: ${perDay}.`)
  }

  if (ownerContext.maintenanceNote) {
    lines.push(`- Manutenção / operação: ${ownerContext.maintenanceNote}`)
  }

  lines.push('- A leitura deve ponderar uso pessoal, manutenção preventiva e o custo de saída de contratos longos, porque esses fatores mudam a decisão final.')

  return lines
}

function renderVerdict(result: PropertyIntelligenceResult): string {
  if (result.status === 'needs_input') {
    return 'Veredito: a oportunidade ainda está em preparação e aguarda o dado crítico em falta.'
  }

  const recommendedStayType = result.strategy?.recommendedStayType ?? 'long-stay'
  const baseScenario = result.models?.[recommendedStayType]?.scenarios.find(scenario => scenario.label === 'base')
  const monthlyNetReturn = baseScenario?.netMonthlyReturn ?? 0
  const currency = result.intake.normalizedAssumptions.currency

  return `Veredito: o imóvel mostra melhor encaixe em ${formatStayType(recommendedStayType)}, com retorno líquido base de ${formatMoney(monthlyNetReturn, currency)} por mês e narrativa comercial coerente com a leitura de mercado.`
}

function renderInsight(result: PropertyIntelligenceResult): string[] {
  const lines: string[] = []
  lines.push('## Insight Principal')

  if (result.status === 'needs_input') {
    lines.push('- O potencial já é visível, mas a leitura ainda depende do dado crítico em falta.')
    lines.push('- Assim que essa lacuna for fechada, o estudo avança de triagem para decisão.')
    return lines
  }

  const recommendedStayType = result.strategy?.recommendedStayType ?? 'long-stay'
  const recommendedModel = result.models?.[recommendedStayType]
  const confidence = recommendedModel?.scenarioConfidence ?? 'medium'

  lines.push(`- O ativo aponta para uma oportunidade consistente em ${formatScenarioFamilyLabel(recommendedStayType)}.`)
  lines.push(`- O cenário base combina retorno, previsibilidade e coerência operacional com confiança ${formatConfidence(confidence)}.`)
  lines.push('- A leitura posiciona o imóvel de forma executiva e deixa os dois caminhos de exploração lado a lado.')

  return lines
}

function renderNextSteps(result: PropertyIntelligenceResult): string[] {
  const lines: string[] = []
  lines.push('## Próximos Passos')

  if (result.status === 'needs_input') {
    lines.push('- Completar os dados em falta para liberar o dossiê.')
    lines.push('- Reexecutar o estudo assim que a informação crítica entrar.')
    lines.push('- Levar a nova leitura para uma revisão comercial mais assertiva.')
    return lines
  }

  lines.push('- Revisar a recomendação com o proprietário e confirmar o melhor posicionamento.')
  lines.push('- Validar se as premissas fazem sentido com a realidade operacional do imóvel.')
  lines.push('- Só então avançar para proposta formal, publicação ou negociação comercial.')

  return lines
}

function renderModelTable(models: StayModelResult[], currency: string): string {
  const rows = models
    .map(model => {
      const baseScenario = model.scenarios.find(scenario => scenario.label === 'base')
      const conservative = model.scenarios.find(scenario => scenario.label === 'conservative')
      const optimized = model.scenarios.find(scenario => scenario.label === 'optimized')

      return `| ${formatStayType(model.stayType)} | ${formatMoney(conservative?.netMonthlyReturn ?? 0, currency)} | ${formatMoney(baseScenario?.netMonthlyReturn ?? 0, currency)} | ${formatMoney(optimized?.netMonthlyReturn ?? 0, currency)} | ${formatConfidence(model.scenarioConfidence)} |`
    })
    .join('\n')

  return [
    '| Tipo de estadia | Conservador | Base | Otimizado | Confiança |',
    '| --- | ---: | ---: | ---: | --- |',
    rows,
  ].join('\n')
}

function renderComparablesTable(comparables: ComparableBenchmark[], currency: string): string {
  const rows = sortComparablesForDisplay(comparables)
    .map(comparable => {
      return `| ${comparable.label} | ${formatStayType(comparable.stayType)} | ${formatMarketTier(comparable.marketTier)} | ${formatMoney(comparable.monthlyGrossRevenue, currency)} | ${formatMoney(comparable.monthlyNetReturn, currency)} | ${formatProvenance(comparable.provenance)} | ${formatConfidence(comparable.confidence)} | ${comparable.source} | ${formatObservedAt(comparable.observedAt)} |`
    })
    .join('\n')

  return [
    '| Referência | Tipo | Zona | Receita bruta | Líquido observado | Proveniência | Confiança | Fonte | Observado em |',
    '| --- | --- | --- | ---: | ---: | --- | --- | --- | --- |',
    rows,
  ].join('\n')
}

function getLatestComparableObservation(comparables: ComparableBenchmark[]): string | null {
  const dates = comparables
    .map(comparable => comparable.observedAt)
    .filter((value): value is string => Boolean(value))
    .sort()

  return dates.length > 0 ? dates[dates.length - 1] : null
}

export function buildMarkdownReport(result: PropertyIntelligenceResult): string {
  const currency = result.intake.normalizedAssumptions.currency
  const models = result.models ? Object.values(result.models) : []
  const lines: string[] = []

  lines.push(...renderDocumentHeader())
  lines.push('# Dossiê Executivo de Property Intelligence')
  lines.push('')
  lines.push(...renderPropertyIdentity(result))
  lines.push('')
  lines.push(...renderExecutiveSummary(result, currency))
  lines.push('')
  lines.push(...renderMarketLayer(result, currency))
  lines.push('')
  lines.push(...renderLodgraLayer(result, currency))
  lines.push('')
  lines.push(...renderAiLayer(result))
  lines.push('')
  lines.push('## Resumo Financeiro')
  lines.push(...renderScenarioFinancialSummary(result, currency))
  lines.push('')
  lines.push(...renderShortMidScenario(result, currency))
  lines.push('')
  lines.push(...renderAnnualScenario(result, currency))
  lines.push('')
  lines.push(...renderInsight(result))
  lines.push('')
  lines.push('## Veredito')
  if (result.status === 'ready') {
    lines.push('A leitura sugere uma oportunidade sólida, com potencial claro para uma decisão comercial confiante.')
    lines.push('')
  }
  lines.push(renderVerdict(result))
  lines.push('')
  lines.push(...renderNextSteps(result))
  lines.push('')
  lines.push(...renderReadingGuide())
  lines.push('')
  lines.push('## Entrada')
  lines.push(`- Localização: ${result.intake.normalizedProperty.location || 'em falta'}`)
  lines.push(`- Tipologia: ${result.intake.normalizedProperty.typology || 'em falta'}`)
  lines.push(`- Área: ${result.intake.normalizedProperty.areaM2} m2`)
  lines.push(`- Quartos: ${result.intake.normalizedProperty.bedrooms}`)
  lines.push(`- Tipo de mercado: ${formatMarketTier(result.intake.normalizedProperty.market)}`)
  lines.push(`- Estado: ${result.intake.normalizedProperty.condition}`)
  lines.push(`- Mobilado: ${result.intake.normalizedProperty.furnished ? 'sim' : 'não'}`)
  lines.push(`- Completude: ${formatPercent(result.intake.completenessScore)}`)
  lines.push(`- Objetivos selecionados: ${result.intake.readingObjectives.map(formatReadingObjective).join(', ')}`)
  if (result.blockedInputs.length > 0) {
    lines.push(`- Bloqueios: ${result.blockedInputs.join(', ')}`)
  }
  if (result.intake.estimatedFields.length > 0) {
    lines.push(`- Campos estimados: ${result.intake.estimatedFields.join(', ')}`)
  }
  lines.push('')
  lines.push(...renderOwnerContext(result))
  lines.push('')
  lines.push('## Sinal de Localização')
  if (result.location) {
    lines.push(`- Perfil de mercado: ${formatMarketTier(result.location.marketTier)}`)
    lines.push(`- Taxa base por m²: ${formatMoney(result.location.baseRatePerM2, currency)}`)
    lines.push(`- Nível de confiança: ${formatPercent(result.location.confidence)}`)
    lines.push(`- Justificativa: ${result.location.rationale}`)
  } else {
    lines.push('- Sinal de localização indisponível porque faltam dados obrigatórios.')
  }
  lines.push('')
  lines.push('## Referências Comparáveis')
  lines.push('- Referência: benchmark usado na comparação e na sustentação da leitura.')
  lines.push('- Tipo: classe de estadia associada ao benchmark, para alinhar a leitura com o cenário certo.')
  lines.push('- Zona: enquadramento de mercado da referência, para destacar a leitura costeira, urbana, suburbana ou rural.')
  lines.push('- Receita bruta: valor bruto estimado antes dos custos operacionais.')
  lines.push('- Retorno líquido: valor após custos estimados e encargos operacionais.')
  lines.push('- Proveniência: origem da referência, podendo ser informada, derivada ou estimada.')
  lines.push('- Confiança: nível de segurança atribuído à referência usada na comparação.')
  if (result.comparables.length > 0) {
    lines.push(`- Zona predominante da amostra: ${getPrimaryMarketTier(result)}.`)
  }
  const latestComparableDate = getLatestComparableObservation(result.comparables)
  if (latestComparableDate) {
    lines.push(`- Mercado observado em: ${latestComparableDate}.`)
  }
  lines.push('### Curta e média duração')
  lines.push(renderComparablesTable(result.comparables.filter(comparable => comparable.stayType === 'short-stay' || comparable.stayType === 'mid-stay' || comparable.stayType === 'mixed'), currency))
  lines.push('')
  lines.push('### Locação anual')
  lines.push(renderComparablesTable(result.comparables.filter(comparable => comparable.stayType === 'long-stay' || comparable.stayType === 'mixed'), currency))
  lines.push('')
  lines.push('## Cenários')
  lines.push('- Conservador: leitura mais prudente, com ocupação e retorno abaixo do cenário central.')
  lines.push('- Base: leitura central e mais provável para a decisão comercial.')
  lines.push('- Otimizado: leitura de melhor caso plausível, com premissas mais favoráveis.')
  lines.push('- Confiança: nível de segurança do modelo para cada tipo de estadia.')
  if (models.length > 0) {
    lines.push(renderModelTable(models, currency))
  } else {
    lines.push('Nenhum cenário determinístico foi gerado porque a entrada ainda está bloqueada.')
  }
  lines.push('')
  lines.push('## Estratégia')
  if (result.strategy) {
    lines.push(`- Tipo de estadia recomendado: ${formatStayType(result.strategy.recommendedStayType)}`)
    lines.push(`- Razão: ${result.strategy.reason}`)
    lines.push(`- Ordem de comparação: ${result.strategy.comparisonOrder.map(formatStayType).join(' > ')}`)
    if (result.strategy.caveats.length > 0) {
      lines.push(`- Observações: ${result.strategy.caveats.join(' ')}`)
    }
  } else {
    lines.push('- A estratégia fica indisponível até os dados obrigatórios estarem completos.')
  }
  lines.push('')
  lines.push('## Validação')
  lines.push('- Estado: aprovado = pronto; atenção = rever premissas; bloqueado = faltam dados críticos.')
  lines.push(`- Estado atual: ${result.audit.status === 'pass' ? 'aprovado' : result.audit.status === 'warn' ? 'atenção' : 'bloqueado'}`)
  lines.push(`- Cobertura: ${formatPercent(result.audit.coverageScore)}`)
  lines.push(`- Aprovação obrigatória: ${result.audit.publishApprovalRequired ? 'sim' : 'não'}`)
  lines.push(`- Estado da aprovação: ${result.audit.publishApprovalState === 'approved' ? 'aprovada' : 'pendente'}`)
  if (result.audit.issues.length > 0) {
    lines.push(`- Observações: ${result.audit.issues.join(' | ')}`)
  }

  return lines.join('\n')
}

export function serializeJsonReport(result: PropertyIntelligenceResult): string {
  return `${JSON.stringify(result, null, 2)}`
}
