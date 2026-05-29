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
  const adminClient = createAdminClient()

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
      const adminClient = createAdminClient()
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
      const adminClient = createAdminClient()
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
        existingPropertyId: existingProperty?.id ?? null,
      })
    } catch (error) {
      console.warn('[organization/setup] Checkout organization update failed:', error)
      return NextResponse.json({ error: 'Pagamento ainda não confirmado' }, { status: 409 })
    }
  }

  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const adminClient = createAdminClient()

  const { data: profile } = await adminClient
    .from('user_profiles')
    .select('id, organization_id')
    .eq('id', user.id)
    .maybeSingle()

  const baseSlug = toSlug(orgName.trim())
  const existingOrgId = profile?.organization_id ?? null

  // Ensure slug is unique — append suffix if needed
  let slug = baseSlug
  let attempt = 0
  while (attempt < 10) {
    let query = adminClient
      .from('organizations')
      .select('id')
      .eq('slug', slug)

    if (existingOrgId) {
      query = query.neq('id', existingOrgId)
    }

    const { data: existing } = await query.maybeSingle()
    if (!existing) break
    attempt++
    slug = `${baseSlug}-${attempt}`
  }

  if (!existingOrgId) {
    const { data: newOrg, error: orgError } = await adminClient
      .from('organizations')
      .insert({
        name: orgName.trim(),
        slug,
        subscription_status: 'trialing',
        plan: 'essencial',
        subscription_plan: 'essencial',
      })
      .select('id')
      .single()

    if (orgError || !newOrg) {
      console.error('[organization/setup] Create org error:', orgError)
      return NextResponse.json({ error: 'Erro ao criar organização' }, { status: 500 })
    }

    const profilePayload = {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || '',
      role: 'viewer',
      access_all_properties: false,
      organization_id: newOrg.id,
    }

    const { error: profileError } = profile
      ? await adminClient
        .from('user_profiles')
        .update({
          organization_id: newOrg.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
      : await adminClient
        .from('user_profiles')
        .insert(profilePayload)

    if (profileError) {
      console.error('[organization/setup] Link profile error:', profileError)
      await adminClient.from('organizations').delete().eq('id', newOrg.id)
      return NextResponse.json({ error: 'Erro ao vincular organização' }, { status: 500 })
    }

    return NextResponse.json({ success: true, slug, existingPropertyId: null })
  }

  const { error } = await adminClient
    .from('organizations')
    .update({ name: orgName.trim(), slug, updated_at: new Date().toISOString() })
    .eq('id', existingOrgId)

  if (error) {
    console.error('[organization/setup] Error:', error)
    return NextResponse.json({ error: 'Erro ao guardar' }, { status: 500 })
  }

  const { data: existingProperty } = await adminClient
    .from('properties')
    .select('id')
    .eq('organization_id', existingOrgId)
    .eq('is_public', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({ success: true, slug, existingPropertyId: existingProperty?.id ?? null })
}
