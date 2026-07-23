/**
 * Story 39.6 — Sino de Notificações
 *
 * Funções puras (sem I/O) para os 4 gatilhos do sino de notificações do
 * dashboard (`src/app/[locale]/dashboard/page.tsx` + `NotificationBell`):
 *
 *   1. Hóspede com nome placeholder (`guests.first_name === 'Hóspede'`)
 *   2. Falha de sync (última linha de `sync_logs` da organização)
 *   3. Pagamento pendente (`reservations.status = 'pending_payment'` há mais
 *      de `PENDING_PAYMENT_ALERT_HOURS`)
 *   4. Ocupação baixa por propriedade (< `LOW_OCCUPANCY_ALERT_THRESHOLD`% nos
 *      próximos `LOW_OCCUPANCY_WINDOW_DAYS` dias)
 *
 * O sino é **global da organização** — nunca recortado pelo filtro de
 * propriedade do topo (AC da Story 39.6). Os 4 gatilhos aparecem **apenas**
 * no sino, nunca como card/bloco separado (regra explícita da spec-fonte).
 *
 * Ver docs/stories/39.6-card-hoje-alertas-sino.md para o contexto completo.
 */

import { formatCurrency, type CurrencyCode } from '@/lib/utils/currency'

/**
 * Prazo (em horas) desde a criação da reserva para "pagamento pendente"
 * disparar o sino. Confirmado por Fabio em 2026-07-23 (a story 39.6 tinha
 * deixado este valor como placeholder de 48h — trocado para 24h).
 */
export const PENDING_PAYMENT_ALERT_HOURS = 24

/** Limiar de ocupação baixa (%) nos próximos `LOW_OCCUPANCY_WINDOW_DAYS` dias. Definido na spec-fonte (não é ponto em aberto). */
export const LOW_OCCUPANCY_ALERT_THRESHOLD = 30

/** Janela prospectiva (dias) usada para o cálculo de ocupação baixa. */
export const LOW_OCCUPANCY_WINDOW_DAYS = 30

export type NotificationAlertType =
  | 'placeholder_guest'
  | 'sync_failure'
  | 'pending_payment'
  | 'low_occupancy'

export interface NotificationAlert {
  /** Chave estável para `key` de lista/React — determinística por gatilho + entidade. */
  id: string
  type: NotificationAlertType
  /** Mensagem com contexto suficiente para agir sem navegar (AC da Story 39.6) — nunca genérica. */
  message: string
  /** ID da reserva relacionada, quando aplicável — usado pelo caller para montar o href com locale. */
  reservationId?: string
}

// ─── 1. Hóspede com nome placeholder ────────────────────────────────────────

/**
 * O valor real usado no código para hóspede sem nome identificado é
 * `'Hóspede'` (maiúscula, acentuada) — ver `src/app/api/cron/sync-ical/route.ts:286`,
 * `src/app/api/sync/import/route.ts:142`, `src/app/api/cron/email-parser/route.ts:185`.
 * `'Reserved'` (mencionado na spec-fonte) já é filtrado na origem pelo parser de
 * iCal (`src/lib/ical/bookingParser.ts`), então não precisa de checagem aqui.
 */
export function isPlaceholderGuestName(firstName: string | null | undefined): boolean {
  return firstName === 'Hóspede'
}

export interface PlaceholderGuestReservationInput {
  reservationId: string
  guestFirstName: string | null | undefined
  propertyName: string | null | undefined
  checkIn: string
}

export function buildPlaceholderGuestAlerts(
  reservations: PlaceholderGuestReservationInput[]
): NotificationAlert[] {
  return reservations
    .filter((r) => isPlaceholderGuestName(r.guestFirstName))
    .map((r) => ({
      id: `placeholder-guest-${r.reservationId}`,
      type: 'placeholder_guest' as const,
      message: `Reserva sem nome de hóspede identificado — ${r.propertyName || 'Propriedade'} (check-in ${formatShortDate(r.checkIn)})`,
      reservationId: r.reservationId,
    }))
}

// ─── 2. Falha de sync ────────────────────────────────────────────────────

export interface SyncLogInput {
  status: string
  errorMessage?: string | null
  /** Timestamp já formatado pelo caller (mesmo formato DD/MM HH:MM usado pelo indicador da Story 39.5). */
  syncedAtFormatted: string
}

export function buildSyncFailureAlert(log: SyncLogInput | null | undefined): NotificationAlert | null {
  if (!log || log.status === 'success') return null

  return {
    id: 'sync-failure',
    type: 'sync_failure',
    message: `Falha na sincronização às ${log.syncedAtFormatted}${log.errorMessage ? ` — ${log.errorMessage}` : ''}`,
  }
}

// ─── 3. Pagamento pendente ───────────────────────────────────────────────

export interface PendingPaymentReservationInput {
  reservationId: string
  propertyName: string | null | undefined
  createdAt: string
  totalAmount?: number | null
  currency?: string | null
}

/**
 * Filtra reservas `pending_payment` com mais de `hoursThreshold` horas desde
 * `createdAt`. `now` é injetado (não `new Date()` interno) para manter a
 * função pura e testável.
 */
export function buildPendingPaymentAlerts(
  reservations: PendingPaymentReservationInput[],
  now: Date,
  hoursThreshold: number = PENDING_PAYMENT_ALERT_HOURS
): NotificationAlert[] {
  return reservations
    .filter((r) => {
      const created = new Date(r.createdAt)
      if (Number.isNaN(created.getTime())) return false
      const hoursElapsed = (now.getTime() - created.getTime()) / (1000 * 60 * 60)
      return hoursElapsed >= hoursThreshold
    })
    .map((r) => {
      const amountLabel =
        r.totalAmount != null && r.currency
          ? ` (${formatCurrency(r.totalAmount, r.currency as CurrencyCode)})`
          : ''
      return {
        id: `pending-payment-${r.reservationId}`,
        type: 'pending_payment' as const,
        message: `Pagamento pendente há mais de ${hoursThreshold}h — ${r.propertyName || 'Propriedade'}${amountLabel}`,
        reservationId: r.reservationId,
      }
    })
}

// ─── 4. Ocupação baixa por propriedade (prospectiva, próximos 30 dias) ──────

export interface ProspectiveReservationInput {
  propertyId: string
  /** ISO date string (YYYY-MM-DD). */
  checkIn: string
  /** ISO date string (YYYY-MM-DD). */
  checkOut: string
}

export interface PropertyOccupancyForecast {
  propertyId: string
  propertyName: string
  /** 0–100. */
  occupancyPercent: number
}

/**
 * Ocupação prospectiva por propriedade: noites reservadas dentro da janela
 * [windowStart, windowStart + windowDays) / windowDays, por propriedade.
 *
 * Diferente de `monthly_property_metrics` (histórico) — esta é uma query
 * nova sobre `reservations` com `check_in`/`check_out` futuros (Technical
 * Notes da Story 39.6).
 */
export function calculateProspectiveOccupancy(
  reservations: ProspectiveReservationInput[],
  properties: Array<{ id: string; name: string | null | undefined }>,
  windowStart: Date,
  windowDays: number = LOW_OCCUPANCY_WINDOW_DAYS
): PropertyOccupancyForecast[] {
  const start = new Date(windowStart)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + windowDays)

  const nightsByProperty = new Map<string, number>()

  for (const r of reservations) {
    const checkIn = new Date(r.checkIn)
    const checkOut = new Date(r.checkOut)
    if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) continue

    const rangeStart = checkIn < start ? start : checkIn
    const rangeEnd = checkOut > end ? end : checkOut
    const nights = Math.max(0, Math.round((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)))
    if (nights <= 0) continue

    nightsByProperty.set(r.propertyId, (nightsByProperty.get(r.propertyId) || 0) + nights)
  }

  return properties.map((property) => {
    const nights = nightsByProperty.get(property.id) || 0
    const occupancyPercent = windowDays > 0 ? Math.min(100, (nights / windowDays) * 100) : 0
    return {
      propertyId: property.id,
      propertyName: property.name || 'Propriedade sem nome',
      occupancyPercent,
    }
  })
}

/**
 * Ordenação determinística: ocupação asc (mais crítico primeiro), depois
 * nome asc (desempate) — nunca uma mensagem genérica, sempre com o nome do
 * imóvel (AC da Story 39.6).
 */
export function buildLowOccupancyAlerts(
  forecasts: PropertyOccupancyForecast[],
  threshold: number = LOW_OCCUPANCY_ALERT_THRESHOLD
): NotificationAlert[] {
  return forecasts
    .filter((f) => f.occupancyPercent < threshold)
    .sort((a, b) => {
      if (a.occupancyPercent !== b.occupancyPercent) return a.occupancyPercent - b.occupancyPercent
      return a.propertyName.localeCompare(b.propertyName)
    })
    .map((f) => ({
      id: `low-occupancy-${f.propertyId}`,
      type: 'low_occupancy' as const,
      message: `${f.propertyName}: ocupação de ${Math.round(f.occupancyPercent)}% nos próximos ${LOW_OCCUPANCY_WINDOW_DAYS} dias`,
    }))
}

// ─── Util interno ─────────────────────────────────────────────────────────

function formatShortDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}
