/**
 * Story 39.6 — Painel de Alertas: Concentração por Propriedade
 *
 * Alerta quando 1 imóvel representa mais de `PROPERTY_CONCENTRATION_THRESHOLD`%
 * da receita bruta do mês (`monthly_property_metrics`, mesma fonte da Story 39.4).
 * Limiar independente do de concentração por canal (60%, Story 39.3,
 * `channelRevenue.ts`) — são dois alertas diferentes, não confundir (Description
 * da Story 39.6).
 *
 * Ver docs/stories/39.6-card-hoje-alertas-sino.md para o contexto completo.
 */

/** Limiar de concentração por propriedade (%). Não hardcoded em JSX solto — usar sempre esta constante. */
export const PROPERTY_CONCENTRATION_THRESHOLD = 40

export interface PropertyRevenueInput {
  propertyId: string
  propertyName: string | null | undefined
  grossRevenue: number
}

export interface PropertyConcentrationAlert {
  propertyId: string
  propertyName: string
  /** 0–100, sempre > threshold quando este objeto existe. */
  revenuePercent: number
}

/**
 * Retorna o alerta de concentração quando a propriedade dominante ultrapassa
 * o threshold; `null` quando não há receita ou nenhuma propriedade ultrapassa.
 *
 * Desempate determinístico (quando duas propriedades têm a mesma receita
 * exata): nome asc, depois id asc.
 */
export function buildPropertyConcentrationAlert(
  rows: PropertyRevenueInput[],
  threshold: number = PROPERTY_CONCENTRATION_THRESHOLD
): PropertyConcentrationAlert | null {
  const totalRevenue = rows.reduce((sum, r) => sum + (Number(r.grossRevenue) || 0), 0)
  if (totalRevenue <= 0) return null

  const sorted = [...rows].sort((a, b) => {
    const revenueDiff = (Number(b.grossRevenue) || 0) - (Number(a.grossRevenue) || 0)
    if (revenueDiff !== 0) return revenueDiff
    const nameCompare = (a.propertyName || '').localeCompare(b.propertyName || '')
    if (nameCompare !== 0) return nameCompare
    return a.propertyId.localeCompare(b.propertyId)
  })

  const dominant = sorted[0]
  if (!dominant) return null

  const revenuePercent = ((Number(dominant.grossRevenue) || 0) / totalRevenue) * 100
  if (revenuePercent <= threshold) return null

  return {
    propertyId: dominant.propertyId,
    propertyName: dominant.propertyName || 'Propriedade sem nome',
    revenuePercent,
  }
}
