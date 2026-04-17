'use client'

import { useState, useEffect } from 'react'
import { Copy, RotateCcw, ExternalLink, AlertCircle } from 'lucide-react'
import { Button } from '@/components/common/ui/button'
import { Alert, AlertDescription } from '@/components/common/ui/alert'
import { toast } from 'sonner'

export function ICalExportCard({ propertyId, appUrl }: { propertyId: string; appUrl: string }) {
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchToken() {
      try {
        setError(null)
        const response = await fetch(`/api/properties/${propertyId}/ical-token`)

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `Erro ${response.status}`)
        }

        const data = await response.json()
        setToken(data.ical_export_token)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erro ao obter token'
        console.error('Erro ao buscar token iCal:', message)
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    fetchToken()
  }, [propertyId])

  const icalUrl = token ? `${appUrl}/api/ical/${propertyId}?token=${token}` : ''

  const handleCopyUrl = async () => {
    if (!icalUrl) return
    await navigator.clipboard.writeText(icalUrl)
    toast.success('URL copiada!')
  }

  const handleRegenerateToken = async () => {
    setRegenerating(true)
    try {
      const response = await fetch(`/api/properties/${propertyId}/ical-token`, {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Falha ao regenerar token')
      const data = await response.json()
      setToken(data.ical_export_token)
      toast.success('Token regenerado com sucesso!')
    } catch (error) {
      console.error('Erro ao regenerar token:', error)
      toast.error('Erro ao regenerar token')
    } finally {
      setRegenerating(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Exportar iCal</h3>

      <Alert className="mb-6 bg-blue-50 border-blue-200">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 ml-2">
          Use esta URL iCal para sincronizar com Booking.com, Airbnb e outras plataformas
        </AlertDescription>
      </Alert>

      {error && (
        <Alert className="mb-4 bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 ml-2">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="animate-pulse h-10 bg-gray-200 rounded mb-4"></div>
      ) : icalUrl ? (
        <div className="space-y-4">
          {/* URL Display */}
          <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 break-all font-mono text-sm">
            {icalUrl}
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-col sm:flex-row">
            <Button
              onClick={handleCopyUrl}
              variant="default"
              className="flex items-center gap-2"
            >
              <Copy className="h-4 w-4" />
              Copiar URL
            </Button>

            <Button
              onClick={() => window.open(icalUrl, '_blank')}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Abrir iCal
            </Button>

            <Button
              onClick={handleRegenerateToken}
              disabled={regenerating}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              {regenerating ? 'Regenerando...' : 'Regenerar Token'}
            </Button>
          </div>

          {/* Instructions */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-3">Como configurar no Booking.com:</h4>
            <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
              <li>Vá a <strong>Booking.com Extranet → Tools → APIs & Integrations → iCal</strong></li>
              <li>Cole a URL acima em <strong>&quot;Import URL&quot;</strong></li>
              <li>Booking.com começará a sincronizar suas reservas automaticamente</li>
              <li>Reservas criadas aqui aparecerão como bloqueadas no Booking.com</li>
            </ol>
          </div>
        </div>
      ) : (
        <p className="text-gray-500">Erro ao carregar URL iCal</p>
      )}
    </div>
  )
}
