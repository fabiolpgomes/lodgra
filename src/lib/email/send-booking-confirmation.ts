import { renderEmailTemplate, generateUnsubscribeToken } from './render-template'
import { createAdminClient } from '@/lib/supabase/admin'

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
  try {
    const client = createAdminClient()

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
      confirmation_subject: `Booking Confirmation - ${organization.name}`,
      confirmation_message: null,
      from_email: 'noreply@lodgra.io',
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

    // Prepare template variables
    const emailVariables = {
      subject: template.confirmation_subject,
      organizationName: organization.name,
      customerName: booking.customer_name,
      propertyName: booking.property_name,
      checkInDate: new Date(booking.check_in_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      checkOutDate: new Date(booking.check_out_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      totalPrice: booking.total_price.toFixed(2),
      currency: booking.currency,
      bookingUrl: `https://${organization.slug}.lodgra.io/bookings/${booking.id}`,
      unsubscribeUrl: `https://lodgra.io/unsubscribe?token=${unsubscribeToken}`,
      logoUrl: template.include_company_logo && branding?.logo_url ? branding.logo_url : null,
      primaryColor: branding?.primary_color || '#1E40AF',
      replyToEmail: template.reply_to_email || 'support@lodgra.io',
      footerText: template.footer_text,
      confirmationMessage: template.confirmation_message,
      year: new Date().getFullYear().toString(),
    }

    // Render email HTML
    const emailHtml = await renderEmailTemplate(emailVariables)

    // Send via email service (placeholder - implement with SendGrid/Resend/etc)
    await sendEmailViaProvider({
      from: template.from_email,
      fromName: template.from_name || organization.name,
      to: booking.customer_email,
      replyTo: template.reply_to_email,
      subject: template.confirmation_subject,
      html: emailHtml,
    })

    // Log email sent
    await client.from('email_sent').insert({
      organization_id: organization.id,
      booking_id: booking.id,
      customer_email: booking.customer_email,
      template_type: 'confirmation',
      status: 'sent',
    })

    console.log(`✅ Booking confirmation sent to ${booking.customer_email}`)
  } catch (error) {
    console.error('Error sending booking confirmation:', error)
    // Log failure (retry logic would be implemented here)
    throw error
  }
}

interface EmailPayload {
  from: string
  fromName: string
  to: string
  replyTo?: string
  subject: string
  html: string
}

/**
 * Send email via provider (SendGrid, Resend, etc.)
 * Placeholder - implement with your email service
 */
async function sendEmailViaProvider(payload: EmailPayload): Promise<void> {
  // TODO: Implement actual email sending with SendGrid/Resend
  // For now, log to console
  console.log('📧 Email payload ready for sending:', {
    from: payload.from,
    to: payload.to,
    subject: payload.subject,
    htmlLength: payload.html.length,
  })

  // Example with SendGrid (commented out - requires SENDGRID_API_KEY):
  // const sgMail = require('@sendgrid/mail');
  // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  // await sgMail.send({
  //   from: payload.from,
  //   to: payload.to,
  //   replyTo: payload.replyTo,
  //   subject: payload.subject,
  //   html: payload.html,
  // });
}
