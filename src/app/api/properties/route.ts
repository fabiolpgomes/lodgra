import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPlanLimits } from '@/lib/billing/plans'

// POST /api/properties — criar nova propriedade (usado no onboarding)
export async function POST(request: NextRequest) {
  const auth = await requireRole(['admin', 'gestor'])
  if (!auth.authorized) return auth.response!

  const body = await request.json()
  const { name, address } = body

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Nome da propriedade é obrigatório' }, { status: 400 })
  }

  if (!auth.organizationId) {
    return NextResponse.json({ error: 'Organização não encontrada' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  // Check property limit for plan
  const { data: org } = await adminClient
    .from('organizations')
    .select('subscription_plan')
    .eq('id', auth.organizationId)
    .single()

  const limits = getPlanLimits(org?.subscription_plan)

  if (limits.maxProperties !== null) {
    const { count } = await adminClient
      .from('properties')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', auth.organizationId)
      .eq('is_active', true)

    if ((count ?? 0) >= limits.maxProperties) {
      return NextResponse.json(
        { error: 'property_limit_reached', limit: limits.maxProperties, plan: org?.subscription_plan ?? 'starter' },
        { status: 403 }
      )
    }
  }

  const { data, error } = await adminClient
    .from('properties')
    .insert({
      name: name.trim(),
      address: address?.trim() || null,
      is_active: true,
      organization_id: auth.organizationId,
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Criar relação utilizador-propriedade (associar criador à propriedade)
  const { error: relError } = await adminClient
    .from('user_properties')
    .insert({
      user_id: auth.userId,
      property_id: data.id,
    })

  if (relError) {
    console.error('Erro ao associar propriedade ao utilizador:', relError)
    // Não bloqueia a resposta, mas registra o erro
  }

  return NextResponse.json({ id: data.id })
}
