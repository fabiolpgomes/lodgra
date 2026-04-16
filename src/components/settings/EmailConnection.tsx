'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Mail, CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react'

interface EmailConnectionProps {
  initialEmail?: string | null
  initialLastSync?: string | null
}

interface SyncResult {
  processed: number
  created: number
  skipped: number
  errors: number
}

export function EmailConnection({ initialEmail, initialLastSync }: EmailConnectionProps) {
  const [email, setEmail] = useState(initialEmail || null)
  const [lastSync, setLastSync] = useState(initialLastSync || null)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [daysBack, setDaysBack] = useState(30)

  function handleConnect() {
    window.location.href = '/api/email/connect'
  }

  async function handleDisconnect() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/email/disconnect', { method: 'DELETE' })
      if (!res.ok) throw new Error('Erro ao desconectar')
      setEmail(null)
      setLastSync(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setLoading(false)
    }
  }

  async function handleSync() {
    setSyncing(true)
    setSyncResult(null)
    setError(null)
    try {
      const res = await fetch('/api/email/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daysBack }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao sincronizar')
      setSyncResult(data)
      setLastSync(new Date().toISOString())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setSyncing(false)
    }
  }

  function formatLastSync(iso: string | null) {
    if (!iso) return 'Nunca sincronizado'
    const diff = Date.now() - new Date(iso).getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return 'Agora mesmo'
    if (minutes < 60) return `Há ${minutes} minuto${minutes !== 1 ? 's' : ''}`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `Há ${hours} hora${hours !== 1 ? 's' : ''}`
    return new Date(iso).toLocaleDateString('pt-PT')
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
          <Mail className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Ligação Gmail</h3>
          <p className="text-sm text-gray-500">Importação automática de reservas por email</p>
        </div>
      </div>

      {email ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-green-700">
            <CheckCircle className="h-4 w-4" />
            <span>Conectado como <strong>{email}</strong></span>
          </div>
          <div className="text-sm text-gray-500">
            Última sincronização: {formatLastSync(lastSync)}
          </div>
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <XCircle className="h-4 w-4" />
              {error}
            </div>
          )}
          {syncResult && (
            <div className="text-sm text-green-700 bg-green-50 rounded-md px-3 py-2">
              Sincronização concluída: {syncResult.created} criada{syncResult.created !== 1 ? 's' : ''}, {syncResult.skipped} ignorada{syncResult.skipped !== 1 ? 's' : ''}, {syncResult.errors} erro{syncResult.errors !== 1 ? 's' : ''}
            </div>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={daysBack}
              onChange={e => setDaysBack(Number(e.target.value))}
              disabled={syncing}
              className="h-8 rounded-md border border-gray-200 bg-white px-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={30}>Últimos 30 dias</option>
              <option value={60}>Últimos 60 dias</option>
              <option value={90}>Últimos 90 dias</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={syncing || loading}
            >
              {syncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Sincronizar agora
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              disabled={loading || syncing}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Desconectar
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <XCircle className="h-4 w-4" />
            <span>Não conectado</span>
          </div>
          <p className="text-sm text-gray-500">
            Conecta o teu Gmail para importar automaticamente reservas do Airbnb, Booking.com e Flatio.
          </p>
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <XCircle className="h-4 w-4" />
              {error}
            </div>
          )}
          <Button onClick={handleConnect} size="sm">
            <Mail className="h-4 w-4 mr-2" />
            Conectar Gmail
          </Button>
        </div>
      )}
    </div>
  )
}
