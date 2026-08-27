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

function renderPageBreak(): string[] {
  return ['<div style="page-break-after: always;"></div>']
}

function renderCommercialSummary(result: PropertyIntelligenceResult, currency: string): string[] {
  const lines: string[] = []

  lines.push('## Destaque da Oportunidade')
  if (result.status === 'needs_input') {
    const missingInputs = result.blockedInputs.length > 0 ? result.blockedInputs.join(', ') : 'required inputs'
    lines.push(`- Ainda falta ${missingInputs} para fechar a leitura com segurança.`)
    lines.push('- Assim que esse dado entrar, o dossiê devolve uma visão completa com cenários e recomendação.')
    return lines
  }

  const recommendedStayType = result.strategy?.recommendedStayType ?? 'long-stay'
  const recommendedModel = result.models?.[recommendedStayType]
  const baseScenario = recommendedModel?.scenarios.find(scenario => scenario.label === 'base')
  const annualNetReturn = baseScenario?.annualNetReturn ?? 0
  const monthlyNetReturn = baseScenario?.netMonthlyReturn ?? 0
  const confidence = recommendedModel?.scenarioConfidence ?? 'medium'

  lines.push(`- Melhor direção estratégica: exploração em ${formatStayType(recommendedStayType)}.`)
  lines.push(`- Retorno líquido base estimado: ${formatMoney(monthlyNetReturn, currency)} por mês (${formatMoney(annualNetReturn, currency)} por ano).`)
  lines.push(`- Nível de confiança: ${formatConfidence(confidence)}.`)
  if (
    result.intake.ownerContext.flexibility === 'high' ||
    result.intake.ownerContext.operatingModel === 'short_mid' ||
    result.intake.ownerContext.operatingModel === 'mixed'
  ) {
    lines.push('- O contexto do proprietário reforça o peso de curta e média duração por permitir uso flexível e manutenção preventiva.')
  }
  lines.push('- O dossiê já está pronto para apoiar uma conversa comercial de alto nível, com revisão humana antes da publicação.')

  return lines
}

function renderReadingGuide(): string[] {
  return [
    '## Como a Análise Foi Constituída',
    '- Esta secção explica a mecânica do dossiê para que a leitura seja transparente e fácil de defender em conversa comercial.',
    '- O modelo cruza localização, tipologia, área, estado e premissas operacionais para compor a leitura base.',
    '- O tipo do imóvel, as comodidades destacadas e a URL do anúncio entram como contexto complementar para enriquecer a leitura.',
    '- O contexto do proprietário também pode entrar no modelo: flexibilidade de uso, histórico operacional e nota de manutenção ajudam a calibrar a recomendação final.',
    '- As referências comparáveis servem como ponto de ancoragem: podem vir de benchmarks internos, dados informados ou estimativas derivadas pela análise.',
    '- A tabela de referências comparáveis mostra a base usada para comparação e a confiança da informação.',
    '- A tabela de cenários mostra três leituras do mesmo imóvel: conservador, base e otimizado.',
    '- O cenário conservador usa premissas mais prudentes; o cenário base representa a leitura central; o cenário otimizado mostra o melhor caso plausível.',
    '- A confiança expressa o grau de segurança do modelo em cada tipo de estadia e na referência usada para sustentar a recomendação.',
    '- Quando o proprietário usa o imóvel ou depende de manutenção preventiva, regimes curtos e médios podem receber maior peso do que uma leitura financeira isolada sugeriria.',
    '- Como a Lodgra é uma operação de gestão patrimonial focada em curta e média duração, o anual só deve liderar quando a diferença económica e operacional for realmente estrutural.',
    '- A estratégia indica qual tipo de estadia apresenta o melhor encaixe económico e por que razão.',
    '- A validação informa se a leitura está pronta, se precisa de atenção ou se ainda está bloqueada por dados em falta.',
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
    lines.push('- O motor mantém a leitura financeira base, sem ponderar uso pessoal, histórico ou manutenção adicional.')
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

  return `Veredito: o imóvel mostra melhor encaixe em ${formatStayType(recommendedStayType)}, com retorno líquido base de ${formatMoney(monthlyNetReturn, currency)} por mês.`
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

  lines.push(`- O ativo aponta para uma oportunidade consistente em ${formatStayType(recommendedStayType)}.`)
  lines.push(`- O cenário base combina retorno e previsibilidade com confiança ${formatConfidence(confidence)}.`)
  if (
    result.intake.ownerContext.flexibility === 'high' ||
    result.intake.ownerContext.operatingModel === 'short_mid'
  ) {
    lines.push('- O contexto do proprietário introduz um viés operacional para curta e média duração, porque o uso pessoal e a manutenção preventiva passam a ter valor real na decisão.')
  }
  lines.push('- A leitura posiciona o imóvel com clareza suficiente para uma conversa comercial executiva.')

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
  lines.push('- Só então avançar para proposta formal ou publicação.')

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
  const rows = comparables
    .map(comparable => {
      return `| ${comparable.label} | ${formatStayType(comparable.stayType)} | ${formatMoney(comparable.monthlyGrossRevenue, currency)} | ${formatMoney(comparable.monthlyNetReturn, currency)} | ${formatProvenance(comparable.provenance)} | ${formatConfidence(comparable.confidence)} |`
    })
    .join('\n')

  return [
    '| Referência | Tipo | Receita bruta | Retorno líquido | Proveniência | Confiança |',
    '| --- | --- | ---: | ---: | --- | --- |',
    rows,
  ].join('\n')
}

export function buildMarkdownReport(result: PropertyIntelligenceResult): string {
  const currency = result.intake.normalizedAssumptions.currency
  const models = result.models ? Object.values(result.models) : []
  const lines: string[] = []

  lines.push('# Dossiê Executivo de Property Intelligence')
  lines.push('')
  lines.push(...renderPropertyIdentity(result))
  lines.push('')
  lines.push(...renderCommercialSummary(result, currency))
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
  lines.push(...renderPageBreak())
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
  lines.push('- Receita bruta: valor bruto estimado antes dos custos operacionais.')
  lines.push('- Retorno líquido: valor após custos estimados e encargos operacionais.')
  lines.push('- Proveniência: origem da referência, podendo ser informada, derivada ou estimada.')
  lines.push('- Confiança: nível de segurança atribuído à referência usada na comparação.')
  lines.push(renderComparablesTable(result.comparables, currency))
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
