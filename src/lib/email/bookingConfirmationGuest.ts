import { Resend } from 'resend'
import { differenceInDays, parseISO } from 'date-fns'
import { formatCurrency, type CurrencyCode } from '@/lib/utils/currency'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  formatBookingDate,
  getBookingEmailCopy,
  normalizeBookingLocale,
} from './booking-locale'

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY
  return apiKey ? new Resend(apiKey) : null
}

const FROM_EMAIL = process.env.EMAIL_FROM || 'lodgra.pt <noreply@resend.dev>'
const ADMIN_EMAIL = process.env.EMAIL_ADMIN || ''

export interface BookingEmailData {
  reservationId: string
  propertyName: string
  propertySlug: string | null
  propertyCity: string | null
  organizationId?: string
  checkIn: string
  checkOut: string
  guestName: string
  guestEmail: string | null
  numGuests: number
  totalAmount: number
  currency: CurrencyCode
  appUrl: string
  preferredLocale?: string | null
}

/**
 * Email to guest confirming their direct booking.
 */
export async function sendBookingConfirmationToGuest(data: BookingEmailData): Promise<void> {
  if (!data.guestEmail) return

  if (data.organizationId) {
    try {
      const client = createAdminClient()
      const { data: organization } = await client
        .from('organizations')
        .select('id, name, slug')
        .eq('id', data.organizationId)
        .maybeSingle()

      if (organization) {
        const { sendBookingConfirmation } = await import('./send-booking-confirmation')
        await sendBookingConfirmation(
          {
            id: data.reservationId,
            customer_name: data.guestName,
            customer_email: data.guestEmail,
            property_id: data.propertySlug ?? data.reservationId,
            property_name: data.propertyName,
            check_in_date: data.checkIn,
            check_out_date: data.checkOut,
            total_price: data.totalAmount,
            currency: data.currency,
            guest_count: data.numGuests,
            preferred_locale: data.preferredLocale ?? null,
          },
          organization,
        )
        return
      }
    } catch (error) {
      console.warn('[email] Falha ao carregar template branded, usando fallback Lodgra:', error)
    }
  }

  const resend = getResendClient()
  if (!resend) {
    console.warn('[email] RESEND_API_KEY não configurado — email ao hóspede não enviado')
    return
  }

  const locale = normalizeBookingLocale(data.preferredLocale)
  const copy = getBookingEmailCopy(locale)
  const nights = Math.max(
    1,
    Math.round((new Date(data.checkOut).getTime() - new Date(data.checkIn).getTime()) / (1000 * 60 * 60 * 24)),
  )
  const propertyUrl = data.propertySlug
    ? `${data.appUrl}/p/${data.propertySlug}`
    : data.appUrl
  const logoUrl = `${data.appUrl}/brand/lodgra-logo-vertical.png`
  const total = formatCurrency(data.totalAmount, data.currency)

  const html = `
<!DOCTYPE html>
<html lang="${locale}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">

    <!-- Header -->
    <div style="background:#fff;padding:28px 32px;text-align:center;border-bottom:1px solid #e5e7eb;">
      <img src="${logoUrl}" alt="Lodgra" style="height:60px;object-fit:contain;display:inline-block;" />
    </div>

    <!-- Green banner -->
    <div style="background:#dcfce7;padding:20px 32px;display:flex;align-items:center;gap:12px;">
      <span style="font-size:28px;">✅</span>
      <div>
        <p style="margin:0;font-size:16px;font-weight:700;color:#14532d;">${locale === 'en-US' ? 'Booking confirmed!' : locale === 'es-ES' ? '¡Reserva confirmada!' : 'Reserva confirmada!'}</p>
        <p style="margin:4px 0 0;font-size:13px;color:#166534;">${locale === 'en-US' ? 'Payment received successfully' : locale === 'es-ES' ? 'Pago recibido con éxito' : 'Pagamento recebido com sucesso'}</p>
      </div>
    </div>

    <!-- Body -->
    <div style="padding:28px 32px;">
      <p style="margin:0 0 20px;font-size:15px;color:#374151;">
        ${copy.greeting} <strong>${data.guestName}</strong>,<br>
        ${copy.intro}
      </p>

      <!-- Details table -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr style="background:#f9fafb;">
          <td colspan="2" style="padding:10px 12px;font-weight:600;font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">
            ${locale === 'en-US' ? 'Booking details' : locale === 'es-ES' ? 'Detalles de la reserva' : 'Detalhes da Reserva'}
          </td>
        </tr>
        <tr>
          <td style="padding:10px 12px;color:#6b7280;font-size:14px;border-bottom:1px solid #f3f4f6;">${copy.reservationLabel}</td>
          <td style="padding:10px 12px;font-weight:600;color:#111827;font-size:14px;border-bottom:1px solid #f3f4f6;">${data.reservationId.substring(0, 8).toUpperCase()}</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;color:#6b7280;font-size:14px;border-bottom:1px solid #f3f4f6;">${copy.propertyLabel}</td>
          <td style="padding:10px 12px;font-weight:600;color:#111827;font-size:14px;border-bottom:1px solid #f3f4f6;">${data.propertyName}${data.propertyCity ? ` — ${data.propertyCity}` : ''}</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;color:#6b7280;font-size:14px;border-bottom:1px solid #f3f4f6;">${copy.checkInLabel}</td>
          <td style="padding:10px 12px;font-weight:600;color:#111827;font-size:14px;border-bottom:1px solid #f3f4f6;">${formatBookingDate(data.checkIn, locale)}</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;color:#6b7280;font-size:14px;border-bottom:1px solid #f3f4f6;">${copy.checkOutLabel}</td>
          <td style="padding:10px 12px;font-weight:600;color:#111827;font-size:14px;border-bottom:1px solid #f3f4f6;">${formatBookingDate(data.checkOut, locale)}</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;color:#6b7280;font-size:14px;border-bottom:1px solid #f3f4f6;">${copy.nightsLabel}</td>
          <td style="padding:10px 12px;font-weight:600;color:#111827;font-size:14px;border-bottom:1px solid #f3f4f6;">${nights} ${locale === 'en-US' ? `night${nights !== 1 ? 's' : ''}` : locale === 'es-ES' ? `noche${nights !== 1 ? 's' : ''}` : `noite${nights !== 1 ? 's' : ''}`}</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;color:#6b7280;font-size:14px;border-bottom:1px solid #f3f4f6;">${copy.guestsLabel}</td>
          <td style="padding:10px 12px;font-weight:600;color:#111827;font-size:14px;border-bottom:1px solid #f3f4f6;">${data.numGuests}</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;color:#6b7280;font-size:14px;">${copy.totalPriceLabel}</td>
          <td style="padding:10px 12px;font-weight:700;color:#111827;font-size:15px;">${total}</td>
        </tr>
      </table>

      <!-- Info box -->
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin-bottom:24px;">
        <p style="margin:0 0 6px;font-weight:600;color:#1d4ed8;font-size:14px;">${locale === 'en-US' ? 'Next steps' : locale === 'es-ES' ? 'Próximos pasos' : 'Próximos passos'}</p>
        <p style="margin:0;font-size:13px;color:#0c1830;line-height:1.6;">
          ${locale === 'en-US'
            ? 'The property manager will contact you shortly with check-in instructions.<br>Keep this email as proof of your reservation.'
            : locale === 'es-ES'
              ? 'El gestor de la propiedad se pondrá en contacto contigo pronto con las instrucciones de check-in.<br>Guarda este email como comprobante de tu reserva.'
              : 'O gestor da propriedade irá contactá-lo em breve com as instruções de check-in.<br>Guarde este email como comprovativo da sua reserva.'}
        </p>
      </div>

      <!-- CTA -->
      <a href="${propertyUrl}" style="display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">
        ${locale === 'en-US' ? 'View property' : locale === 'es-ES' ? 'Ver propiedad' : 'Ver a propriedade'} →
      </a>
    </div>

    <!-- Footer -->
    <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
      <p style="margin:0;font-size:11px;color:#9ca3af;">
        lodgra.pt · ${locale === 'en-US' ? 'Direct bookings without commissions' : locale === 'es-ES' ? 'Reservas directas sin comisiones' : 'Reservas directas sem comissões'}<br>
        Ref: ${data.reservationId.substring(0, 8).toUpperCase()}
      </p>
    </div>

  </div>
</body>
</html>`

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.guestEmail,
      subject: locale === 'en-US'
        ? `✅ Booking confirmed — ${data.propertyName}`
        : locale === 'es-ES'
          ? `✅ Reserva confirmada — ${data.propertyName}`
          : `✅ Reserva confirmada — ${data.propertyName}`,
      html,
    })
    if (error) console.error('[email] Erro ao enviar confirmação ao hóspede:', error)
    else console.log(`[email] Confirmação enviada para ${data.guestEmail}`)
  } catch (err) {
    console.error('[email] Excepção ao enviar confirmação ao hóspede:', err)
  }
}

/**
 * Email to manager (EMAIL_ADMIN) notifying of a new direct booking.
 */
export async function sendBookingNotificationToManager(data: BookingEmailData): Promise<void> {
  if (!ADMIN_EMAIL) {
    console.warn('[email] EMAIL_ADMIN não configurado — notificação ao gestor não enviada')
    return
  }

  const resend = getResendClient()
  if (!resend) {
    console.warn('[email] RESEND_API_KEY não configurado — notificação ao gestor não enviada')
    return
  }

  const nights = differenceInDays(parseISO(data.checkOut), parseISO(data.checkIn))
  const dashboardUrl = `${data.appUrl}/reservations`
  const logoUrl = `${data.appUrl}/brand/lodgra-logo-vertical.png`
  const total = formatCurrency(data.totalAmount, data.currency)
  const copy = getBookingEmailCopy('pt-PT')

  const html = `
<!DOCTYPE html>
<html lang="pt">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">

    <!-- Header -->
    <div style="background:#fff;padding:28px 32px;text-align:center;border-bottom:1px solid #e5e7eb;">
      <img src="${logoUrl}" alt="Lodgra" style="height:60px;object-fit:contain;display:inline-block;" />
    </div>

    <!-- Banner -->
    <div style="background:#fef9c3;padding:20px 32px;">
      <p style="margin:0;font-size:16px;font-weight:700;color:#713f12;">🎉 Nova Reserva Directa!</p>
      <p style="margin:4px 0 0;font-size:13px;color:#854d0e;">${data.propertyName} — pagamento recebido</p>
    </div>

    <div style="padding:28px 32px;">
      <!-- Guest info -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr style="background:#f9fafb;">
          <td colspan="2" style="padding:10px 12px;font-weight:600;font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">
            Dados do Hóspede
          </td>
        </tr>
        <tr>
          <td style="padding:10px 12px;color:#6b7280;font-size:14px;border-bottom:1px solid #f3f4f6;">Nome</td>
          <td style="padding:10px 12px;font-weight:600;color:#111827;font-size:14px;border-bottom:1px solid #f3f4f6;">${data.guestName}</td>
        </tr>
        ${data.guestEmail ? `
        <tr>
          <td style="padding:10px 12px;color:#6b7280;font-size:14px;border-bottom:1px solid #f3f4f6;">Email</td>
          <td style="padding:10px 12px;font-weight:600;color:#111827;font-size:14px;border-bottom:1px solid #f3f4f6;">
            <a href="mailto:${data.guestEmail}" style="color:#2563eb;">${data.guestEmail}</a>
          </td>
        </tr>` : ''}
        <tr>
          <td style="padding:10px 12px;color:#6b7280;font-size:14px;border-bottom:1px solid #f3f4f6;">Hóspedes</td>
          <td style="padding:10px 12px;font-weight:600;color:#111827;font-size:14px;border-bottom:1px solid #f3f4f6;">${data.numGuests}</td>
        </tr>
      </table>

      <!-- Booking info -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr style="background:#f9fafb;">
          <td colspan="2" style="padding:10px 12px;font-weight:600;font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">
            Detalhes da Reserva
          </td>
        </tr>
        <tr>
          <td style="padding:10px 12px;color:#6b7280;font-size:14px;border-bottom:1px solid #f3f4f6;">Propriedade</td>
          <td style="padding:10px 12px;font-weight:600;color:#111827;font-size:14px;border-bottom:1px solid #f3f4f6;">${data.propertyName}</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;color:#6b7280;font-size:14px;border-bottom:1px solid #f3f4f6;">${copy.checkInLabel}</td>
          <td style="padding:10px 12px;font-weight:600;color:#111827;font-size:14px;border-bottom:1px solid #f3f4f6;">${formatBookingDate(data.checkIn, 'pt-PT')}</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;color:#6b7280;font-size:14px;border-bottom:1px solid #f3f4f6;">${copy.checkOutLabel}</td>
          <td style="padding:10px 12px;font-weight:600;color:#111827;font-size:14px;border-bottom:1px solid #f3f4f6;">${formatBookingDate(data.checkOut, 'pt-PT')}</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;color:#6b7280;font-size:14px;border-bottom:1px solid #f3f4f6;">Duração</td>
          <td style="padding:10px 12px;font-weight:600;color:#111827;font-size:14px;border-bottom:1px solid #f3f4f6;">${nights} noite${nights !== 1 ? 's' : ''}</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;color:#6b7280;font-size:14px;">Valor recebido</td>
          <td style="padding:10px 12px;font-weight:700;color:#16a34a;font-size:15px;">${total}</td>
        </tr>
      </table>

      <a href="${dashboardUrl}" style="display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">
        Ver no Dashboard →
      </a>
    </div>

    <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
      <p style="margin:0;font-size:11px;color:#9ca3af;">
        lodgra.pt · Ref: ${data.reservationId.substring(0, 8).toUpperCase()}
      </p>
    </div>

  </div>
</body>
</html>`

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `🎉 Nova reserva directa — ${data.propertyName} (${total})`,
      html,
    })
    if (error) console.error('[email] Erro ao enviar notificação ao gestor:', error)
    else console.log(`[email] Notificação enviada para ${ADMIN_EMAIL}`)
  } catch (err) {
    console.error('[email] Excepção ao enviar notificação ao gestor:', err)
  }
}
