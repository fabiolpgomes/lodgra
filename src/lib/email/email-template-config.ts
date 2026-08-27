import { BOOKING_STANDARD_LOCALE, getBookingConfirmationSubject } from './booking-locale'

export type EmailTemplateRow = {
  id: string | null
  organization_id: string
  confirmation_subject: string | null
  confirmation_message: string | null
  from_email: string | null
  from_name: string | null
  reply_to_email: string | null
  include_company_logo: boolean | null
  footer_text: string | null
  created_at: string | null
  updated_at: string | null
}

export type EmailBrandingRow = {
  logo_url: string | null
  primary_color: string | null
  secondary_color: string | null
  accent_color: string | null
}

export type EmailTemplateResponse = EmailTemplateRow & {
  organization_name: string
  branding: {
    logo_url: string | null
    primary_color: string
    secondary_color: string
    accent_color: string
  }
}

export type EmailTemplateInput = {
  confirmation_subject?: string | null
  confirmation_message?: string | null
  from_email?: string | null
  from_name?: string | null
  reply_to_email?: string | null
  include_company_logo?: boolean | null
  footer_text?: string | null
}

export const DEFAULT_EMAIL_BRANDING = {
  logo_url: null,
  primary_color: '#1E40AF',
  secondary_color: '#6B7280',
  accent_color: '#FFC000',
}

export function buildDefaultEmailTemplate(
  organizationName: string,
  organizationSlug?: string | null,
): EmailTemplateRow {
  const now = new Date().toISOString()
  const safeDomain = organizationSlug ? `${organizationSlug.toLowerCase()}.lodgra.io` : 'lodgra.io'

  return {
    id: null,
    organization_id: '',
    confirmation_subject: getBookingConfirmationSubject(organizationName, BOOKING_STANDARD_LOCALE),
    confirmation_message: null,
    from_email: `noreply@${safeDomain}`,
    from_name: organizationName,
    reply_to_email: null,
    include_company_logo: true,
    footer_text: null,
    created_at: null,
    updated_at: now,
  }
}

export function normalizeEmailTemplateRow(
  template: Partial<EmailTemplateRow> | null | undefined,
  organizationName: string,
  organizationId: string,
  organizationSlug?: string | null,
  branding?: Partial<EmailBrandingRow> | null
): EmailTemplateResponse {
  const defaults = buildDefaultEmailTemplate(organizationName, organizationSlug)

  return {
    ...defaults,
    ...template,
    organization_id: organizationId,
    confirmation_subject: template?.confirmation_subject || defaults.confirmation_subject,
    confirmation_message: template?.confirmation_message ?? null,
    from_email: template?.from_email || defaults.from_email,
    from_name: template?.from_name || organizationName,
    reply_to_email: template?.reply_to_email || null,
    include_company_logo: template?.include_company_logo ?? true,
    footer_text: template?.footer_text || null,
    branding: {
      logo_url: branding?.logo_url ?? null,
      primary_color: branding?.primary_color || DEFAULT_EMAIL_BRANDING.primary_color,
      secondary_color: branding?.secondary_color || DEFAULT_EMAIL_BRANDING.secondary_color,
      accent_color: branding?.accent_color || DEFAULT_EMAIL_BRANDING.accent_color,
    },
    organization_name: organizationName,
  }
}

function isValidEmail(value: string | null | undefined): boolean {
  if (!value) return true
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function validateEmailTemplateInput(body: unknown):
  | { ok: true; value: Required<Pick<EmailTemplateInput, 'include_company_logo'>> & EmailTemplateInput }
  | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Payload inválido' }
  }

  const payload = body as EmailTemplateInput
  const confirmation_subject = normalizeText(payload.confirmation_subject)
  const confirmation_message = normalizeText(payload.confirmation_message)
  const from_email = normalizeText(payload.from_email)
  const from_name = normalizeText(payload.from_name)
  const reply_to_email = normalizeText(payload.reply_to_email)
  const footer_text = normalizeText(payload.footer_text)
  const include_company_logo = payload.include_company_logo ?? true

  if (confirmation_subject && confirmation_subject.length > 100) {
    return { ok: false, error: 'Subject max 100 chars' }
  }

  if (confirmation_message && confirmation_message.length > 5000) {
    return { ok: false, error: 'Message max 5000 chars' }
  }

  if (from_email && !isValidEmail(from_email)) {
    return { ok: false, error: 'Email de remetente inválido' }
  }

  if (reply_to_email && !isValidEmail(reply_to_email)) {
    return { ok: false, error: 'Email de resposta inválido' }
  }

  if (from_name && from_name.length > 120) {
    return { ok: false, error: 'From name max 120 chars' }
  }

  if (footer_text && footer_text.length > 1000) {
    return { ok: false, error: 'Footer max 1000 chars' }
  }

  return {
    ok: true,
    value: {
      confirmation_subject,
      confirmation_message,
      from_email,
      from_name,
      reply_to_email,
      include_company_logo,
      footer_text,
    },
  }
}
