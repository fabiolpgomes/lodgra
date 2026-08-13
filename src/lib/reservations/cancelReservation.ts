import type { SupabaseClient } from '@supabase/supabase-js'
import type { UserAccess } from '@/lib/auth/getUserAccess'

export type CancellationResult =
  | { ok: true; alreadyCancelled: boolean; reservationId: string }
  | { ok: false; status: 403 | 404 | 500; error: string }

const CANCELLATION_ROLES = new Set(['admin', 'gestor', 'manager', 'owner'])

export async function cancelReservation(
  supabase: SupabaseClient,
  access: UserAccess,
  reservationId: string,
  reason: string | null,
): Promise<CancellationResult> {
  if (!CANCELLATION_ROLES.has(access.profile.role)) {
    return { ok: false, status: 403, error: 'Sem permissão para cancelar reservas' }
  }

  const organizationId = access.profile.organization_id
  if (!organizationId) {
    return { ok: false, status: 403, error: 'Organização do usuário não encontrada' }
  }

  let reservationQuery = supabase
    .from('reservations')
    .select('id, property_id, reservation_status, deleted_at')
    .eq('id', reservationId)
    .eq('organization_id', organizationId)

  if (access.propertyIds) {
    if (access.propertyIds.length === 0) {
      return { ok: false, status: 404, error: 'Reserva não encontrada' }
    }
    reservationQuery = reservationQuery.in('property_id', access.propertyIds)
  }

  const { data: reservation, error: fetchError } = await reservationQuery.maybeSingle()

  if (fetchError) {
    console.error('Failed to load reservation for cancellation:', fetchError)
    return { ok: false, status: 500, error: 'Falha ao consultar reserva' }
  }
  if (!reservation) {
    return { ok: false, status: 404, error: 'Reserva não encontrada' }
  }
  if (reservation.reservation_status === 'cancelled') {
    if (reservation.deleted_at) {
      let repairQuery = supabase
        .from('reservations')
        .update({ deleted_at: null })
        .eq('id', reservationId)
        .eq('organization_id', organizationId)

      if (access.propertyIds) {
        repairQuery = repairQuery.in('property_id', access.propertyIds)
      }

      const { error: repairError } = await repairQuery
      if (repairError) {
        console.error('Failed to repair cancelled reservation tombstone:', repairError)
        return { ok: false, status: 500, error: 'Falha ao confirmar cancelamento' }
      }
    }
    return { ok: true, alreadyCancelled: true, reservationId }
  }

  const cancelledAt = new Date().toISOString()
  let updateQuery = supabase
    .from('reservations')
    .update({
      reservation_status: 'cancelled',
      cancelled_at: cancelledAt,
      deleted_at: null,
      updated_at: cancelledAt,
    })
    .eq('id', reservationId)
    .eq('organization_id', organizationId)
    .neq('reservation_status', 'cancelled')

  if (access.propertyIds) {
    updateQuery = updateQuery.in('property_id', access.propertyIds)
  }

  const { data: updated, error: updateError } = await updateQuery
    .select('id')
    .maybeSingle()

  if (updateError) {
    console.error('Failed to cancel reservation:', updateError)
    return { ok: false, status: 500, error: 'Falha ao cancelar reserva' }
  }
  if (!updated) {
    let concurrentQuery = supabase
      .from('reservations')
      .select('id, reservation_status')
      .eq('id', reservationId)
      .eq('organization_id', organizationId)

    if (access.propertyIds) {
      concurrentQuery = concurrentQuery.in('property_id', access.propertyIds)
    }

    const { data: concurrentReservation, error: concurrentError } = await concurrentQuery.maybeSingle()
    if (concurrentError) {
      console.error('Failed to verify concurrent reservation cancellation:', concurrentError)
      return { ok: false, status: 500, error: 'Falha ao confirmar cancelamento' }
    }
    if (concurrentReservation?.reservation_status === 'cancelled') {
      return { ok: true, alreadyCancelled: true, reservationId }
    }
    return { ok: false, status: 404, error: 'Reserva não encontrada' }
  }

  const { error: auditError } = await supabase.from('audit_logs').insert({
    user_id: access.profile.id,
    action: 'update',
    resource_type: 'reservation',
    resource_id: reservationId,
    details: { event: 'reservation_cancelled', reason },
  })

  if (auditError) {
    console.error('Reservation cancellation audit failed:', auditError)
  }

  return { ok: true, alreadyCancelled: false, reservationId }
}
