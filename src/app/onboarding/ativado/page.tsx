import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { invalidateCachedProfile } from '@/lib/cache/profileCache'
import { redirect } from 'next/navigation'
import { defaultLocale } from '../../../../i18n.config'

export const dynamic = 'force-dynamic'

// Página de aterragem após checkout Stripe bem-sucedido (onboarding flow).
// Promove o utilizador para admin e redireciona para o dashboard.
export default async function OnboardingAtivadoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, organization_id, preferred_locale')
    .eq('id', user.id)
    .single()

  if (profile && profile.role !== 'admin' && profile.organization_id) {
    const adminClient = createAdminClient()
    await adminClient
      .from('user_profiles')
      .update({ role: 'admin', updated_at: new Date().toISOString() })
      .eq('id', user.id)

    await invalidateCachedProfile(user.id)
  }

  const locale = profile?.preferred_locale || defaultLocale
  redirect(`/${locale}/dashboard`)
}
