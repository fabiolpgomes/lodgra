import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth/requireRole'
import { createAdminClient } from '@/lib/supabase/admin'
import { AuthLayout } from '@/components/common/layout/AuthLayout'
import { ChannelsClient } from './ChannelsClient'
import { Settings2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ChannelsSettingsPage() {
  // Feature flag — returns 404 if not enabled
  if (process.env.BOOKING_CHANNEL_ENABLED !== 'true') {
    redirect('/settings')
  }

  const auth = await requireRole(['admin', 'gestor'])
  if (!auth.authorized) redirect('/login')

  const adminClient = createAdminClient()

  // Fetch property listings for this org
  const { data: properties } = await adminClient
    .from('properties')
    .select('id, name')
    .eq('organization_id', auth.organizationId)

  const propertyIds = properties?.map((p) => p.id) ?? []

  const { data: listings } = await adminClient
    .from('property_listings')
    .select('id, name, property_id')
    .in('property_id', propertyIds)
    .eq('is_active', true)
    .order('name', { ascending: true })

  // Annotate listings with property name
  const propertyMap = Object.fromEntries((properties ?? []).map((p) => [p.id, p.name]))

  const enrichedListings = (listings ?? []).map((l) => ({
    id: l.id,
    name: l.name || '',
    property_name: propertyMap[l.property_id] || '',
  }))

  // Fetch existing channel_listings for booking channel
  const { data: channelConfigs } = await adminClient
    .from('channel_listings')
    .select('id, property_listing_id, external_id, last_synced_at, sync_count, channels!inner(name)')
    .eq('organization_id', auth.organizationId)
    .eq('channels.name', 'booking')

  const existingConfigs = (channelConfigs ?? []).map((c) => ({
    property_listing_id: c.property_listing_id ?? '',
    external_property_id: c.external_id,
    last_synced_at: c.last_synced_at ?? null,
    sync_count: c.sync_count ?? 0,
  }))

  return (
    <AuthLayout>
      <div className="max-w-3xl mx-auto py-8 px-4">
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
            <Settings2 className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Canais API
            </h1>
            <p className="text-sm text-gray-500">
              Ligue o Booking.com via API para importar reservas com dados completos
            </p>
          </div>
        </div>

        {/* Booking.com section */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-lg font-semibold text-gray-900">Booking.com</span>
            <span className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2.5 py-0.5">
              API Oficial
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-5">
            Introduza as credenciais por propriedade para receber reservas em tempo real com nome do hóspede,
            contacto e valor. Requer aprovação no{' '}
            <span className="font-medium text-gray-700">Booking.com Connectivity Program</span>.
          </p>

          <ChannelsClient
            listings={enrichedListings}
            existingConfigs={existingConfigs}
          />
        </div>

        {/* Info box */}
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
          <p className="font-medium mb-1">Sobre a integração API</p>
          <ul className="list-disc list-inside space-y-1 text-amber-700">
            <li>As credenciais são armazenadas de forma segura e nunca expostas ao cliente</li>
            <li>A sincronização inicial importa os últimos 90 dias de reservas</li>
            <li>O iCal continua activo para propriedades sem API configurada</li>
            <li>Novas reservas chegam automaticamente via webhook em tempo real</li>
          </ul>
        </div>
      </div>
    </AuthLayout>
  )
}
