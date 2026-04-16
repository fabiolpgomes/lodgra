import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { defaultLocale } from '@/i18n.config'

/**
 * /onboarding — Redirects to locale-specific onboarding page
 */
export default async function OnboardingRedirect() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('preferred_locale')
    .eq('id', user.id)
    .maybeSingle()

  const locale = profile?.preferred_locale || defaultLocale
  redirect(`/${locale}/onboarding`)
}
