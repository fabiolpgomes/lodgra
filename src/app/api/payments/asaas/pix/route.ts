import { getAsaasCredentials } from '@/lib/payments/asaas-credentials.server'
import { getOrganizationTimeZone } from '@/lib/dates/business-timezone.server'
import { todayInTimeZone } from '@/lib/dates/date-only'
import { createClient } from '@/lib/supabase/server'
import { asaas } from '@/lib/payments/asaas'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { reservationId } = await request.json()
    const supabase = await createClient()

    // 1. Get reservation data and organization config
    const { data: reservation, error: resError } = await supabase
      .from('reservations')
      .select(`
        *,
        guests(id, first_name, last_name, email)
      `)
      .eq('id', reservationId)
      .single()

    if (resError || !reservation) {
      return NextResponse.json({ error: 'Reserva não encontrada' }, { status: 404 })
    }

    const credentials = await getAsaasCredentials(reservation.organization_id)
    if (!credentials) {
      return NextResponse.json({ error: 'Configuração de pagamento (Asaas) não encontrada para esta organização.' }, { status: 400 })
    }
    const apiKey = credentials.apiKey
    const isProduction = credentials.environment === 'production'

    const guest = reservation.guests
    const name = `${guest.first_name} ${guest.last_name || ''}`.trim()
    const email = guest.email

    // 2. Create or Find Asaas Customer
    const customer = await asaas.createCustomer(apiKey, isProduction, name, email)
    if (customer.errors) {
      return NextResponse.json({ error: customer.errors[0].description }, { status: 400 })
    }

    // 3. Create PIX Payment
    const payment = await asaas.createPayment(apiKey, isProduction, {
      customer: customer.id,
      billingType: 'PIX',
      value: Number(reservation.total_amount),
      dueDate: todayInTimeZone(await getOrganizationTimeZone(reservation.organization_id)), // Hoje, no fuso da organização
      description: `Reserva Lodgra #${reservation.confirmation_code || reservationId.slice(0, 8)}`,
      externalReference: reservationId
    })

    if (payment.errors) {
      return NextResponse.json({ error: payment.errors[0].description }, { status: 400 })
    }

    // 4. Update reservation with Asaas info
    await supabase
      .from('reservations')
      .update({
        asaas_payment_id: payment.id,
        asaas_payment_link: payment.invoiceUrl,
        asaas_status: payment.status
      })
      .eq('id', reservationId)

    return NextResponse.json({ 
      success: true, 
      paymentLink: payment.invoiceUrl,
      paymentId: payment.id
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
