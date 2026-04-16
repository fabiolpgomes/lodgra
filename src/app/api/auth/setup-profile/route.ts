import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/auth/setup-profile — criar organização e perfil para novo usuário
// Chamado após signup e após confirmação de email
export async function POST(request: NextRequest) {
  const supabase = createClient()

  // Verificar autenticação
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  // Verificar se já tem perfil (idempotente)
  const { data: existingProfile } = await supabase
    .from('user_profiles')
    .select('id, organization_id')
    .eq('id', user.id)
    .single()

  if (existingProfile) {
    // Já tem perfil, retornar sucesso (já foi inicializado)
    return NextResponse.json({
      success: true,
      message: 'Perfil já existe',
      organization_id: existingProfile.organization_id,
    })
  }

  const adminClient = createAdminClient()

  // Gerar slug único para a organização
  const baseSlug = (user.email || 'user').split('@')[0].toLowerCase().slice(0, 20)
  const uniqueSuffix = user.id.slice(0, 8)
  const orgSlug = `${baseSlug}-${uniqueSuffix}`

  // 1. Criar nova organização
  const { data: newOrg, error: orgError } = await adminClient
    .from('organizations')
    .insert({
      name: user.user_metadata?.full_name || user.email || 'New Organization',
      slug: orgSlug,
      subscription_status: 'trial',
      plan: 'starter',
    })
    .select('id')
    .single()

  if (orgError || !newOrg) {
    console.error('Erro ao criar organização:', orgError)
    return NextResponse.json(
      { error: 'Erro ao criar organização' },
      { status: 500 }
    )
  }

  // 2. Criar perfil do usuário com organization_id
  const { error: profileError } = await adminClient
    .from('user_profiles')
    .insert({
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || '',
      role: 'viewer', // Será promovido a admin após onboarding
      access_all_properties: false,
      organization_id: newOrg.id,
    })

  if (profileError) {
    console.error('Erro ao criar perfil:', profileError)
    // Tentar deletar a organização criada (limpeza)
    await adminClient.from('organizations').delete().eq('id', newOrg.id)
    return NextResponse.json(
      { error: 'Erro ao criar perfil' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    message: 'Perfil criado com sucesso',
    organization_id: newOrg.id,
  })
}
