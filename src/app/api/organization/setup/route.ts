import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getOrganizationFromCheckoutSession,
  updateCheckoutOrganizationName,
} from '@/lib/onboarding/checkout-session'

function toSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40)

  return slug || 'empresa'
}

async function getUserOrganization(userId: string) {
  const adminClient = await createAdminClient()

  const { data: profile } = await adminClient
    .from('user_profiles')
    .select('id, organization_id')
    .eq('id', userId)
    .maybeSingle()

  if (!profile?.organization_id) {
    return { profile, org: null, existingPropertyId: null }
  }

  const { data: org } = await adminClient
    .from('organizations')
    .select('id, name, slug, subscription_plan, subscription_status')
    .eq('id', profile.organization_id)
    .maybeSingle()

  const { data: existingProperty } = await adminClient
    .from('properties')
    .select('id')
    .eq('organization_id', profile.organization_id)
    .eq('is_public', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  return {
    profile,
    org,
    existingPropertyId: existingProperty?.id ?? null,
  }
}

// GET /api/organization/setup — return current onboarding organization state
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('session_id')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (sessionId) {
    try {
      const { organization, organizationCode } = await getOrganizationFromCheckoutSession(sessionId)
      const adminClient = await createAdminClient()
      const { data: existingProperty } = await adminClient
        .from('properties')
        .select('id')
        .eq('organization_id', organization.id)
        .eq('is_public', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      return NextResponse.json({
        organization,
        organizationCode,
        organizationId: organization.id,
        existingPropertyId: existingProperty?.id ?? null,
      })
    } catch (error) {
      console.warn('[organization/setup] Checkout session access failed:', error)
      return NextResponse.json({ error: 'Pagamento ainda não confirmado' }, { status: 409 })
    }
  }

  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { org, existingPropertyId } = await getUserOrganization(user.id)

  return NextResponse.json({
    organization: org,
    organizationCode: org?.id ?? null,
    organizationId: org?.id ?? null,
    existingPropertyId,
  })
}

// POST /api/organization/setup — update org name and generate slug during onboarding
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { orgName, session_id: sessionId } = await request.json()
  if (!orgName?.trim()) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })

  if (sessionId) {
    try {
      const { organization, organizationCode } = await updateCheckoutOrganizationName(sessionId, orgName.trim())
      const adminClient = await createAdminClient()
      const { data: existingProperty } = await adminClient
        .from('properties')
        .select('id')
        .eq('organization_id', organization.id)
        .eq('is_public', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      return NextResponse.json({
        success: true,
        slug: organization.slug,
        organizationCode,
        organizationId: organization.id,
        existingPropertyId: existingProperty?.id ?? null,
      })
    } catch (error) {
      console.warn('[organization/setup] Checkout organization update failed:', error)
      return NextResponse.json({ error: 'Pagamento ainda não confirmado' }, { status: 409 })
    }
  }

  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, organization_id')
    .eq('id', user.id)
    .maybeSingle()

  const baseSlug = toSlug(orgName.trim())
  const existingOrgId = profile?.organization_id ?? null

  if (!existingOrgId) {
    const { data, error } = await supabase.rpc('ensure_my_organization', {
      p_name: orgName.trim(),
      p_slug: baseSlug,
    })
    const organization = data?.[0]

    if (error || !organization) {
      console.error('[organization/setup] Provision org error:', error)
      return NextResponse.json({ error: 'Erro ao criar organização' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      slug: organization.organization_slug,
      existingPropertyId: null,
    })
  }

  const { data, error } = await supabase.rpc('update_my_organization', {
    p_name: orgName.trim(),
    p_slug: baseSlug,
  })
  const organization = data?.[0]

  if (error || !organization) {
    console.error('[organization/setup] Error:', error)
    return NextResponse.json({ error: 'Erro ao guardar' }, { status: 500 })
  }

  const adminClient = await createAdminClient()
  const { data: existingProperty } = await adminClient
    .from('properties')
    .select('id')
    .eq('organization_id', existingOrgId)
    .eq('is_public', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({
    success: true,
    slug: organization.organization_slug,
    organizationId: organization.organization_id,
    existingPropertyId: existingProperty?.id ?? null,
  })
}
