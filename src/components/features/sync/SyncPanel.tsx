'use client'

import { useState } from 'react'
import { Download, Upload, Link as LinkIcon, CheckCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/common/ui/button'
import { Badge } from '@/components/common/ui/badge'

interface Listing {
  id: string
  property_id: string
  last_synced_at: string | null
  sync_enabled: boolean
  properties: { name: string }
  platforms?: { display_name: string } | null
}

interface SyncPanelProps {
  properties: { id: string; name: string }[]
  listings: Listing[]
}

interface PropertyResult {
  property_id: string
  property_name: string
  created: number
  updated: number
  skipped: number
  cancelled?: number
}

interface SyncResponse {
  success: boolean
  results: PropertyResult[]
  totals: { created: number; updated: number; skipped: number; cancelled?: number }
  errors?: string[]
}

export function SyncPanel({ properties, listings }: SyncPanelProps) {
  const [selectedProperties, setSelectedProperties] = useState<Set<string>>(new Set())
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string; data?: SyncResponse } | null>(null)

  // Agrupar listings por propriedade para mostrar info
  const listingsByProperty = listings.reduce((acc: Record<string, Listing[]>, l) => {
    if (!acc[l.property_id]) acc[l.property_id] = []
    acc[l.property_id].push(l)
    return acc
  }, {})

  // Propriedades que têm pelo menos 1 listing com iCal
  const syncableProperties = properties.filter(p => listingsByProperty[p.id]?.length > 0)

  const toggleProperty = (id: string) => {
    setSelectedProperties(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleAll = () => {
    if (selectedProperties.size === syncableProperties.length) {
      setSelectedProperties(new Set())
    } else {
      setSelectedProperties(new Set(syncableProperties.map(p => p.id)))
    }
  }

  const getLastSync = (propertyId: string): string => {
    const propListings = listingsByProperty[propertyId] || []
    const dates = propListings
      .filter((l) => l.last_synced_at)
      .map((l) => new Date(l.last_synced_at!).getTime())

    if (dates.length === 0) return 'Nunca'
    const latest = Math.max(...dates)
    return new Date(latest).toLocaleString('pt-BR')
  }

  const handleSync = async () => {
    if (selectedProperties.size === 0) return

    setSyncing(true)
    setSyncResult(null)

    try {
      const response = await fetch('/api/sync/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_ids: Array.from(selectedProperties),
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSyncResult({
          success: true,
          message: `Sincronização concluída: ${data.totals.created} criada(s), ${data.totals.updated} atualizada(s), ${data.totals.skipped} ignorada(s)${data.totals.cancelled > 0 ? `, ${data.totals.cancelled} cancelada(s)` : ''}`,
          data,
        })
      } else {
        setSyncResult({
          success: false,
          message: data.error || 'Erro ao sincronizar',
        })
      }
    } catch {
      setSyncResult({
        success: false,
        message: 'Erro ao conectar com o servidor',
      })
    } finally {
      setSyncing(false)
    }
  }

  const getExportUrl = (propertyId: string) => {
    if (typeof window === 'undefined') {
      return `http://localhost:3000/api/ical/${propertyId}`
    }
    return `${window.location.origin}/api/ical/${propertyId}`
  }

  const copyToClipboard = (text: string) => {
    if (typeof window === 'undefined' || !navigator.clipboard) return
    navigator.clipboard.writeText(text)
    alert('URL copiada para a área de transferência!')
  }

  return (
    <div className="space-y-6">
      {/* Sync Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Upload className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Sincronizar Calendários</h3>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Selecione as propriedades para importar reservas dos calendários iCal configurados.
        </p>

        {syncableProperties.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <RefreshCw className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>Nenhuma propriedade com calendário iCal configurado.</p>
            <p className="text-sm mt-1">Configure URLs iCal nos anúncios das propriedades.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Selecionar Todas */}
            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
              <input
                type="checkbox"
                checked={selectedProperties.size === syncableProperties.length}
                onChange={toggleAll}
                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <span className="text-sm font-semibold text-gray-900">
                Selecionar Todas ({syncableProperties.length})
              </span>
            </label>

            {/* Lista de propriedades */}
            <div className="space-y-2">
              {syncableProperties.map((property) => {
                const icalCount = listingsByProperty[property.id]?.length || 0
                const lastSync = getLastSync(property.id)

                return (
                  <label
                    key={property.id}
                    className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedProperties.has(property.id)
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedProperties.has(property.id)}
                        onChange={() => toggleProperty(property.id)}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{property.name}</p>
                        <p className="text-xs text-gray-500">
                          {icalCount} calendário(s) iCal
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Última sync:</p>
                      <p className="text-xs text-gray-700">{lastSync}</p>
                    </div>
                  </label>
                )
              })}
            </div>

            {/* Botão Sincronizar */}
            <Button
              onClick={handleSync}
              disabled={syncing || selectedProperties.size === 0}
            >
              {syncing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sincronizando {selectedProperties.size} propriedade(s)...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Sincronizar {selectedProperties.size > 0 ? `(${selectedProperties.size})` : ''}
                </>
              )}
            </Button>

            {/* Resultado */}
            {syncResult && (
              <div
                className={`p-4 rounded-lg ${
                  syncResult.success
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}
              >
                <div className="flex items-start gap-2 mb-2">
                  {syncResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <p className={`text-sm font-medium ${syncResult.success ? 'text-green-800' : 'text-red-800'}`}>
                    {syncResult.message}
                  </p>
                </div>

                {/* Detalhes por propriedade */}
                {syncResult.data?.results && syncResult.data.results.length > 0 && (
                  <div className="mt-3 space-y-1 ml-7">
                    {syncResult.data.results.map((r) => (
                      <div key={r.property_id} className="text-sm text-green-700 flex items-center justify-between">
                        <span className="font-medium">{r.property_name}</span>
                        <span>
                          {r.created} nova(s), {r.updated} atualizada(s), {r.skipped} ignorada(s){r.cancelled && r.cancelled > 0 ? `, ${r.cancelled} cancelada(s)` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Erros detalhados */}
                {syncResult.data?.errors && syncResult.data.errors.length > 0 && (
                  <div className="mt-3 ml-7 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm font-medium text-yellow-800 mb-1">Detalhes:</p>
                    {syncResult.data.errors.map((err: string, i: number) => (
                      <p key={i} className="text-xs text-yellow-700">{err}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Export Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-4">
          <Download className="h-5 w-5 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900">Exportar Calendário</h3>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Use estas URLs para importar suas reservas em outras plataformas (Airbnb, Booking, Google Calendar, etc.)
        </p>

        {properties.length === 0 ? (
          <p className="text-gray-500 text-center py-4">Nenhuma propriedade disponível</p>
        ) : (
          <div className="space-y-3">
            {properties.map((property) => {
              const exportUrl = getExportUrl(property.id)

              return (
                <div
                  key={property.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 mb-1">{property.name}</p>
                    <div className="flex items-center gap-2">
                      <LinkIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <p className="text-xs text-gray-600 font-mono break-all select-all">{exportUrl}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(exportUrl)}
                    >
                      Copiar URL
                    </Button>
                    <a
                      href={exportUrl}
                      download
                      className="inline-flex items-center justify-center px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Sync Status */}
      {listings.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <RefreshCw className="h-5 w-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">Status de Sincronização</h3>
          </div>

          <div className="space-y-2">
            {listings.map((listing) => {
              const lastSync = listing.last_synced_at
                ? new Date(listing.last_synced_at).toLocaleString('pt-BR')
                : 'Nunca'

              return (
                <div
                  key={listing.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {listing.properties.name} - {listing.platforms?.display_name || 'Manual'}
                    </p>
                    <p className="text-sm text-gray-600">Última sincronização: {lastSync}</p>
                  </div>

                  {listing.sync_enabled ? (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Ativo
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                      Inativo
                    </Badge>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
