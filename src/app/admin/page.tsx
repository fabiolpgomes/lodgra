import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { defaultLocale } from '@/i18n.config'

/**
 * /admin — Redirects to locale-specific admin page
 */
export default async function AdminRedirect() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, preferred_locale')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role !== 'admin') {
    redirect('/')
  }

  const locale = profile?.preferred_locale || defaultLocale
  redirect(`/${locale}/admin`)
}
