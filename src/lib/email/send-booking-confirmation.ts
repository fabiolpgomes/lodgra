import { Resend } from 'resend'
import { renderEmailTemplate, generateUnsubscribeToken } from './render-template'
import { buildDefaultEmailTemplate } from './email-template-config'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkEmailSendRateLimit, getVerifiedFromEmail } from './security'
import { retryWithBackoff } from './retry'
import {
  BOOKING_STANDARD_VERSION,
  formatBookingDate,
  getBookingEmailCopy,
  normalizeBookingLocale,
} from './booking-locale'

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY
  return apiKey ? new Resend(apiKey) : null
}

interface Booking {
  id: string
  customer_name: string
  customer_email: string
  property_id: string
  property_name: string
  check_in_date: string
  check_out_date: string
  total_price: number
  currency: string
  guest_count?: number
  preferred_locale?: string | null
}

interface Organization {
  id: string
  name: string
  slug: string
}

/**
 * Send branded booking confirmation email to customer
 */
export async function sendBookingConfirmation(
  booking: Booking,
  organization: Organization,
): Promise<void> {
  let client: ReturnType<typeof createAdminClient> | null = null

  try {
    client = createAdminClient()

    // Fetch email template + branding
    const { data: emailConfig } = await client
      .from('organization_email_templates')
      .select(
        `
        *,
        organization_branding:organization_branding(logo_url, primary_color)
      `,
      )
      .eq('organization_id', organization.id)
      .single()

    // Use defaults if no custom template
    const template = emailConfig || {
      confirmation_subject: buildDefaultEmailTemplate(organization.name, organization.slug).confirmation_subject,
      confirmation_message: null,
      from_email: `noreply@${organization.slug}.lodgra.io`,
      from_name: organization.name,
      reply_to_email: null,
      include_company_logo: true,
      footer_text: null,
    }

    // Fetch branding separately if not included
    let branding = emailConfig?.organization_branding
    if (!branding) {
      const { data: brandingData } = await client
        .from('organization_branding')
        .select('logo_url, primary_color, secondary_color')
        .eq('organization_id', organization.id)
        .single()
      branding = brandingData
    }

    // Generate unsubscribe token
    const unsubscribeToken = generateUnsubscribeToken(organization.id, booking.customer_email)

    const rateLimit = checkEmailSendRateLimit(organization.id, booking.customer_email)
    if (rateLimit.allowed === false) {
      console.warn('[email] Rate limit blocked branded booking confirmation:', rateLimit.reason)
      await client.from('email_sent').insert({
        organization_id: organization.id,
        booking_id: booking.id,
        customer_email: booking.customer_email,
        template_type: 'confirmation',
        status: 'failed',
      })
      return
    }

    const checkInDate = new Date(booking.check_in_date)
    const checkOutDate = new Date(booking.check_out_date)
    const nights = Math.max(
      1,
      Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)),
    )
    const locale = normalizeBookingLocale(booking.preferred_locale)
    const copy = getBookingEmailCopy(locale)

    // Prepare template variables
    const emailVariables = {
      subject: template.confirmation_subject,
      organizationName: organization.name,
      customerName: booking.customer_name,
      reservationNumber: booking.id,
      nights: String(nights),
      guestCount: String(booking.guest_count ?? 1),
      propertyName: booking.property_name,
      checkInDate: formatBookingDate(booking.check_in_date, locale),
      checkOutDate: formatBookingDate(booking.check_out_date, locale),
      totalPrice: booking.total_price.toFixed(2),
      currency: booking.currency,
      bookingUrl: `https://${organization.slug}.lodgra.io/bookings/${booking.id}`,
      unsubscribeUrl: `https://lodgra.io/unsubscribe?token=${unsubscribeToken}`,
      templateVersion: BOOKING_STANDARD_VERSION,
      logoUrl: template.include_company_logo && branding?.logo_url ? branding.logo_url : null,
      primaryColor: branding?.primary_color || '#1E40AF',
      replyToEmail: template.reply_to_email || 'support@lodgra.io',
      footerText: template.footer_text,
      confirmationMessage: template.confirmation_message,
      year: new Date().getFullYear().toString(),
      copy,
    }

    // Render email HTML
    const emailHtml = await renderEmailTemplate(emailVariables)
    console.log(`[email] Rendering branded booking confirmation with template ${BOOKING_STANDARD_VERSION}`)

    const resend = getResendClient()
    if (!resend) {
      console.warn('[email] RESEND_API_KEY não configurado — branded email não enviado')
      return
    }

    let verifiedFromEmail: string
    try {
      verifiedFromEmail = getVerifiedFromEmail(organization.slug, template.from_email)
    } catch (error) {
      verifiedFromEmail = `noreply@${organization.slug}.lodgra.io`
      console.warn('[email] Invalid from_email detected, falling back to verified sender:', error)
    }
    const fromAddress = template.from_name
      ? `${template.from_name} <${verifiedFromEmail}>`
      : verifiedFromEmail

    const defaultSubject = buildDefaultEmailTemplate(organization.name, organization.slug).confirmation_subject
    const subject = template.confirmation_subject === defaultSubject
      ? defaultSubject
      : template.confirmation_subject

    await client.from('email_sent').insert({
      organization_id: organization.id,
      booking_id: booking.id,
      customer_email: booking.customer_email,
      template_type: 'confirmation',
      status: 'pending',
    })

    await retryWithBackoff(async () => {
      const result = await resend.emails.send({
        from: fromAddress,
        to: booking.customer_email,
        replyTo: template.reply_to_email,
        subject,
        html: emailHtml,
      })

      if (result.error) {
        throw result.error
      }

      return result
    }, {
      attempts: 3,
    })

    // Log email sent
    await client
      .from('email_sent')
      .update({ status: 'sent' })
      .eq('organization_id', organization.id)
      .eq('booking_id', booking.id)
      .eq('customer_email', booking.customer_email)

    console.log(`✅ Booking confirmation sent to ${booking.customer_email}`)
  } catch (error) {
    if (client) {
      await client
        .from('email_sent')
        .update({ status: 'failed' })
        .eq('organization_id', organization.id)
        .eq('booking_id', booking.id)
        .eq('customer_email', booking.customer_email)
    }
    console.error('Error sending booking confirmation:', error)
    throw error
  }
}
