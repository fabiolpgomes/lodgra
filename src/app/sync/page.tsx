import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { defaultLocale } from '@/i18n.config'

/**
 * /sync — Redirects to locale-specific sync page
 */
export default async function SyncRedirect() {
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
  redirect(`/${locale}/sync`)
}
