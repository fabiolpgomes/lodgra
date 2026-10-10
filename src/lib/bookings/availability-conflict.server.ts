import 'server-only'
import type { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

/** Quanto tempo uma reserva `pending_payment` bloqueia as datas (pagamento pendente). */
export const PENDING_PAYMENT_HOLD_MINUTES = 30
/** Margem acima do prazo de pagamento até as datas voltarem a ficar livres. */
export const PENDING_PAYMENT_STALE_MINUTES = 35

export function pendingPaymentStaleCutoff(now = Date.now()): string {
  return new Date(now - PENDING_PAYMENT_STALE_MINUTES * 60 * 1000).toISOString()
}

export function isPendingPaymentStale(createdAt: string, now = Date.now()): boolean {
  const created = new Date(createdAt).getTime()
  return Number.isNaN(created) ? true : created < now - PENDING_PAYMENT_STALE_MINUTES * 60 * 1000
}

/**
 * Há outra reserva (confirmada, ou pendente ainda dentro do prazo) a ocupar essas datas?
 * `excludeReservationId` evita que a própria reserva conte como conflito.
 */
export async function hasBlockingReservation(
  supabase: AdminClient,
  params: { propertyId: string; checkIn: string; checkOut: string; excludeReservationId?: string },
): Promise<boolean> {
  const { propertyId, checkIn, checkOut, excludeReservationId } = params

  let confirmed = supabase
    .from('reservations')
    .select('id')
    .eq('property_id', propertyId)
    .eq('status', 'confirmed')
    .lt('check_in', checkOut)
    .gt('check_out', checkIn)
    .limit(1)
  if (excludeReservationId) confirmed = confirmed.neq('id', excludeReservationId)

  let pending = supabase
    .from('reservations')
    .select('id')
    .eq('property_id', propertyId)
    .eq('status', 'pending_payment')
    .gte('created_at', pendingPaymentStaleCutoff())
    .lt('check_in', checkOut)
    .gt('check_out', checkIn)
    .limit(1)
  if (excludeReservationId) pending = pending.neq('id', excludeReservationId)

  const [{ data: confirmedRows }, { data: pendingRows }] = await Promise.all([confirmed, pending])
  return (confirmedRows ?? []).length > 0 || (pendingRows ?? []).length > 0
}
