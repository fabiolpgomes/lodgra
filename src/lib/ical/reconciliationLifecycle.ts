import type { SupabaseClient } from '@supabase/supabase-js'

export interface ReconciledFeedInput {
  supabase: SupabaseClient
  organizationId: string
  propertyListingId: string
  feedEvents: Map<string, { checkIn: string; checkOut: string; status?: string }>
  today?: Date
}

/**
 * iCal transports availability, not authority to overwrite a commercial booking.
 * Surface changed/disappeared events through the existing failed-sync alert path.
 * The email reconciliation writer (or an explicit host decision) owns the mutation.
 */
export async function assertReconciledFeedConsistency(input: ReconciledFeedInput): Promise<void> {
  // Unlinked facts removed from a successfully parsed feed cannot authorize a later booking.
  const { data: staged, error: stagedError } = await input.supabase.from('calendar_events')
    .select('id')
    .eq('organization_id', input.organizationId)
    .eq('property_listing_id', input.propertyListingId)
    .eq('status', 'unmatched')
    .limit(1001)
  if (stagedError) throw new Error(`Falha ao verificar eventos pendentes: ${stagedError.message}`)
  if ((staged?.length || 0) >= 1000) throw new Error('Limite da auditoria de eventos pendentes atingido; revisão necessária')
  const absent = (staged || []).filter(event => !input.feedEvents.has(event.id)).map(event => event.id)
  if (absent.length) {
    const { error: ignoreError } = await input.supabase.from('calendar_events')
      .update({ status: 'ignored', updated_at: new Date().toISOString() })
      .eq('organization_id', input.organizationId)
      .eq('property_listing_id', input.propertyListingId)
      .eq('status', 'unmatched')
      .in('id', absent)
    if (ignoreError) throw new Error(`Falha ao invalidar eventos ausentes: ${ignoreError.message}`)
  }

  const { data, error } = await input.supabase.from('reservations')
    .select('id, calendar_event_id, status, reservation_status, deleted_at, check_in, check_out')
    .eq('organization_id', input.organizationId)
    .eq('property_listing_id', input.propertyListingId)
    .not('calendar_event_id', 'is', null)
    .gte('check_out', new Date().toISOString().slice(0, 10))
    .limit(1001)

  if (error) throw new Error(`Falha ao verificar ciclo de vida reconciliado: ${error.message}`)
  if ((data?.length || 0) >= 1000) throw new Error('Limite da auditoria de reservas reconciliadas atingido; revisão necessária')

  const today = (input.today ?? new Date()).toISOString().slice(0, 10)
  const issues: string[] = []
  for (const reservation of data || []) {
    if (reservation.deleted_at || reservation.status === 'cancelled' || reservation.reservation_status === 'cancelled') continue
    const event = input.feedEvents.get(reservation.calendar_event_id)
    // Booking drops a stay from its export intermittently once the guest has checked in; a stay that
    // already started leaving the feed is not evidence of a cancellation.
    if (!event && reservation.check_in <= today) continue
    const reason = !event ? 'evento ausente' : event.status === 'CANCELLED' ? 'cancelamento no iCal'
      : event.checkIn !== reservation.check_in || event.checkOut !== reservation.check_out ? 'datas alteradas' : null
    if (reason) issues.push(`${reservation.id}: ${reason}`)
  }
  if (issues.length) {
    throw new Error(`${RECONCILIATION_PENDING_PREFIX} (${issues.length}): ${issues.slice(0, 5).join('; ')}`)
  }
}

export const RECONCILIATION_PENDING_PREFIX = 'Reconciliação pendente'
export type ReconciliationIssueReason = 'evento ausente' | 'cancelamento no iCal' | 'datas alteradas'

/** Reads back the reservations a failed listing sync flagged, so the panel can name each one. */
export function parseReconciliationIssues(message: string | null): Array<{ reservationId: string; reason: ReconciliationIssueReason }> {
  if (!message?.startsWith(RECONCILIATION_PENDING_PREFIX)) return []
  return [...message.matchAll(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}): (evento ausente|cancelamento no iCal|datas alteradas)/g)]
    .map(match => ({ reservationId: match[1], reason: match[2] as ReconciliationIssueReason }))
}
