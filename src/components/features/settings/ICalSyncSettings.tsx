'use client'

import { useState } from 'react'
import { RefreshCw, Loader } from 'lucide-react'

interface Listing {
  id: string
  name: string
  ical_url: string | null
  sync_enabled: boolean
  is_active: boolean
  last_synced_at: string | null
}

interface ICalSyncSettingsProps {
  listings: Listing[]
  propertyId: string
}

export function ICalSyncSettings({ listings, propertyId }: ICalSyncSettingsProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<Record<string, { url: string; enabled: boolean }>>({})

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
      // Refresh would require parent component update
    } catch (error) {
      alert(`Erro ao guardar: ${error instanceof Error ? error.message : 'unknown'}`)
    }
  }

  const handleSync = async (listingId: string) => {
    setSyncingId(listingId)
    try {
      const response = await fetch('/api/sync/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property_ids: [propertyId] })
      })

      if (!response.ok) {
        const error = await response.json()
        alert(`Erro ao sincronizar: ${error.error}`)
        return
      }

      alert('Sincronização concluída')
      // Refresh would require parent component update
    } catch (error) {
      alert(`Erro: ${error instanceof Error ? error.message : 'unknown'}`)
    } finally {
      setSyncingId(null)
    }
  }

  if (listings.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
        Nenhum anúncio configurado para esta propriedade
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {listings.map(listing => (
        <div key={listing.id} className="rounded-lg border border-gray-200 p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-medium text-gray-900">{listing.name}</h3>
              {listing.last_synced_at && (
                <p className="text-xs text-gray-500 mt-1">
                  Última sincronização: {new Date(listing.last_synced_at).toLocaleDateString('pt-PT')} às{' '}
                  {new Date(listing.last_synced_at).toLocaleTimeString('pt-PT')}
                </p>
              )}
            </div>
            <span className={`text-xs px-2 py-1 rounded ${listing.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
              {listing.is_active ? 'Ativo' : 'Inativo'}
            </span>
          </div>

          {editingId === listing.id ? (
            <div className="space-y-3 pt-3 border-t border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">iCal URL</label>
                <input
                  type="url"
                  value={formData[listing.id]?.url || ''}
                  onChange={e => setFormData(prev => ({
                    ...prev,
                    [listing.id]: { ...prev[listing.id], url: e.target.value }
                  }))}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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

              <div className="flex gap-2">
                <button
                  onClick={() => handleSave(listing.id)}
                  className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Guardar
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="px-3 py-1.5 text-sm font-medium bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 pt-3 border-t border-gray-200">
              <button
                onClick={() => handleEditStart(listing)}
                className="px-3 py-1.5 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Editar
              </button>
              <button
                onClick={() => handleSync(listing.id)}
                disabled={syncingId === listing.id}
                className="px-3 py-1.5 text-sm font-medium bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50 flex items-center gap-1"
              >
                {syncingId === listing.id ? (
                  <>
                    <Loader className="h-3 w-3 animate-spin" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3" />
                    Sincronizar Agora
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
