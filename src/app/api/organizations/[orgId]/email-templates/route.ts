import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  buildDefaultEmailTemplate,
  normalizeEmailTemplateRow,
  validateEmailTemplateInput,
  type EmailTemplateInput,
} from '@/lib/email/email-template-config'
import { getVerifiedFromEmail } from '@/lib/email/security'

async function getOrganizationContext(orgId: string) {
  const adminClient = await createAdminClient()

  const [{ data: organization, error: orgError }, { data: branding, error: brandingError }, { data: template, error: templateError }] = await Promise.all([
    adminClient.from('organizations').select('id, name, slug').eq('id', orgId).maybeSingle(),
    adminClient
      .from('organization_branding')
      .select('logo_url, primary_color, secondary_color, accent_color')
      .eq('organization_id', orgId)
      .maybeSingle(),
    adminClient.from('organization_email_templates').select('*').eq('organization_id', orgId).maybeSingle(),
  ])

  if (orgError) {
    return { error: 'Database error', status: 500 as const }
  }

  if (!organization) {
    return { error: 'Organization not found', status: 404 as const }
  }

  if (brandingError && brandingError.code !== 'PGRST116') {
    return { error: 'Database error', status: 500 as const }
  }

  if (templateError && templateError.code !== 'PGRST116') {
    return { error: 'Database error', status: 500 as const }
  }

  const normalized = normalizeEmailTemplateRow(
    template,
    organization.name,
    orgId,
    organization.slug,
    branding
  )

  return { organization, template: normalized, adminClient }
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  const auth = await requireRole(['admin'])
  if (!auth.authorized) return auth.response!

  const { orgId } = await params
  if (!orgId || auth.organizationId !== orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const context = await getOrganizationContext(orgId)
  if ('error' in context) {
    return NextResponse.json({ error: context.error }, { status: context.status })
  }

  return NextResponse.json({
    ...context.template,
    defaults: buildDefaultEmailTemplate(context.organization.name, context.organization.slug),
  })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ orgId: string }> }) {
  const auth = await requireRole(['admin'])
  if (!auth.authorized) return auth.response!

  const { orgId } = await params
  if (!orgId || auth.organizationId !== orgId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = validateEmailTemplateInput((await request.json()) as EmailTemplateInput)
  if (parsed.ok === false) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const context = await getOrganizationContext(orgId)
  if ('error' in context) {
    return NextResponse.json({ error: context.error }, { status: context.status })
  }

  try {
    if (parsed.value.from_email) {
      getVerifiedFromEmail(context.organization.slug, parsed.value.from_email)
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'from_email inválido' },
      { status: 400 },
    )
  }

  const payload = {
    organization_id: orgId,
    confirmation_subject: parsed.value.confirmation_subject ?? buildDefaultEmailTemplate(context.organization.name, context.organization.slug).confirmation_subject,
    confirmation_message: parsed.value.confirmation_message ?? null,
    from_email: parsed.value.from_email ?? buildDefaultEmailTemplate(context.organization.name, context.organization.slug).from_email,
    from_name: parsed.value.from_name ?? context.organization.name,
    reply_to_email: parsed.value.reply_to_email ?? null,
    include_company_logo: parsed.value.include_company_logo ?? true,
    footer_text: parsed.value.footer_text ?? null,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await context.adminClient
    .from('organization_email_templates')
    .upsert(payload, { onConflict: 'organization_id' })
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: 'Database save failed' }, { status: 500 })
  }

  const branding = await context.adminClient
    .from('organization_branding')
    .select('logo_url, primary_color, secondary_color, accent_color')
    .eq('organization_id', orgId)
    .maybeSingle()

  return NextResponse.json(
    normalizeEmailTemplateRow(
      data,
      context.organization.name,
      orgId,
      context.organization.slug,
      branding.data
    )
  )
}
