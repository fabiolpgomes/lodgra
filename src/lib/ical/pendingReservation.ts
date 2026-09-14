import type { SupabaseClient } from '@supabase/supabase-js'

export interface PendingICalResult {
  reservation_id: string | null
  calendar_event_id: string
  created: boolean
  action: 'created' | 'updated' | 'blocked' | 'ignored'
}

/** The database owns the atomic event/reservation link and host-review lifecycle. */
export async function importPendingICalReservation(
  supabase: SupabaseClient, organizationId: string, calendarEventId: string, externalIdCandidates: string[] = [],
): Promise<PendingICalResult> {
  const { data, error } = await supabase.rpc('import_ical_pending_reservation', {
    p_organization_id: organizationId, p_event_id: calendarEventId, p_external_id_candidates: externalIdCandidates,
  })
  if (error) throw new Error(`Falha ao incluir reserva pendente: ${error.message}`)
  if (!data || !['created', 'updated', 'blocked', 'ignored'].includes(data.action)) {
    throw new Error('Resposta inválida ao incluir reserva pendente')
  }
  return data as PendingICalResult
}
