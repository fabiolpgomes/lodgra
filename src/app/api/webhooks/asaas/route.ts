import { getAsaasWebhookToken } from '@/lib/payments/asaas-credentials.server'
import { tokensMatch } from '@/lib/payments/asaas-token'
import { createAdminClient } from '@/lib/supabase/admin'
import { confirmDirectBooking } from '@/lib/bookings/confirm-direct-booking.server'
import { hasBlockingReservation, isPendingPaymentStale } from '@/lib/bookings/availability-conflict.server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const REFUND_MARKER = 'DEVOLVER PIX'

function appBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://lodgra.io'
}

export async function POST(request: Request) {
  try {
    // Validate Asaas webhook token
    const incomingToken = request.headers.get('asaas-access-token')
    if (!incomingToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await request.json()
    const { event, payment } = payload

    if (!payment?.externalReference) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const reservationId = payment.externalReference
    const supabase = await createAdminClient()

    // Look up the organization via the reservation to validate the token
    const { data: reservation, error: resError } = await supabase
      .from('reservations')
      .select('organization_id, property_id, status, booking_source, check_in, check_out, total_amount, created_at, asaas_payment_id, internal_notes')
      .eq('id', reservationId)
      .single()

    if (resError || !reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    // O webhook autentica-se com um segredo próprio da organização (não com a chave de API)
    const expectedToken = await getAsaasWebhookToken(reservation.organization_id)
    if (!tokensMatch(expectedToken, incomingToken)) {
      console.warn(`[ASAAS WEBHOOK] Invalid token for reservation ${reservationId}`)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`[ASAAS WEBHOOK] Event: ${event}, Payment ID: ${payment.id}`)

    // A cobrança tem de ser a que foi criada para esta reserva.
    if (reservation.asaas_payment_id && reservation.asaas_payment_id !== payment.id) {
      console.warn(`[ASAAS WEBHOOK] Cobrança ${payment.id} não corresponde à da reserva ${reservationId} — ignorado`)
      return NextResponse.json({ received: true })
    }

    // Cobrança vencida/removida sem pagamento: liberta a reserva direta que ainda aguardava (como o
    // "checkout expirado" do Stripe). Se for paga depois, o ramo de pagamento tardio abaixo trata.
    if (event === 'PAYMENT_OVERDUE' || event === 'PAYMENT_DELETED') {
      if (reservation.booking_source === 'direct' && reservation.status === 'pending_payment') {
        await supabase
          .from('reservations')
          .update({ status: 'cancelled' })
          .eq('id', reservationId)
          .eq('status', 'pending_payment')
      }
      return NextResponse.json({ received: true })
    }

    if (event !== 'PAYMENT_RECEIVED' && event !== 'PAYMENT_CONFIRMED') {
      return NextResponse.json({ received: true })
    }

    const paidAt = new Date().toLocaleString('pt-BR', { timeZone: 'UTC' })
    const appendNote = (note: string) =>
      [reservation.internal_notes, note].filter(Boolean).join('\n')

    // Reserva criada manualmente pelo gestor: só regista o pagamento.
    if (reservation.booking_source !== 'direct') {
      const { error } = await supabase
        .from('reservations')
        .update({
          asaas_status: 'RECEIVED',
          internal_notes: appendNote(`Pagamento PIX confirmado via Asaas em ${paidAt} UTC`),
        })
        .eq('id', reservationId)
      if (error) console.error('Error updating reservation via webhook:', error)
      return NextResponse.json({ received: true })
    }

    // Reserva direta: o pagamento confirma a reserva (mesmo caminho do Stripe).
    const paidValue = Number(payment.value)
    const expectedValue = Number(reservation.total_amount)
    if (!Number.isFinite(paidValue) || paidValue + 0.005 < expectedValue) {
      console.warn(`[ASAAS WEBHOOK] Valor pago ${payment.value} menor que o devido ${expectedValue} na reserva ${reservationId}`)
      await supabase
        .from('reservations')
        .update({ asaas_status: 'RECEIVED', internal_notes: appendNote(`${REFUND_MARKER}: valor pago (${payment.value}) é menor que o total (${expectedValue}). Reserva NÃO confirmada.`) })
        .eq('id', reservationId)
      return NextResponse.json({ received: true })
    }

    if (reservation.status !== 'pending_payment') {
      // Já confirmada (entrega repetida) não faz nada; cancelada/expirada exige devolução manual.
      if (reservation.status === 'cancelled' && !reservation.internal_notes?.includes(REFUND_MARKER)) {
        await supabase
          .from('reservations')
          .update({ asaas_status: 'RECEIVED', internal_notes: appendNote(`${REFUND_MARKER}: pagamento recebido em ${paidAt} UTC depois de a reserva ser cancelada.`) })
          .eq('id', reservationId)
      }
      return NextResponse.json({ received: true })
    }

    // Pagamento depois do prazo de espera: as datas podem já ter sido reservadas por outra pessoa.
    const isStale = isPendingPaymentStale(reservation.created_at)
    if (isStale) {
      const taken = await hasBlockingReservation(supabase, {
        propertyId: reservation.property_id,
        checkIn: reservation.check_in,
        checkOut: reservation.check_out,
        excludeReservationId: reservationId,
      })
      if (taken) {
        await supabase
          .from('reservations')
          .update({
            status: 'cancelled',
            asaas_status: 'RECEIVED',
            internal_notes: appendNote(`${REFUND_MARKER}: pagamento recebido em ${paidAt} UTC depois do prazo e as datas já foram ocupadas.`),
          })
          .eq('id', reservationId)
        return NextResponse.json({ received: true })
      }
    }

    await confirmDirectBooking(supabase, reservationId, {
      paymentFields: {
        asaas_status: 'RECEIVED',
        internal_notes: appendNote(`Pagamento PIX confirmado via Asaas em ${paidAt} UTC`),
      },
      bookingUrl: (propertySlug) =>
        propertySlug ? `${appBaseUrl()}/p/${propertySlug}/booking-confirmed?reservation_id=${encodeURIComponent(reservationId)}` : null,
    })

    return NextResponse.json({ received: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Asaas Webhook Error:', message)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
