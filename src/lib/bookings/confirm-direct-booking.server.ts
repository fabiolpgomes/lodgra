import 'server-only'
import type { createAdminClient } from '@/lib/supabase/admin'
import { sendBookingConfirmationToGuest, sendBookingNotificationToManager } from '@/lib/email/bookingConfirmationGuest'
import { enqueueEmail } from '@/lib/email/queue'
import type { CurrencyCode } from '@/lib/utils/currency'

type AdminClient = ReturnType<typeof createAdminClient>

export type ConfirmDirectBookingResult =
  | { outcome: 'confirmed' }
  | { outcome: 'not_found' }
  | { outcome: 'not_pending'; status: string | null }
  | { outcome: 'already_confirmed_by_other_delivery' }

interface ConfirmOptions {
  /** Campos do meio de pagamento gravados junto com a confirmação (ids Stripe/Asaas, etc.). */
  paymentFields: Record<string, unknown>
  /** Link da página de confirmação, a partir do slug da propriedade. */
  bookingUrl: (propertySlug: string | null) => string | null
}

/**
 * Confirma uma reserva direta que aguardava pagamento e avisa hóspede, gestor e proprietário.
 * Usado por qualquer meio de pagamento (Stripe, Pix/Asaas), para a confirmação nunca divergir.
 *
 * O update é condicional a `status = 'pending_payment'`: duas entregas concorrentes do webhook
 * não confirmam (nem enviam e-mails) duas vezes, e uma entrega tardia não reabre uma reserva
 * já cancelada.
 */
export async function confirmDirectBooking(
  supabase: AdminClient,
  reservationId: string,
  { paymentFields, bookingUrl }: ConfirmOptions,
): Promise<ConfirmDirectBookingResult> {
  const { data: existing } = await supabase
    .from('reservations')
    .select('status, check_in, check_out, guest_name, guest_email, total_amount, num_guests, property_listing_id, currency, preferred_locale, guests:guests!reservations_guest_id_fkey(preferred_locale)')
    .eq('id', reservationId)
    .single()

  if (!existing) {
    console.error(`[confirm-booking] Reserva ${reservationId} não encontrada`)
    return { outcome: 'not_found' }
  }

  if (existing.status !== 'pending_payment') {
    console.log(`[confirm-booking] Reserva ${reservationId} em '${existing.status}' — ignorado`)
    return { outcome: 'not_pending', status: existing.status ?? null }
  }

  const { data: confirmedRows, error: updateError } = await supabase
    .from('reservations')
    .update({ status: 'confirmed', ...paymentFields })
    .eq('id', reservationId)
    .eq('status', 'pending_payment')
    .select('id')

  if (updateError) {
    console.error(`[confirm-booking] Erro ao confirmar reserva ${reservationId}:`, updateError)
    throw updateError
  }
  if (!confirmedRows || confirmedRows.length === 0) {
    console.log(`[confirm-booking] Reserva ${reservationId} confirmada por outra entrega — idempotent skip`)
    return { outcome: 'already_confirmed_by_other_delivery' }
  }

  console.log(`[confirm-booking] Reserva ${reservationId} confirmada`)

  const { data: listing, error: listingError } = await supabase
    .from('property_listings')
    .select('property_id, properties!property_listings_property_id_fkey(name, city, slug, organization_id, owner_id, currency)')
    .eq('id', existing.property_listing_id)
    .single()

  if (listingError) {
    console.error(`[confirm-booking] Erro ao buscar listing: ${listingError.message}`)
    return { outcome: 'confirmed' }
  }

  const property = listing?.properties as unknown as {
    name: string
    city: string | null
    slug: string | null
    organization_id: string
    owner_id: string | null
    currency: string | null
  } | null

  if (!property) {
    console.error('[confirm-booking] Propriedade não encontrada para emails')
    return { outcome: 'confirmed' }
  }

  const currency = (existing.currency ?? property.currency)?.toUpperCase() as CurrencyCode | undefined
  if (!currency) {
    console.error('[confirm-booking] Reserva sem moeda disponível para emails:', reservationId)
    return { outcome: 'confirmed' }
  }

  const guestRelation = existing.guests as unknown as { preferred_locale: string | null } | Array<{ preferred_locale: string | null }> | null
  const guestProfile = Array.isArray(guestRelation) ? guestRelation[0] : guestRelation

  const emailData = {
    reservationId,
    propertyName: property.name,
    propertySlug: property.slug,
    propertyCity: property.city,
    organizationId: property.organization_id,
    checkIn: existing.check_in,
    checkOut: existing.check_out,
    guestName: existing.guest_name ?? 'Hóspede',
    guestEmail: existing.guest_email ?? null,
    numGuests: existing.num_guests ?? 1,
    totalAmount: existing.total_amount ? parseFloat(String(existing.total_amount)) : 0,
    currency,
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? '',
    preferredLocale: existing.preferred_locale ?? guestProfile?.preferred_locale ?? null,
    bookingUrl: bookingUrl(property.slug),
  }

  const emailResults = await Promise.allSettled([
    sendBookingConfirmationToGuest(emailData),
    sendBookingNotificationToManager(emailData),
  ])
  emailResults.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error(`[confirm-booking] Email ${index === 0 ? 'guest' : 'manager'} failed:`, result.reason)
    }
  })

  if (property.owner_id) {
    const { data: owner } = await supabase
      .from('owners')
      .select('full_name, email')
      .eq('id', property.owner_id)
      .single()

    if (owner?.email) {
      const nights = Math.round(
        (new Date(existing.check_out).getTime() - new Date(existing.check_in).getTime()) / 86400000,
      )
      await enqueueEmail({
        type: 'owner_reservation',
        ownerName: owner.full_name ?? 'Proprietário',
        ownerEmail: owner.email,
        guestName: existing.guest_name ?? 'Hóspede',
        propertyName: property.name,
        checkIn: existing.check_in,
        checkOut: existing.check_out,
        nights,
        totalAmount: existing.total_amount ? String(existing.total_amount) : undefined,
        currency,
        source: 'direct',
      })
    }
  }

  return { outcome: 'confirmed' }
}
