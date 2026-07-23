/**
 * Story 39.4 — Ranking de Propriedades (ADR/RevPAR por propriedade)
 *
 * Calcula ADR e RevPAR POR PROPRIEDADE (linha de `monthly_property_metrics`,
 * criada na Story 39.1), diferente do RevPAR agregado/org-wide calculado
 * pela Story 39.2 (ADR × currentMonthOccupancy). Mesma fórmula, aplicada
 * por linha em vez de agregada:
 *
 *   ADR (propriedade)    = gross_revenue / nights_sold
 *   RevPAR (propriedade) = ADR × (nights_sold / available_nights)
 *
 * Ver docs/stories/39.4-ranking-propriedades.md para o contexto completo.
 */

export interface PropertyMetricRow {
  property_id: string
  property_name: string | null
  gross_revenue: number
  nights_sold: number
  available_nights: number
  booking_count: number
}

export interface RankedProperty {
  propertyId: string
  propertyName: string
  adr: number
  revpar: number
  nightsSold: number
  availableNights: number
  bookingCount: number
}

export interface UnrankedProperty {
  propertyId: string
  propertyName: string
}

export interface PropertyRankingResult {
  top: RankedProperty[]
  bottom: RankedProperty[]
  /** Propriedades sem reservas no mês (booking_count = 0, nights_sold = 0, ou ausentes de monthly_property_metrics). */
  withoutBookings: UnrankedProperty[]
}

/**
 * ADR por propriedade. Retorna 0 quando não há noites vendidas (evita divisão por zero) —
 * chamadores devem tratar essas linhas como "sem dado", não como ADR real de 0.
 */
export function calculateADR(row: Pick<PropertyMetricRow, 'gross_revenue' | 'nights_sold'>): number {
  if (!row.nights_sold || row.nights_sold <= 0) {
    return 0
  }
  return row.gross_revenue / row.nights_sold
}

/**
 * RevPAR por propriedade = ADR × (nights_sold / available_nights).
 * Retorna 0 quando nights_sold ou available_nights são inválidos (evita divisão por zero) —
 * mesma ressalva do ADR: chamadores devem excluir essas linhas do ranking numérico.
 */
export function calculatePropertyRevPAR(
  row: Pick<PropertyMetricRow, 'gross_revenue' | 'nights_sold' | 'available_nights'>
): number {
  if (!row.nights_sold || row.nights_sold <= 0 || !row.available_nights || row.available_nights <= 0) {
    return 0
  }
  const adr = calculateADR(row)
  return adr * (row.nights_sold / row.available_nights)
}

/**
 * Monta o ranking top/bottom por RevPAR a partir das linhas de
 * `monthly_property_metrics` do mês corrente + a lista completa de
 * propriedades ativas da organização (necessária para detectar propriedades
 * que nem aparecem na view — sem nenhuma reserva no mês).
 *
 * Regras (AC da Story 39.4):
 * - Propriedades com `booking_count = 0`, `nights_sold = 0`, ou ausentes de
 *   `monthly_property_metrics` para o mês NÃO entram no ranking numérico —
 *   vão para `withoutBookings`.
 * - Empates de RevPAR são desempatados de forma determinística por nome
 *   (e por id como último critério), para não gerar ordens diferentes a
 *   cada render/refresh.
 * - Se houver menos de 6 propriedades rankáveis, a mesma propriedade nunca
 *   aparece em `top` e `bottom` simultaneamente — a divisão é balanceada
 *   (ver `splitTopBottomCounts`) em vez de sempre tentar 3+3.
 */
export function buildPropertyRanking(
  metricsRows: PropertyMetricRow[],
  allProperties: Array<{ id: string; name: string | null }>
): PropertyRankingResult {
  const rowsByPropertyId = new Map(metricsRows.map(row => [row.property_id, row]))

  const rankable: RankedProperty[] = []
  const withoutBookings: UnrankedProperty[] = []

  for (const property of allProperties) {
    const row = rowsByPropertyId.get(property.id)
    const propertyName = property.name || row?.property_name || 'Propriedade sem nome'

    if (!row || !row.booking_count || row.booking_count <= 0 || !row.nights_sold || row.nights_sold <= 0) {
      withoutBookings.push({ propertyId: property.id, propertyName })
      continue
    }

    rankable.push({
      propertyId: property.id,
      propertyName,
      adr: calculateADR(row),
      revpar: calculatePropertyRevPAR(row),
      nightsSold: row.nights_sold,
      availableNights: row.available_nights,
      bookingCount: row.booking_count,
    })
  }

  // Ordenação determinística: RevPAR desc, depois nome asc, depois id asc (desempate final).
  const sortedDesc = [...rankable].sort((a, b) => {
    if (b.revpar !== a.revpar) return b.revpar - a.revpar
    const nameCompare = a.propertyName.localeCompare(b.propertyName)
    if (nameCompare !== 0) return nameCompare
    return a.propertyId.localeCompare(b.propertyId)
  })

  const { topCount, bottomCount } = splitTopBottomCounts(sortedDesc.length)

  const top = sortedDesc.slice(0, topCount)
  // "bottom" = piores RevPAR, ordenado do pior para o menos pior (asc).
  const bottom = sortedDesc.slice(sortedDesc.length - bottomCount, sortedDesc.length).reverse()

  return { top, bottom, withoutBookings }
}

/**
 * Decide quantas propriedades entram em `top`/`bottom` sem duplicar a mesma
 * propriedade nas duas listas, quando há menos de 6 propriedades rankáveis.
 * Balanceado em vez de sempre "top 3 primeiro": N=4 vira top2/bottom2 (não
 * top3/bottom1), por exemplo.
 */
export function splitTopBottomCounts(n: number): { topCount: number; bottomCount: number } {
  if (n <= 0) return { topCount: 0, bottomCount: 0 }
  const topCount = Math.min(3, Math.ceil(n / 2))
  const bottomCount = Math.min(3, n - topCount)
  return { topCount, bottomCount }
}
