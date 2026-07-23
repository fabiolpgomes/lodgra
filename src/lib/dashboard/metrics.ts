/**
 * Story 39.2: ADR/RevPAR + variação MoM/YoY, a partir de `monthly_property_metrics`
 * (materialized view criada pela Story 39.1).
 *
 * Funções puras, sem I/O — recebem linhas já buscadas do Supabase e agregam/derivam
 * as métricas usadas pelo dashboard (`src/app/[locale]/dashboard/page.tsx`).
 *
 * Reaproveitável pelas Stories 39.3/39.4 (Receita por Canal, Ranking de Propriedades),
 * que também precisam de comparação temporal sobre a mesma view.
 */

import { calcManagementFee } from '@/lib/financial/calculations'

/** Uma linha de `monthly_property_metrics`, como retornada pelo Supabase. */
export type MonthlyPropertyMetricRow = {
  property_id: string
  property_name?: string | null
  metric_month: string
  gross_revenue: number | string | null
  nights_sold: number | string | null
  available_nights: number | string | null
  booking_count: number | string | null
  cancelled_count?: number | string | null
  incomplete_data_count?: number | string | null
}

export type PeriodCurrencyMetrics = {
  grossRevenue: number
  nightsSold: number
  availableNights: number
  bookingCount: number
  propertyCount: number
  /** Número de linhas da view agregadas neste período — usado para distinguir "sem dado" de "zero real". */
  rowCount: number
}

function emptyPeriodMetrics(): PeriodCurrencyMetrics {
  return {
    grossRevenue: 0,
    nightsSold: 0,
    availableNights: 0,
    bookingCount: 0,
    propertyCount: 0,
    rowCount: 0,
  }
}

/**
 * ADR (Average Daily Rate) = Receita Bruta / Noites Vendidas.
 * Retorna 0 quando não há noites vendidas (evita divisão por zero / NaN).
 */
export function calculateADR(grossRevenue: number, nightsSold: number): number {
  if (!nightsSold || nightsSold <= 0) return 0
  if (!Number.isFinite(grossRevenue)) return 0
  return grossRevenue / nightsSold
}

/**
 * RevPAR (Revenue per Available Room) = ADR × (Ocupação% / 100).
 * `occupancyPercent` é um valor 0-100 (não 0-1).
 */
export function calculateRevPAR(adr: number, occupancyPercent: number): number {
  if (!Number.isFinite(adr) || !Number.isFinite(occupancyPercent)) return 0
  return adr * (occupancyPercent / 100)
}

/**
 * Variação percentual entre o período atual e o período de comparação (MoM ou YoY).
 *
 * Retorna `null` (não 0 ou NaN) quando:
 * - não há dado no período atual ou no período de comparação (`hasData = false`,
 *   ex.: propriedade nova sem histórico do mês anterior — a view não gera linha
 *   para meses sem nenhuma reserva);
 * - o valor de comparação é exatamente 0 (percentual indefinido matematicamente).
 */
export function calculateVariationPercent(
  current: number,
  currentHasData: boolean,
  previous: number,
  previousHasData: boolean
): number | null {
  if (!currentHasData || !previousHasData) return null
  if (previous === 0) return null
  const pct = ((current - previous) / Math.abs(previous)) * 100
  return Number.isFinite(pct) ? Math.round(pct) : null
}

/**
 * Conta quantas propriedades já existiam até o fim do mês de `monthKey` (formato
 * 'YYYY-MM-01', ver `monthKeyFromDate`), a partir de `created_at`.
 *
 * Substitui a aproximação anterior (contar propriedades com pelo menos 1 reserva
 * no mês, via `monthly_property_metrics`) — aquela media "atividade", não
 * "tamanho do portfólio", e por isso o badge de variação do card "Propriedades"
 * podia sugerir que o número de imóveis geridos tinha mudado quando na verdade só
 * a ocupação daquele mês tinha mudado.
 *
 * Limitação conhecida e aceita: só considera propriedades atualmente ativas
 * (`is_active = true`, filtro já aplicado por quem chama, ver page.tsx) — se uma
 * propriedade foi desativada, não há timestamp de quando isso ocorreu no schema
 * atual, então ela não é contada nem para os meses em que esteve ativa. Isso é
 * consistente com o número principal do card ("Propriedades"), que também só
 * conta propriedades ativas agora — não introduz uma nova divergência.
 */
export function countPropertiesByMonthEnd(
  properties: Array<{ created_at?: string | null }>,
  monthKey: string
): number {
  const [yearStr, monthStr] = monthKey.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)
  if (!Number.isFinite(year) || !Number.isFinite(month)) return 0

  // Último instante do mês de `monthKey` (dia 0 do mês seguinte = último dia do mês corrente, 23:59:59.999).
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999)

  return properties.filter((p) => {
    if (!p.created_at) return false
    const createdAt = new Date(p.created_at)
    return !Number.isNaN(createdAt.getTime()) && createdAt.getTime() <= monthEnd.getTime()
  }).length
}

/** `Date` → chave de mês no mesmo formato de `metric_month` (primeiro dia do mês, 'YYYY-MM-DD'). */
export function monthKeyFromDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}-01`
}

export function filterRowsByMonth(
  rows: MonthlyPropertyMetricRow[],
  monthKey: string
): MonthlyPropertyMetricRow[] {
  return rows.filter((row) => (row.metric_month || '').slice(0, 10) === monthKey)
}

export function filterRowsByProperties(
  rows: MonthlyPropertyMetricRow[],
  propertyIds: string[]
): MonthlyPropertyMetricRow[] {
  const idSet = new Set(propertyIds)
  return rows.filter((row) => idSet.has(row.property_id))
}

/**
 * Agrega linhas da view por moeda (a view não tem coluna de moeda — cada propriedade
 * tem sua própria moeda, então o lookup vem de `propertyCurrencyMap`, já usado no
 * resto do dashboard).
 */
export function aggregateMonthlyMetricsByCurrency(
  rows: MonthlyPropertyMetricRow[],
  propertyCurrencyMap: Record<string, string>,
  fallbackCurrency: string
): Record<string, PeriodCurrencyMetrics> {
  const result: Record<string, PeriodCurrencyMetrics> = {}
  const propertiesByCurrency: Record<string, Set<string>> = {}

  rows.forEach((row) => {
    const currency = propertyCurrencyMap[row.property_id] || fallbackCurrency
    if (!result[currency]) {
      result[currency] = emptyPeriodMetrics()
      propertiesByCurrency[currency] = new Set()
    }
    result[currency].grossRevenue += Number(row.gross_revenue || 0)
    result[currency].nightsSold += Number(row.nights_sold || 0)
    result[currency].availableNights += Number(row.available_nights || 0)
    result[currency].bookingCount += Number(row.booking_count || 0)
    result[currency].rowCount += 1
    propertiesByCurrency[currency].add(row.property_id)
  })

  Object.keys(result).forEach((currency) => {
    result[currency].propertyCount = propertiesByCurrency[currency]?.size || 0
  })

  return result
}

/** Agregação total (todas as moedas juntas) — usada para o badge de "Propriedades"/"Reservas". */
export function aggregateMonthlyMetricsTotal(rows: MonthlyPropertyMetricRow[]): PeriodCurrencyMetrics {
  const propertyIds = new Set<string>()
  const totals = rows.reduce((acc, row) => {
    acc.grossRevenue += Number(row.gross_revenue || 0)
    acc.nightsSold += Number(row.nights_sold || 0)
    acc.availableNights += Number(row.available_nights || 0)
    acc.bookingCount += Number(row.booking_count || 0)
    propertyIds.add(row.property_id)
    return acc
  }, emptyPeriodMetrics())
  totals.rowCount = rows.length
  totals.propertyCount = propertyIds.size
  return totals
}

export type ManagementFeeByCurrency = Record<string, { commission: number; rowCount: number }>

/**
 * Σ calcManagementFee(gross_revenue por propriedade, management_percentage da propriedade),
 * agrupado por moeda — base do "Lucro Real" (nível 4 do modelo de receita da Epic 39).
 *
 * Reaproveita `calcManagementFee` de `src/lib/financial/calculations.ts` (não reimplementado).
 */
export function aggregateManagementFeeByCurrency(
  rows: MonthlyPropertyMetricRow[],
  propertyMeta: Record<string, { currency: string; managementPercentage: number }>,
  fallbackCurrency: string
): ManagementFeeByCurrency {
  const result: ManagementFeeByCurrency = {}

  rows.forEach((row) => {
    const meta = propertyMeta[row.property_id]
    const currency = meta?.currency || fallbackCurrency
    const fee = calcManagementFee(Number(row.gross_revenue || 0), meta?.managementPercentage || 0)

    if (!result[currency]) result[currency] = { commission: 0, rowCount: 0 }
    result[currency].commission += fee
    result[currency].rowCount += 1
  })

  return result
}
