'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/common/ui/button'
import { Mail, CheckCircle, XCircle, Loader2, RefreshCw, AlertCircle, Clock, Calendar } from 'lucide-react'

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
    const interval = setInterval(checkTokenStatus, 5 * 60 * 1000) // Verifica a cada 5 min
    return () => clearInterval(interval)
  }, [])

  function handleConnect() {
    window.location.href = '/api/email/connect'
  }

  function handleReconnect() {
    setError(null)
    window.location.href = '/api/email/connect'
  }

  async function handleDisconnect() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/email/disconnect', { method: 'DELETE' })
      if (!res.ok) throw new Error('Erro ao desligar')
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
    <div className="rounded-2xl border border-neutral-200/60 bg-brand-white p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-blue/5 border border-brand-blue/10">
          <Mail className="h-5 w-5 text-brand-blue" />
        </div>
        <div>
          <h3 className="font-semibold text-brand-text-dark">Ligação Gmail</h3>
          <p className="text-sm text-brand-text-medium">Importação automática de reservas por email</p>
        </div>
      </div>

      {email ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-emerald-700">
            <CheckCircle className="h-4 w-4" />
            <span>Ligado como <strong>{email}</strong></span>
          </div>

          {!checkingStatus && tokenStatus?.status === 'expired' && (
            <div className="flex items-start gap-2 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-600 font-medium">O token do Gmail expirou</p>
                <p className="text-red-600 text-xs mt-1">Ligue novamente para continuar a importar reservas automaticamente</p>
              </div>
            </div>
          )}

          {!checkingStatus && tokenStatus?.status === 'expiring_soon' && (
            <div className="flex items-start gap-2 text-sm bg-amber-50 border border-amber-200 rounded-lg p-3">
              <Clock className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-amber-700 font-medium">O token expira em breve</p>
                <p className="text-amber-700 text-xs mt-1">{tokenStatus.warning}</p>
              </div>
            </div>
          )}

          <div className="text-sm text-brand-text-medium">
            Última sincronização: {formatLastSync(lastSync)}
          </div>
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <XCircle className="h-4 w-4" />
              {error}
            </div>
          )}
          {syncResult && (
            <div className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
              Sincronização concluída: {syncResult.created} criada{syncResult.created !== 1 ? 's' : ''}, {syncResult.skipped} ignorada{syncResult.skipped !== 1 ? 's' : ''}, {syncResult.errors} erro{syncResult.errors !== 1 ? 's' : ''}
            </div>
          )}
          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1 flex flex-col">
                <label className="text-xs font-medium text-brand-text-medium mb-1.5">Período de sincronização</label>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-brand-text-disabled flex-shrink-0" />
                  <select
                    value={daysBack}
                    onChange={e => setDaysBack(Number(e.target.value))}
                    disabled={syncing}
                    className="flex-1 h-10 rounded-lg border border-neutral-200/60 bg-brand-white px-3 text-sm text-brand-text-dark font-medium focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value={30}>Últimos 30 dias</option>
                    <option value={60}>Últimos 60 dias</option>
                    <option value={90}>Últimos 90 dias</option>
                  </select>
                </div>
              </div>
              <Button
                className="h-10 w-full self-stretch sm:w-auto sm:self-end"
                onClick={handleSync}
                disabled={syncing || loading || tokenStatus?.status === 'expired'}
              >
                {syncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Sincronizar agora
              </Button>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {tokenStatus?.status === 'expired' ? (
                <Button
                  onClick={handleReconnect}
                  className="w-full bg-red-600 text-white hover:bg-red-700 sm:w-auto"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Ligar Gmail novamente
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={handleReconnect}
                    disabled={loading || syncing}
                    title="Ligue novamente o Gmail se a atualização automática falhar"
                    className="w-full sm:w-auto"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Ligar novamente
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDisconnect}
                    disabled={loading || syncing}
                    className="w-full border-red-200 text-red-600 hover:bg-red-50 sm:w-auto"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Desligar
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-brand-text-medium">
            <XCircle className="h-4 w-4" />
            <span>Não ligado</span>
          </div>
          <p className="text-sm text-brand-text-medium">
            Ligue o seu Gmail para importar automaticamente reservas do Airbnb, Booking.com e Flatio.
          </p>
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <XCircle className="h-4 w-4" />
              {error}
            </div>
          )}
          <Button onClick={handleConnect} size="sm" className="w-full sm:w-auto">
            <Mail className="h-4 w-4 mr-2" />
            Ligar Gmail
          </Button>
        </div>
      )}
    </div>
  )
}
