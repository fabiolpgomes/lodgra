'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { RefreshCw, Loader } from 'lucide-react'

interface Listing {
  id: string
  name: string
  ical_url: string | null
  sync_enabled: boolean
  is_active: boolean
  last_synced_at: string | null
  last_sync_error?: string | null
  sync_error_count?: number
  property_id: string
  platforms?: PlatformInfo | PlatformInfo[] | null
}

interface PlatformInfo {
  display_name?: string | null
  name?: string | null
}

function getPlatformName(listing: Listing): string {
  const platform = Array.isArray(listing.platforms) ? listing.platforms[0] : listing.platforms
  return platform?.display_name || platform?.name || listing.name || 'Canal externo'
}

interface ICalSyncSettingsProps {
  listings: Listing[]
  properties: Array<{ id: string; name: string }>
  locale: string
}

export function ICalSyncSettings({ listings, properties, locale }: ICalSyncSettingsProps) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<Record<string, { url: string; enabled: boolean }>>({})
  const listingsByProperty = useMemo(() => {
    const grouped = new Map<string, Listing[]>()
    for (const listing of listings) {
      const propertyListings = grouped.get(listing.property_id) || []
      propertyListings.push(listing)
      grouped.set(listing.property_id, propertyListings)
    }
    return grouped
  }, [listings])

  const handleEditStart = (listing: Listing) => {
    setEditingId(listing.id)
    setFormData(prev => ({
      ...prev,
      [listing.id]: { url: listing.ical_url || '', enabled: listing.sync_enabled }
    }))
  }

  const handleSave = async (listingId: string) => {
    const data = formData[listingId]
    if (!data) return

    try {
      const response = await fetch(`/api/property-listings/${listingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ical_url: data.url || null,
          sync_enabled: data.enabled
        })
      })

      if (!response.ok) {
        const error = await response.json()
        alert(`Erro: ${error.error}`)
        return
      }

      setEditingId(null)
      router.refresh()
    } catch (error) {
        alert(`Erro ao guardar: ${error instanceof Error ? error.message : 'desconhecido'}`)
    }
  }

  const handleSync = async (listing: Listing) => {
    const listingId = listing.id
    setSyncingId(listingId)
    try {
      const response = await fetch('/api/sync/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property_ids: [listing.property_id] })
      })

      if (!response.ok) {
        const error = await response.json()
        alert(`Erro ao sincronizar: ${error.error}`)
        return
      }

      alert('Sincronização concluída')
      router.refresh()
    } catch (error) {
        alert(`Erro: ${error instanceof Error ? error.message : 'desconhecido'}`)
    } finally {
      setSyncingId(null)
    }
  }

  if (properties.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
        Nenhuma propriedade cadastrada
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {properties.map(property => {
        const propertyListings = listingsByProperty.get(property.id) || []
        return (
        <section key={property.id} className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="font-semibold text-gray-900">{property.name}</h3>
            <Link href={`/${locale}/properties/${property.id}`} className="text-xs font-medium text-brand-600 hover:text-brand-700">
              Gerenciar anúncios
            </Link>
          </div>
          {propertyListings.length === 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Nenhum canal associado. Crie um anúncio para Booking.com e/ou Airbnb antes de importar o iCal.
            </div>
          ) : propertyListings.map(listing => (
        <div key={listing.id} className="mt-3 rounded-lg border border-gray-200 p-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h4 className="font-medium text-gray-900">
                {getPlatformName(listing)}
              </h4>
              {listing.last_synced_at && (
                <p className="text-xs text-gray-600 mt-1">
                  Última sincronização: {new Date(listing.last_synced_at).toLocaleDateString('pt-PT')} às{' '}
                  {new Date(listing.last_synced_at).toLocaleTimeString('pt-PT')}
                </p>
              )}
            </div>
            <span className={`text-xs px-2 py-1 rounded ${listing.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'}`}>
              {listing.is_active ? 'Ativo' : 'Inativo'}
            </span>
          </div>

          {listing.last_sync_error && (
            <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs font-medium text-red-700">⚠️ Erro na última sincronização</p>
              <p className="text-xs text-red-600 mt-1">{listing.last_sync_error}</p>
              {listing.sync_error_count && listing.sync_error_count > 1 && (
                <p className="text-xs text-red-600 mt-1">({listing.sync_error_count} tentativas falhadas)</p>
              )}
            </div>
          )}

          {editingId === listing.id ? (
            <div className="space-y-3 pt-3 border-t border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL iCal</label>
                <input
                  type="url"
                  value={formData[listing.id]?.url || ''}
                  onChange={e => setFormData(prev => ({
                    ...prev,
                    [listing.id]: { ...prev[listing.id], url: e.target.value }
                  }))}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData[listing.id]?.enabled || false}
                  onChange={e => setFormData(prev => ({
                    ...prev,
                    [listing.id]: { ...prev[listing.id], enabled: e.target.checked }
                  }))}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Ativar sincronização automática</span>
              </label>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  onClick={() => handleSave(listing.id)}
                  className="w-full px-3 py-1.5 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 sm:w-auto"
                >
                  Guardar
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="w-full px-3 py-1.5 text-sm font-medium bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 sm:w-auto"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 pt-3 border-t border-gray-200 sm:flex-row">
              <button
                onClick={() => handleEditStart(listing)}
                className="w-full px-3 py-1.5 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 sm:w-auto"
              >
                Editar
              </button>
              <button
                onClick={() => handleSync(listing)}
                disabled={syncingId === listing.id}
                className="flex w-full items-center gap-1 rounded-lg bg-emerald-100 px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-200 disabled:opacity-50 sm:w-auto"
              >
                {syncingId === listing.id ? (
                  <>
                    <Loader className="h-3 w-3 animate-spin" />
                  A sincronizar...
                </>
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3" />
                    Sincronizar agora
                  </>
                )}
              </button>
            </div>
          )}
        </div>
          ))}
        </section>
      )})}
    </div>
  )
}
