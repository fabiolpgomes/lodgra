import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'
import { createAdminClient } from '@/lib/supabase/admin'

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40)
}

// POST /api/organization/setup — update org name and generate slug during onboarding
export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { orgName } = await request.json()
  if (!orgName?.trim()) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) {
    return NextResponse.json({ error: 'Organização não encontrada' }, { status: 404 })
  }

  const adminClient = createAdminClient()
  const baseSlug = toSlug(orgName.trim())

  // Ensure slug is unique — append suffix if needed
  let slug = baseSlug
  let attempt = 0
  while (attempt < 10) {
    const { data: existing } = await adminClient
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .neq('id', profile.organization_id)
      .single()
    if (!existing) break
    attempt++
    slug = `${baseSlug}-${attempt}`
  }

  const { error } = await adminClient
    .from('organizations')
    .update({ name: orgName.trim(), slug })
    .eq('id', profile.organization_id)

  if (error) {
    console.error('[organization/setup] Error:', error)
    return NextResponse.json({ error: 'Erro ao guardar' }, { status: 500 })
  }

  return NextResponse.json({ success: true, slug })
}
