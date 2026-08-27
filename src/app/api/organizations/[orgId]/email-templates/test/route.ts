import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  normalizeEmailTemplateRow,
  buildDefaultEmailTemplate,
} from '@/lib/email/email-template-config'
import { generateUnsubscribeToken, renderEmailTemplate } from '@/lib/email/render-template'
import { getVerifiedFromEmail } from '@/lib/email/security'
import {
  BOOKING_STANDARD_VERSION,
  getBookingConfirmationSubject,
  getBookingEmailCopy,
  formatBookingDate,
} from '@/lib/email/booking-locale'

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY
  return apiKey ? new Resend(apiKey) : null
}

export async function POST(_request: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  const auth = await requireRole(['admin'])
  if (!auth.authorized) return auth.response!

  const { orgId } = await params
  if (!orgId || auth.organizationId !== orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const client = await createAdminClient()
  const { data: organization, error: orgError } = await client
    .from('organizations')
    .select('id, name, slug')
    .eq('id', orgId)
    .maybeSingle()

  if (orgError) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  if (!organization) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  const { data: template } = await client
    .from('organization_email_templates')
    .select('*')
    .eq('organization_id', orgId)
    .maybeSingle()

  const { data: branding } = await client
    .from('organization_branding')
    .select('logo_url, primary_color, secondary_color, accent_color')
    .eq('organization_id', orgId)
    .maybeSingle()

  const normalized = normalizeEmailTemplateRow(
    template,
    organization.name,
    orgId,
    organization.slug,
    branding
  )

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const recipient = user?.email || normalized.reply_to_email || process.env.EMAIL_ADMIN
  if (!recipient) {
    return NextResponse.json({ error: 'No recipient email available' }, { status: 400 })
  }

  const resend = getResendClient()
  if (!resend) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
  }

  const unsubscribeToken = generateUnsubscribeToken(orgId, recipient)
  let fromAddress: string
  try {
    fromAddress = getVerifiedFromEmail(organization.slug, normalized.from_email)
  } catch (error) {
    console.warn('[email-test] Invalid from_email detected, falling back to verified sender:', error)
    fromAddress = `noreply@${organization.slug}.lodgra.io`
  }

  const html = await renderEmailTemplate({
    subject: normalized.confirmation_subject || buildDefaultEmailTemplate(organization.name, organization.slug).confirmation_subject || getBookingConfirmationSubject(organization.name, 'pt-PT'),
    organizationName: organization.name,
    customerName: user?.email ? user.email.split('@')[0] : 'Admin',
    reservationNumber: 'AHS-TEST-001',
    nights: '3',
    guestCount: '2',
    propertyName: 'Email Template Preview',
    checkInDate: formatBookingDate(new Date().toISOString(), 'pt-PT'),
    checkOutDate: formatBookingDate(new Date(Date.now() + 86400000).toISOString(), 'pt-PT'),
    totalPrice: '1250.00',
    currency: 'EUR',
    bookingUrl: `https://${organization.slug}.lodgra.io/booking`,
    unsubscribeUrl: `https://lodgra.io/unsubscribe?token=${unsubscribeToken}`,
    templateVersion: BOOKING_STANDARD_VERSION,
    logoUrl: normalized.include_company_logo ? normalized.branding.logo_url : null,
    primaryColor: normalized.branding.primary_color,
    replyToEmail: normalized.reply_to_email || recipient,
    footerText: normalized.footer_text,
    confirmationMessage: normalized.confirmation_message,
    year: new Date().getFullYear().toString(),
    copy: getBookingEmailCopy('pt-PT'),
  })

  const subject = `${normalized.confirmation_subject || getBookingConfirmationSubject(organization.name, 'pt-PT')} - Teste`
  const { error } = await resend.emails.send({
    from: `${organization.name} <${fromAddress}>`,
    to: recipient,
    replyTo: normalized.reply_to_email || undefined,
    subject,
    html,
  })

  if (error) {
    return NextResponse.json({ error: 'Failed to send test email', details: error }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    recipient,
    subject,
    template: normalized,
  })
}
