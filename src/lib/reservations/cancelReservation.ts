import type { SupabaseClient } from '@supabase/supabase-js'
import type { UserAccess } from '@/lib/auth/getUserAccess'
import { stripePT } from '@/lib/stripe/client-pt'
import { calculateRefundForReservation } from '@/lib/cancellation/refund-calculator'
import type {
  CancellationPolicySnapshot,
  PropertyCancellationPolicy,
} from '@/types/cancellation.types'

export type CancellationResult =
  | {
      ok: true
      alreadyCancelled: boolean
      reservationId: string
      refundInfo?: {
        refund_amount: number
        refund_percentage: number
        stripe_refund_id: string | null
        processed_at: string | null
      }
    }
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
    .select(
      'id, property_id, reservation_status, deleted_at, check_in, check_out, total_amount, cancellation_policy_id, cancellation_policy_snapshot, stripe_payment_intent_id'
    )
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

  const refundData = await resolveRefundData(supabase, reservation)
  const cancelledAt = new Date().toISOString()
  let stripeRefundId: string | null = null
  let refundProcessedAt: string | null = null

  if (refundData && refundData.refund_amount > 0 && reservation.stripe_payment_intent_id) {
    try {
      const refund = await stripePT.refunds.create({
        payment_intent: reservation.stripe_payment_intent_id,
        amount: Math.round(refundData.refund_amount * 100),
        reason: 'requested_by_customer',
      })

      stripeRefundId = refund.id
      refundProcessedAt = new Date().toISOString()
    } catch (stripeError) {
      console.error('Failed to create Stripe refund:', stripeError)
    }
  }

  let updateQuery = supabase
    .from('reservations')
    .update({
      reservation_status: 'cancelled',
      cancelled_at: cancelledAt,
      deleted_at: null,
      updated_at: cancelledAt,
      refund_amount: refundData?.refund_amount ?? 0,
      stripe_refund_id: stripeRefundId,
      refund_processed_at: refundProcessedAt,
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
    details: {
      event: 'reservation_cancelled',
      reason,
      refund_amount: refundData?.refund_amount ?? 0,
      refund_processed: Boolean(stripeRefundId),
    },
  })

  if (auditError) {
    console.error('Reservation cancellation audit failed:', auditError)
  }

  return {
    ok: true,
    alreadyCancelled: false,
    reservationId,
    refundInfo: refundData
      ? {
          refund_amount: refundData.refund_amount,
          refund_percentage: refundData.refund_percentage,
          stripe_refund_id: stripeRefundId,
          processed_at: refundProcessedAt,
        }
      : undefined,
  }
}

type ReservationForCancellation = {
  property_id: string
  check_in: string | null
  check_out: string | null
  total_amount: number | string | null
  cancellation_policy_id: string | null
  cancellation_policy_snapshot: CancellationPolicySnapshot | null
}

async function resolveRefundData(
  supabase: SupabaseClient,
  reservation: ReservationForCancellation
): Promise<{ refund_amount: number; refund_percentage: number } | null> {
  const totalAmount = Number(reservation.total_amount || 0)
  if (!reservation.check_in || !reservation.check_out || totalAmount <= 0) {
    return null
  }

  const policy = await resolveCancellationPolicy(supabase, reservation)
  if (!policy) {
    return null
  }

  const refund = calculateRefundForReservation(
    policy,
    new Date(reservation.check_in),
    new Date(reservation.check_out),
    totalAmount
  )

  return {
    refund_amount: refund.refund_amount,
    refund_percentage: refund.refund_percentage,
  }
}

async function resolveCancellationPolicy(
  supabase: SupabaseClient,
  reservation: ReservationForCancellation
): Promise<PropertyCancellationPolicy | null> {
  if (reservation.cancellation_policy_snapshot) {
    const snapshot = reservation.cancellation_policy_snapshot
    return {
      id: reservation.cancellation_policy_id || 'snapshot',
      property_id: reservation.property_id,
      policy_type: snapshot.policy_type,
      is_long_stay: snapshot.is_long_stay,
      full_refund_days: snapshot.full_refund_days,
      partial_refund_days: snapshot.partial_refund_days,
      partial_refund_percent: snapshot.partial_refund_percent,
      non_refundable_discount_percent: snapshot.non_refundable_discount_percent,
      is_active: true,
      created_at: snapshot.captured_at,
      updated_at: snapshot.captured_at,
    }
  }

  if (!reservation.cancellation_policy_id) {
    return null
  }

  const { data: policy } = await supabase
    .from('property_cancellation_policies')
    .select(
      'id, property_id, policy_type, is_long_stay, full_refund_days, partial_refund_days, partial_refund_percent, non_refundable_discount_percent, is_active, created_at, updated_at'
    )
    .eq('id', reservation.cancellation_policy_id)
    .eq('property_id', reservation.property_id)
    .maybeSingle()

  return policy as PropertyCancellationPolicy | null
}
