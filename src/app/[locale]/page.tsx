import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

/**
 * /[locale] — Redirects to dashboard or calendar based on user role
 */
export default async function LocalizedRootPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If not authenticated, we could show landing page here too, 
  // but usually /[locale] for auth'd users should go to their app home.
  if (!user) {
    redirect(`/${locale}/login`)
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  // Admin and Gestor go to Dashboard, others (Staff/Owner) go to Calendar
  if (profile?.role === 'admin' || profile?.role === 'gestor') {
    redirect(`/${locale}/dashboard`)
  } else {
    redirect(`/${locale}/calendar`)
  }
}
