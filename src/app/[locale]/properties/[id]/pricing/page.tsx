import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/requireRole'
import { PricingPageContent } from './pricing-content'

export const dynamic = 'force-dynamic'

export default async function PropertyPricingPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { id, locale } = await params

  const auth = await requireRole(['admin', 'gestor', 'viewer'])
  if (!auth) redirect('/login')

  const supabase = await createClient()

  const { data: property } = await supabase
    .from('properties')
    .select('id, name, organization_id, currency')
    .eq('id', id)
    .single()

  if (!property) notFound()

  return <PricingPageContent property={property} locale={locale} />
}
