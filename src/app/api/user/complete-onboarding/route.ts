import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/client'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/user/complete-onboarding — promover usuário para admin após completar onboarding
export async function POST(request: NextRequest) {
  const supabase = createClient()

  // Verificar autenticação
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  // Obter role atual do usuário
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })
  }

  // Se já é admin, não fazer nada (evitar promessas múltiplas)
  if (profile.role === 'admin') {
    return NextResponse.json({ success: true, message: 'Já é administrador' })
  }

  // Promover para admin (usando admin client para bypass RLS)
  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('user_profiles')
    .update({ role: 'admin', updated_at: new Date().toISOString() })
    .eq('id', user.id)
    .eq('organization_id', profile.organization_id)

  if (error) {
    console.error('Erro ao promover usuário para admin:', error)
    return NextResponse.json(
      { error: 'Erro ao completar onboarding' },
      { status: 500 }
    )
  }

  // Revalidar caches de páginas que podem ter mudado
  revalidatePath('/properties')
  revalidatePath('/dashboard')
  revalidatePath('/')

  return NextResponse.json({
    success: true,
    message: 'Onboarding concluído! Você é agora administrador.',
  })
}
