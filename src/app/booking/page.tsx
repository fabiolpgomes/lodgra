import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { BookingPageClient } from './BookingPageClient'

export default async function BookingPage() {
  const hdrs = await headers()
  const orgSlug = hdrs.get('x-org-slug') ?? null

  let orgName: string | null = null
  if (orgSlug) {
    const supabase = createAdminClient()
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('slug', orgSlug)
      .single()
    orgName = org?.name ?? null
  }

  return <BookingPageClient orgSlug={orgSlug} orgName={orgName} />
}
