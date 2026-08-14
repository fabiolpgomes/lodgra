import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/auth/setup-profile — criar organização e perfil para novo usuário
// Chamado após signup e após confirmação de email
export async function POST(_request: NextRequest) {
  const supabase = await createClient()

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

  if (existingProfile?.organization_id) {
    // Já tem perfil, retornar sucesso (já foi inicializado)
    return NextResponse.json({
      success: true,
      message: 'Perfil já existe',
      organization_id: existingProfile.organization_id,
    })
  }

  // Legacy repair path. New signups are provisioned atomically by the database
  // trigger; this authenticated RPC only repairs accounts created before it.
  const baseSlug = (user.email || 'user')
    .split('@')[0]
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 20) || 'user'
  const uniqueSuffix = user.id.slice(0, 8)
  const orgSlug = `${baseSlug}-${uniqueSuffix}`

  const { data, error } = await supabase.rpc('ensure_my_organization', {
    p_name: user.user_metadata?.full_name || user.email || 'Nova organização',
    p_slug: orgSlug,
  })

  const organization = data?.[0]
  if (error || !organization) {
    console.error('Erro ao provisionar organização:', error)
    return NextResponse.json(
      { error: 'Erro ao provisionar organização' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    message: 'Perfil criado com sucesso',
    organization_id: organization.organization_id,
  })
}
