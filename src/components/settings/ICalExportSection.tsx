'use client'

import { useState } from 'react'
import { Copy, RotateCw, Loader } from 'lucide-react'

interface Property {
  id: string
  name: string
  ical_export_token: string | null
}

interface ICalExportSectionProps {
  properties: Property[]
  appUrl: string
}

export function ICalExportSection({ properties, appUrl }: ICalExportSectionProps) {
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null)

  const getExportUrl = (propertyId: string, token: string | null) => {
    if (!token) return null
    return `${appUrl}/api/ical/${propertyId}?token=${token}`
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // Could add a toast notification here
  }

  const handleRegenerate = async (propertyId: string) => {
    setRegeneratingId(propertyId)
    try {
      const response = await fetch(`/api/properties/${propertyId}/ical-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        const error = await response.json()
        alert(`Erro: ${error.error}`)
        return
      }

      // Refresh page or update state
      window.location.reload()
    } catch (error) {
      alert(`Erro ao regenerar token: ${error instanceof Error ? error.message : 'unknown'}`)
    } finally {
      setRegeneratingId(null)
    }
  }

  if (properties.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
        Nenhuma propriedade disponível
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {properties.map(property => {
        const exportUrl = getExportUrl(property.id, property.ical_export_token)

        return (
          <div key={property.id} className="rounded-lg border border-gray-200 p-4">
            <h3 className="font-medium text-gray-900 mb-3">{property.name}</h3>

            {exportUrl ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">URL de Exportação</label>
                  <div className="flex gap-2">
                    <code className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-700 overflow-auto">
                      {exportUrl}
                    </code>
                    <button
                      onClick={() => copyToClipboard(exportUrl)}
                      className="px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center gap-1 text-sm font-medium"
                    >
                      <Copy className="h-3 w-3" />
                      Copiar
                    </button>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-800">
                  <p className="font-medium mb-1">Como usar:</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-700">
                    <li>Cole este URL nas configurações de sincronização da sua plataforma (Airbnb, Flatio, etc.)</li>
                    <li>A plataforma importará automaticamente as suas reservas</li>
                    <li>Use uma URL diferente para cada propriedade</li>
                  </ul>
                </div>

                <button
                  onClick={() => handleRegenerate(property.id)}
                  disabled={regeneratingId === property.id}
                  className="px-3 py-1.5 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 flex items-center gap-1"
                >
                  {regeneratingId === property.id ? (
                    <>
                      <Loader className="h-3 w-3 animate-spin" />
                      Regenerando...
                    </>
                  ) : (
                    <>
                      <RotateCw className="h-3 w-3" />
                      Regenerar Token
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="rounded bg-yellow-50 border border-yellow-200 p-3 text-xs text-yellow-800">
                Nenhum token disponível. Por favor, contacte o suporte.
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
