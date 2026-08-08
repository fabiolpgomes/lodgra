'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/common/ui/button'
import { Mail, CheckCircle, XCircle, Loader2, RefreshCw, AlertCircle, Clock } from 'lucide-react'

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

interface TokenStatus {
  status: 'connected' | 'expired' | 'expiring_soon' | 'disconnected'
  email?: string
  hoursUntilExpiry?: number
  warning?: string | null
  needsReconnection?: boolean
}

export function EmailConnection({ initialEmail, initialLastSync }: EmailConnectionProps) {
  const [email, setEmail] = useState(initialEmail || null)
  const [lastSync, setLastSync] = useState(initialLastSync || null)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [daysBack, setDaysBack] = useState(30)
  const [tokenStatus, setTokenStatus] = useState<TokenStatus | null>(null)
  const [checkingStatus, setCheckingStatus] = useState(true)

  useEffect(() => {
    async function checkTokenStatus() {
      try {
        const res = await fetch('/api/email/status')
        const data = await res.json()
        setTokenStatus(data)
      } catch (err) {
        console.error('[EmailConnection] Erro ao verificar status:', err)
      } finally {
        setCheckingStatus(false)
      }
    }

    checkTokenStatus()
    const interval = setInterval(checkTokenStatus, 5 * 60 * 1000) // Check every 5 min
    return () => clearInterval(interval)
  }, [])

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
      const res = await fetch('/api/admin/trigger-email-parser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao sincronizar')
      setSyncResult({
        processed: data.processed || 0,
        created: data.created || 0,
        skipped: data.skipped || 0,
        errors: data.errors || 0,
      })
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
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50">
          <Mail className="h-5 w-5 text-brand-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Ligação Gmail</h3>
          <p className="text-sm text-gray-600">Importação automática de reservas por email</p>
        </div>
      </div>

      {email ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-green-700">
            <CheckCircle className="h-4 w-4" />
            <span>Conectado como <strong>{email}</strong></span>
          </div>

          {!checkingStatus && tokenStatus?.status === 'expired' && (
            <div className="flex items-start gap-2 text-sm bg-red-50 border border-red-200 rounded-md p-3">
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-600 font-medium">Token do Gmail expirou</p>
                <p className="text-red-600 text-xs mt-1">Reconecte para continuar importando reservas automaticamente</p>
              </div>
            </div>
          )}

          {!checkingStatus && tokenStatus?.status === 'expiring_soon' && (
            <div className="flex items-start gap-2 text-sm bg-amber-50 border border-amber-200 rounded-md p-3">
              <Clock className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-amber-700 font-medium">Token expira em breve</p>
                <p className="text-amber-700 text-xs mt-1">{tokenStatus.warning}</p>
              </div>
            </div>
          )}

          <div className="text-sm text-gray-600">
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
            {tokenStatus?.status !== 'expired' && (
              <>
                <select
                  value={daysBack}
                  onChange={e => setDaysBack(Number(e.target.value))}
                  disabled={syncing}
                  className="h-8 rounded-md border border-gray-200 bg-white px-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
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
              </>
            )}
            {tokenStatus?.status === 'expired' ? (
              <Button
                onClick={handleConnect}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reconectar Gmail
              </Button>
            ) : (
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
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <XCircle className="h-4 w-4" />
            <span>Não conectado</span>
          </div>
          <p className="text-sm text-gray-600">
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
