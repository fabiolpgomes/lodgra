import { RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { SyncPanel } from '@/components/features/sync/SyncPanel'
import { AuthLayout } from '@/components/common/layout/AuthLayout'
import { PremiumPageHeader, PremiumPageShell } from '@/components/common/layout/PremiumPage'
import { getUserPropertyIds } from '@/lib/auth/getUserProperties'

export default async function SyncPage() {
  const supabase = await createClient()
  const propertyIds = await getUserPropertyIds(supabase)

  // Buscar propriedades (filtradas por escopo)
  let propertiesQuery = supabase
    .from('properties')
    .select('id, name, ical_export_token')
    .eq('is_active', true)
    .order('name')
  if (propertyIds) propertiesQuery = propertiesQuery.in('id', propertyIds)
  const { data: properties } = await propertiesQuery

  // Buscar anúncios com URLs iCal (filtrados por escopo)
  let listingsQuery = supabase
    .from('property_listings')
    .select(`
      id,
      ical_url,
      last_synced_at,
      sync_enabled,
      property_id,
      properties!inner(
        id,
        name
      ),
      platforms(
        display_name
      )
    `)
    .eq('is_active', true)
    .not('ical_url', 'is', null)
    .order('property_id')
  if (propertyIds) listingsQuery = listingsQuery.in('property_id', propertyIds)
  const { data: listings } = await listingsQuery

  return (
    <AuthLayout>
      <PremiumPageShell>
        <PremiumPageHeader
          title="Sincronização iCal"
          description="Importe e exporte calendários de reservas com plataformas externas"
          badge={`${(listings || []).length} anúncios`}
          icon={RefreshCw}
        />

        <SyncPanel 
          properties={properties || []}
          listings={(listings || []) as unknown as Parameters<typeof SyncPanel>[0]['listings']}
        />
      </PremiumPageShell>
    </AuthLayout>
  )
}
