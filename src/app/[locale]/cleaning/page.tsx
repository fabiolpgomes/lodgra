import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AuthLayout } from '@/components/common/layout/AuthLayout'
import { CleaningPageClient } from '@/components/features/cleaning/CleaningPageClient'

export default async function CleaningPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/login`)

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.organization_id) redirect('/')

  const { data: properties } = await supabase
    .from('properties')
    .select('id, name')
    .eq('organization_id', profile.organization_id)
    .eq('is_active', true)
    .order('name')

  const { data: members } = ['admin', 'manager'].includes(profile.role)
    ? await supabase
        .from('user_profiles')
        .select('id, full_name, role')
        .eq('organization_id', profile.organization_id)
    : { data: [] }

  return (
    <AuthLayout>
      <CleaningPageClient
        properties={properties ?? []}
        members={members ?? []}
        userRole={profile.role}
        userId={user.id}
      />
    </AuthLayout>
  )
}
