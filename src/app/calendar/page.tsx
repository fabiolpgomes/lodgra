import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { defaultLocale } from '@/i18n.config'

/**
 * /calendar — Redirects to locale-specific calendar or dashboard based on role, preserving search params
 */
export default async function CalendarRedirect({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const params = await searchParams
  const query = new URLSearchParams(params as any).toString()
  const suffix = query ? `?${query}` : ''

  if (!user) {
    redirect(`/login${suffix}`)
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, preferred_locale')
    .eq('id', user.id)
    .maybeSingle()

  const locale = profile?.preferred_locale || defaultLocale

  if (profile?.role === 'admin') {
    redirect(`/${locale}/dashboard${suffix}`)
  } else {
    redirect(`/${locale}/calendar${suffix}`)
  }
}
