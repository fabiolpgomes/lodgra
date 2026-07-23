/**
 * Story 39.3 — Receita por Canal
 *
 * Agrupa reservas do mês corrente por `booking_source` (canal de distribuição)
 * e calcula % de receita, % de reservas e comissão real (`commission_amount`,
 * campo já existente antes da Story 39.1 — nunca estimada por taxa fixa) por
 * canal, além do gatilho de alerta de concentração (1 canal > threshold% da
 * receita do mês).
 *
 * Receita Bruta: soma direta de `total_amount`, sem deduções e sem
 * distribuição proporcional entre meses (diferente do card "Receita do Mês",
 * que distribui reservas multi-mês proporcionalmente) — decisão documentada
 * nos Dev Notes da Story 39.3, alinhada à Description da story ("SUM(total_amount)
 * por booking_source / SUM(total_amount) total").
 *
 * Reservas com `booking_source` ou `total_amount` ausentes (null/undefined)
 * são excluídas do cálculo e contabilizadas em `excludedCount` — nunca
 * tratadas como um canal "desconhecido" com receita 0 silenciosamente somada
 * a outro canal (AC da Story 39.3).
 *
 * Ver docs/stories/39.3-receita-por-canal.md para o contexto completo.
 */

/** Limiar de concentração por canal (%). Não hardcoded em JSX solto — usar sempre esta constante. */
export const CHANNEL_CONCENTRATION_THRESHOLD = 60

/**
 * Rótulos amigáveis para os valores de `booking_source` observados no código
 * atual (ver Description da Story 39.3). Usado apenas como fallback quando a
 * reserva não tem `platforms.display_name` disponível via `property_listings`.
 */
const CHANNEL_LABELS: Record<string, string> = {
  manual: 'Reserva Manual',
  ical_import: 'Importado via iCal',
  ical_auto_sync: 'Importado via iCal',
  booking: 'Booking.com',
  booking_api: 'Booking API',
  airbnb: 'Airbnb',
  direct: 'Direto',
  email_parse: 'Importado via E-mail',
}

/**
 * Resolve o rótulo amigável de um canal. Prioriza `platforms.display_name`
 * (via `property_listings.platform_id → platforms`) quando disponível;
 * caso contrário usa o mapa estático; e como último recurso devolve o valor
 * bruto de `booking_source` (nunca deixa a UI sem rótulo).
 */
export function getChannelLabel(bookingSource: string, platformDisplayName?: string | null): string {
  if (platformDisplayName && platformDisplayName.trim().length > 0) {
    return platformDisplayName.trim()
  }
  return CHANNEL_LABELS[bookingSource] ?? bookingSource
}

export interface ChannelReservationInput {
  bookingSource: string | null | undefined
  totalAmount: number | null | undefined
  commissionAmount?: number | null | undefined
  platformDisplayName?: string | null | undefined
}

export interface ChannelBreakdown {
  /** Valor bruto de `booking_source` (chave estável, não traduzida). */
  channel: string
  /** Rótulo amigável para exibição. */
  label: string
  revenueAmount: number
  /** 0–100. */
  revenuePercent: number
  reservationCount: number
  /** 0–100. */
  reservationPercent: number
  /** Soma real de `reservations.commission_amount` — nunca estimada. */
  commissionAmount: number
}

export interface ChannelConcentrationAlert {
  channel: string
  label: string
  /** 0–100, sempre > threshold quando este objeto existe. */
  revenuePercent: number
}

export interface ChannelRevenueResult {
  /** Ordenado por receita desc (desempate: rótulo asc, depois canal asc — determinístico). */
  channels: ChannelBreakdown[]
  totalRevenue: number
  totalReservations: number
  /** Reservas com `booking_source` ou `total_amount` ausentes, excluídas do cálculo acima. */
  excludedCount: number
  /** Não nulo quando 1 canal ultrapassa o threshold de concentração. */
  concentrationAlert: ChannelConcentrationAlert | null
}

/**
 * Constrói o breakdown de receita/reservas/comissão por canal a partir de uma
 * lista de reservas (já filtrada por mês/moeda/organização/propriedade pelo
 * chamador — esta função é agnóstica a essas dimensões, apenas agrega por
 * canal).
 */
export function buildChannelRevenue(
  reservations: ChannelReservationInput[],
  threshold: number = CHANNEL_CONCENTRATION_THRESHOLD
): ChannelRevenueResult {
  const valid = reservations.filter(
    (r): r is ChannelReservationInput & { bookingSource: string; totalAmount: number } =>
      r.bookingSource != null && r.bookingSource !== '' && r.totalAmount != null
  )
  const excludedCount = reservations.length - valid.length

  // Agrupar pelo RÓTULO resolvido (`label`), não pelo `bookingSource` bruto.
  // Motivo: o mesmo canal real pode gravar `booking_source` inconsistente entre
  // reservas (ex.: sync-ical grava 'airbnb' quando detecta a plataforma, mas cai
  // para 'ical_import' quando não detecta — mesmo sendo, de fato, uma reserva do
  // Airbnb confirmada via `platforms.display_name`). Agrupar pelo valor bruto
  // duplicava "Airbnb" em duas linhas no card; agrupar pelo rótulo funde essas
  // reservas numa linha só, que é o que a UI mostra de qualquer forma. Reportado
  // por Fabio em produção (2026-07-23).
  type Accumulator = { revenue: number; count: number; commission: number; representativeChannel: string }
  const byLabel = new Map<string, Accumulator>()

  for (const r of valid) {
    const label = getChannelLabel(r.bookingSource, r.platformDisplayName)
    const amount = Number(r.totalAmount) || 0
    const commission = r.commissionAmount != null ? Number(r.commissionAmount) || 0 : 0

    const existing = byLabel.get(label)
    if (existing) {
      existing.revenue += amount
      existing.count += 1
      existing.commission += commission
    } else {
      byLabel.set(label, { revenue: amount, count: 1, commission, representativeChannel: r.bookingSource })
    }
  }

  const totalRevenue = valid.reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0)
  const totalReservations = valid.length

  const channels: ChannelBreakdown[] = Array.from(byLabel.entries()).map(([label, acc]) => ({
    channel: acc.representativeChannel,
    label,
    revenueAmount: acc.revenue,
    revenuePercent: totalRevenue > 0 ? (acc.revenue / totalRevenue) * 100 : 0,
    reservationCount: acc.count,
    reservationPercent: totalReservations > 0 ? (acc.count / totalReservations) * 100 : 0,
    commissionAmount: acc.commission,
  }))

  // Ordenação determinística: receita desc, depois rótulo asc, depois canal asc (desempate final).
  channels.sort((a, b) => {
    if (b.revenueAmount !== a.revenueAmount) return b.revenueAmount - a.revenueAmount
    const labelCompare = a.label.localeCompare(b.label)
    if (labelCompare !== 0) return labelCompare
    return a.channel.localeCompare(b.channel)
  })

  const dominant = channels[0]
  const concentrationAlert: ChannelConcentrationAlert | null =
    dominant && dominant.revenuePercent > threshold
      ? { channel: dominant.channel, label: dominant.label, revenuePercent: dominant.revenuePercent }
      : null

  return { channels, totalRevenue, totalReservations, excludedCount, concentrationAlert }
}
