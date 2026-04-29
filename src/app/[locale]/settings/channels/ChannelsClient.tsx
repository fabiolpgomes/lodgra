'use client'

import { useState } from 'react'
import { RefreshCw, Link2, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

interface PropertyListing {
  id: string
  name: string
  property_name: string
}

interface ChannelConfig {
  property_listing_id: string
  external_property_id: string
  last_synced_at: string | null
  sync_count: number
}

interface ChannelsClientProps {
  listings: PropertyListing[]
  existingConfigs: ChannelConfig[]
}

function formatRelativeTime(isoDate: string | null): string {
  if (!isoDate) return 'Nunca sincronizado'
  const diff = Date.now() - new Date(isoDate).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'há menos de 1 minuto'
  if (mins < 60) return `há ${mins} minuto${mins === 1 ? '' : 's'}`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `há ${hours} hora${hours === 1 ? '' : 's'}`
  const days = Math.floor(hours / 24)
  return `há ${days} dia${days === 1 ? '' : 's'}`
}

function ConnectForm({
  listing,
  existingConfig,
  onConnected,
}: {
  listing: PropertyListing
  existingConfig?: ChannelConfig
  onConnected: (config: ChannelConfig) => void
}) {
  const [externalId, setExternalId] = useState(
    existingConfig?.external_property_id ?? ''
  )
  const [apiKey, setApiKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const res = await fetch('/api/channels/booking/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_listing_id: listing.id,
          external_property_id: externalId.trim(),
          api_key: apiKey.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Erro ao ligar canal')
        return
      }

      setSuccess(true)
      setApiKey('') // clear sensitive field
      onConnected({
        property_listing_id: listing.id,
        external_property_id: externalId.trim(),
        last_synced_at: null,
        sync_count: 0,
      })
    } catch {
      setError('Erro de rede — tente novamente')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 mt-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label
            htmlFor={`ext-id-${listing.id}`}
            className="block text-xs font-medium text-gray-600 mb-1"
          >
            ID da Propriedade (Booking.com)
          </label>
          <input
            id={`ext-id-${listing.id}`}
            type="text"
            value={externalId}
            onChange={(e) => setExternalId(e.target.value)}
            placeholder="12345678"
            required
            disabled={loading}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
        </div>
        <div>
          <label
            htmlFor={`api-key-${listing.id}`}
            className="block text-xs font-medium text-gray-600 mb-1"
          >
            API Key
          </label>
          <input
            id={`api-key-${listing.id}`}
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk_live_..."
            required
            disabled={loading}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            autoComplete="new-password"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          <span>Canal ligado com sucesso! A sincronização inicial irá importar os últimos 90 dias.</span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !externalId.trim() || !apiKey.trim()}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Link2 className="h-4 w-4" />
        )}
        {loading ? 'A validar...' : existingConfig ? 'Actualizar canal' : 'Ligar canal'}
      </button>
    </form>
  )
}

function SyncButton({
  listingId,
  onSynced,
}: {
  listingId: string
  onSynced: (result: { synced_count: number; last_sync_at: string }) => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSync = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/channels/booking/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property_listing_id: listingId }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Erro na sincronização')
        return
      }

      onSynced({
        synced_count: data.synced_count,
        last_sync_at: data.last_sync_at,
      })
    } catch {
      setError('Erro de rede — tente novamente')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleSync}
        disabled={loading}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        {loading ? 'A sincronizar...' : 'Sincronizar agora'}
      </button>
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  )
}

export function ChannelsClient({ listings, existingConfigs }: ChannelsClientProps) {
  const [configs, setConfigs] = useState<Record<string, ChannelConfig>>(
    Object.fromEntries(existingConfigs.map((c) => [c.property_listing_id, c]))
  )

  const handleConnected = (config: ChannelConfig) => {
    setConfigs((prev) => ({ ...prev, [config.property_listing_id]: config }))
  }

  const handleSynced = (
    listingId: string,
    result: { synced_count: number; last_sync_at: string }
  ) => {
    setConfigs((prev) => ({
      ...prev,
      [listingId]: {
        ...prev[listingId],
        last_synced_at: result.last_sync_at,
        sync_count: result.synced_count,
      },
    }))
  }

  if (listings.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        Sem propriedades com listings configurados. Adicione um listing primeiro.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      {listings.map((listing) => {
        const config = configs[listing.id]
        const isConnected = Boolean(config)

        return (
          <div
            key={listing.id}
            className="border border-gray-200 rounded-xl p-5 bg-white"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  {listing.name || listing.property_name}
                </h3>
                {isConnected ? (
                  <div className="mt-1 space-y-0.5">
                    <p className="text-xs text-gray-500">
                      ID externo:{' '}
                      <span className="font-mono text-gray-700">
                        {config.external_property_id}
                      </span>
                    </p>
                    <p className="text-xs text-gray-500">
                      Último sync: {formatRelativeTime(config.last_synced_at)}
                      {config.sync_count > 0 && (
                        <span className="ml-1 text-green-700 font-medium">
                          · {config.sync_count} reservas importadas
                        </span>
                      )}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 mt-0.5">Não configurado</p>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {isConnected ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-1">
                    <CheckCircle className="h-3 w-3" />
                    Ligado
                  </span>
                ) : (
                  <span className="inline-flex items-center text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-2.5 py-1">
                    Não configurado
                  </span>
                )}
              </div>
            </div>

            {isConnected && (
              <div className="mt-3">
                <SyncButton
                  listingId={listing.id}
                  onSynced={(result) => handleSynced(listing.id, result)}
                />
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-100">
              <ConnectForm
                listing={listing}
                existingConfig={config}
                onConnected={handleConnected}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
