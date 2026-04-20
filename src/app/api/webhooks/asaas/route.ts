import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

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
    const supabase = createAdminClient()

    // Look up the organization via the reservation to validate the token
    const { data: reservation, error: resError } = await supabase
      .from('reservations')
      .select('organization_id, organizations!inner(asaas_api_key)')
      .eq('id', reservationId)
      .single()

    if (resError || !reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    const orgs = reservation.organizations as unknown as { asaas_api_key: string | null } | { asaas_api_key: string | null }[]
    const org = Array.isArray(orgs) ? orgs[0] : orgs
    if (!org.asaas_api_key || org.asaas_api_key !== incomingToken) {
      console.warn(`[ASAAS WEBHOOK] Invalid token for reservation ${reservationId}`)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`[ASAAS WEBHOOK] Event: ${event}, Payment ID: ${payment.id}`)

    if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
      const { error } = await supabase
        .from('reservations')
        .update({
          asaas_status: 'RECEIVED',
          internal_notes: `Pagamento PIX confirmado via Asaas em ${new Date().toLocaleString('pt-BR')}`
        })
        .eq('id', reservationId)

      if (error) {
        console.error('Error updating reservation via webhook:', error)
      } else {
        console.log(`Successfully confirmed payment for reservation ${reservationId}`)
      }
    }

    return NextResponse.json({ received: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Asaas Webhook Error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
