import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendBookingConfirmationToGuest, sendBookingNotificationToManager } from '@/lib/email/bookingConfirmationGuest'
import type { BookingEmailData } from '@/lib/email/bookingConfirmationGuest'
import type { CurrencyCode } from '@/lib/utils/currency'

export async function POST(request: NextRequest) {
  try {
    const { reservationId } = await request.json()

    if (!reservationId) {
      return NextResponse.json(
        { error: 'reservationId é obrigatório' },
        { status: 400 }
      )
    }

    const supabase = await createAdminClient()

    // Fetch reservation details
    const { data: reservation, error: resError } = await supabase
      .from('reservations')
      .select(`
        id,
        confirmation_code,
        check_in,
        check_out,
        guest_name,
        guest_email,
        num_guests,
        total_amount,
        currency,
        preferred_locale,
        property_listing_id,
        guests:guests!reservations_guest_id_fkey(preferred_locale),
        properties:properties!reservations_property_org_fk(name, city, slug, organization_id, currency)
      `)
      .eq('id', reservationId)
      .single()

    if (resError || !reservation) {
      console.error('[email] Erro ao buscar reserva:', resError)
      return NextResponse.json(
        { error: 'Reserva não encontrada' },
        { status: 404 }
      )
    }

    const propertyRelation = reservation.properties as unknown as
      | { name: string; slug: string | null; city: string | null; currency: string | null; organization_id: string }
      | Array<{ name: string; slug: string | null; city: string | null; currency: string | null; organization_id: string }>
      | null
    const property = Array.isArray(propertyRelation) ? propertyRelation[0] : propertyRelation
    if (!property) {
      console.error('[email] Propriedade não encontrada para reserva:', reservationId)
      return NextResponse.json(
        { error: 'Propriedade associada não encontrada' },
        { status: 404 }
      )
    }

    const currency = (reservation.currency ?? property.currency)?.toUpperCase() as CurrencyCode | undefined
    if (!currency) {
      console.error('[email] Reserva sem moeda disponível:', reservationId)
      return NextResponse.json(
        { error: 'Reserva sem moeda configurada' },
        { status: 500 }
      )
    }

    const guestRelation = reservation.guests as unknown as { preferred_locale: string | null } | Array<{ preferred_locale: string | null }> | null
    const guestProfile = Array.isArray(guestRelation) ? guestRelation[0] : guestRelation

    const emailData: BookingEmailData = {
      reservationId: reservation.id,
      propertyName: property.name,
      propertySlug: property.slug,
      propertyCity: property.city,
      organizationId: property.organization_id,
      checkIn: reservation.check_in,
      checkOut: reservation.check_out,
      guestName: reservation.guest_name || 'Hóspede',
      guestEmail: reservation.guest_email,
      numGuests: reservation.num_guests || 1,
      totalAmount: reservation.total_amount ? parseFloat(String(reservation.total_amount)) : 0,
      currency,
      appUrl: process.env.NEXT_PUBLIC_APP_URL || '',
      preferredLocale: reservation.preferred_locale ?? guestProfile?.preferred_locale ?? null,
    }

    // Send emails
    const emailResults = await Promise.allSettled([
      sendBookingConfirmationToGuest(emailData),
      sendBookingNotificationToManager(emailData),
    ])

    const results: Record<string, { status: string; error: string | null }> = {
      guestEmail: { status: 'pending', error: null },
      managerEmail: { status: 'pending', error: null },
    }

    emailResults.forEach((result, index) => {
      const key = index === 0 ? 'guestEmail' : 'managerEmail'
      if (result.status === 'fulfilled') {
        results[key].status = 'success'
      } else {
        results[key].status = 'error'
        results[key].error = result.reason?.message || 'Erro ao enviar email'
      }
    })

    console.log(`[email] Confirmação enviada para ${reservationId}`, results)

    return NextResponse.json({
      success: true,
      message: 'Email de confirmação enviado com sucesso',
      details: results,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[email] Erro ao enviar confirmação:', error)
    return NextResponse.json(
      { error: `Erro ao processar requisição: ${msg}` },
      { status: 500 }
    )
  }
}
