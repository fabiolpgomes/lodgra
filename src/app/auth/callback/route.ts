import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/'

  // Handle password recovery
  if (code && type === 'recovery') {
    // For recovery flow, redirect directly to reset-password-confirm with code
    // The client-side component will handle the token exchange
    return NextResponse.redirect(`${origin}/auth/reset-password-confirm?code=${code}`)
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Após session estar ativa, verificar e criar perfil se necessário
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        // Verificar se já tem perfil
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('id', user.id)
          .single()

        // Se não tem perfil, criar via admin client (sem depender de sessão)
        if (!profile) {
          try {
            const baseSlug = (user.email || 'user').split('@')[0].toLowerCase().slice(0, 20)
            const uniqueSuffix = user.id.slice(0, 8)
            const orgSlug = `${baseSlug}-${uniqueSuffix}`

            const adminClient = createAdminClient()

            // Criar organização
            const { data: newOrg } = await adminClient
              .from('organizations')
              .insert({
                name: user.user_metadata?.full_name || user.email || 'New Organization',
                slug: orgSlug,
                subscription_status: 'trial',
                plan: 'starter',
              })
              .select('id')
              .single()

            if (newOrg) {
              // Detectar se é Google OAuth ou outro provider
              const isOAuthUser = user.app_metadata?.providers?.includes('google') ||
                                  user.identities?.some((id: { provider: string }) => id.provider === 'google')

              // OAuth users: skip password change (já foram autenticados pelo provider)
              // Email users: require password change on first login
              await adminClient.from('user_profiles').insert({
                id: user.id,
                email: user.email,
                full_name: user.user_metadata?.full_name || '',
                role: 'viewer',
                access_all_properties: false,
                organization_id: newOrg.id,
                requires_password_change: !isOAuthUser, // FALSE para OAuth, TRUE para email
                password_changed_at: isOAuthUser ? new Date().toISOString() : null,
              })
            }
          } catch (err) {
            console.error('Erro ao create profile no callback:', err)
            // Continuar — não bloquear callback (trigger de fallback vai tentar)
          }
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth_error`)
}
