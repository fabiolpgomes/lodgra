import { RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { SyncPanel } from '@/components/sync/SyncPanel'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { getUserPropertyIds } from '@/lib/auth/getUserProperties'

export default async function SyncPage() {
  const supabase = await createClient()
  const propertyIds = await getUserPropertyIds(supabase)

  // Buscar propriedades (filtradas por escopo)
  let propertiesQuery = supabase
    .from('properties')
    .select('id, name')
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <RefreshCw className="h-8 w-8 text-blue-600" />
            <h2 className="text-3xl font-bold text-gray-900">Sincronização iCal</h2>
          </div>
          <p className="text-gray-600">
            Importe e exporte calendários de reservas com plataformas externas
          </p>
        </div>

        {/* Sync Panel */}
        <SyncPanel 
          properties={properties || []}
          listings={(listings || []) as unknown as Parameters<typeof SyncPanel>[0]['listings']}
        />
      </main>
    </AuthLayout>
  )
}
