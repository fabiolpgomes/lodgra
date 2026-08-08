'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface SyncMetrics {
  period: string
  total: number
  synced: number
  needsReview: number
  syncRate: number
  needsReviewRate: number
  status: 'healthy' | 'warning' | 'critical'
}

interface NeedsReviewCase {
  id: string
  guestName: string | null
  propertyName: string | null
  checkIn: string
  checkOut: string
  createdAt: string
  reason: string
}

interface DailyMetrics {
  date: string
  total: number
  synced: number
  needsReview: number
}

interface SyncResult {
  processed?: number
  created: number
  updated?: number
  cancelled?: number
  blocked?: number
  errors: number
  duration?: number
  errorDetails?: Array<{
    property: string
    email: string
    guest: string
    type: string
    message: string
  }>
  properties?: Array<{
    propertyId: string
    propertyName: string
    platform: string
    icalUrl: string
    created: number
    updated: number
    cancelled: number
    blocked: number
    errors: number
    errorMessage?: string
  }>
  summary?: {
    totalProperties: number
    created: number
    updated: number
    cancelled: number
    blocked: number
    errors: number
  }
}

interface Toast {
  id: string
  type: 'success' | 'error' | 'info'
  message: string
}

export default function EmailSyncStatusPage() {
  const [metrics, setMetrics] = useState<SyncMetrics | null>(null)
  const [needsReviewCases, setNeedsReviewCases] = useState<NeedsReviewCase[]>([])
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetrics[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDays, setSelectedDays] = useState(7)
  const [syncing, setSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState('')
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [expandErrors, setExpandErrors] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 60000)
    return () => clearInterval(interval)
  }, [selectedDays])

  async function fetchMetrics() {
    try {
      const [metricsRes, casesRes, dailyRes] = await Promise.all([
        fetch(`/api/admin/email-sync-metrics?days=${selectedDays}`),
        fetch(`/api/admin/email-sync-needs-review?days=${selectedDays}`),
        fetch(`/api/admin/email-sync-daily?days=${selectedDays}`),
      ])

      const [metricsData, casesData, dailyData] = await Promise.all([
        metricsRes.json(),
        casesRes.json(),
        dailyRes.json(),
      ])

      setMetrics(metricsData)
      setNeedsReviewCases(casesData.cases || [])
      setDailyMetrics(dailyData.daily || [])
    } catch (error) {
      console.error('Erro ao carregar métricas:', error)
    } finally {
      setLoading(false)
    }
  }

  function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    const id = Math.random().toString(36)
    setToast({ id, message, type })
    setTimeout(() => setToast(null), 4000)
  }

  async function triggerManualSync() {
    setSyncing(true)
    setSyncResult(null)
    setSyncProgress('🔄 Conectando com servidor...')
    showToast('🔄 Iniciando sincronização de propriedades...', 'info')

    const startTime = Date.now()

    try {
      console.log('🔄 Sincronizando iCal de propriedades...')

      setSyncProgress('📥 Buscando reservas das plataformas (Airbnb, Booking, Flatio...)...')

      const response = await fetch('/api/admin/trigger-ical-sync', {
        method: 'POST',
        credentials: 'include',
      })

      if (!response.ok) {
        const text = await response.text()
        try {
          const errorData = JSON.parse(text)
          showToast(`❌ Erro: ${errorData.error}`, 'error')
        } catch {
          showToast(`❌ Erro ${response.status}`, 'error')
        }
        setSyncing(false)
        setSyncProgress('')
        return
      }

      const text = await response.text()
      let data

      try {
        data = JSON.parse(text)
      } catch (e) {
        showToast('⚠️ Resposta inválida do servidor', 'error')
        setSyncing(false)
        setSyncProgress('')
        return
      }

      setSyncProgress('⏳ Sincronizando propriedades...')

      const duration = Date.now() - startTime

      setSyncResult({
        created: data.summary?.created || 0,
        updated: data.summary?.updated || 0,
        cancelled: data.summary?.cancelled || 0,
        blocked: data.summary?.blocked || 0,
        errors: data.summary?.errors || 0,
        duration,
        properties: data.properties || []
      })

      setSyncProgress('')

      const summary = data.summary
      if (summary.errors > 0) {
        showToast(
          `⚠️ Concluído com ${summary.errors} erro(s): ${summary.created} criadas, ${summary.updated} atualizadas, ${summary.blocked} bloqueios`,
          'error'
        )
      } else if (summary.created > 0 || summary.updated > 0) {
        showToast(
          `✅ Sucesso! ${summary.created} nova(s), ${summary.updated} atualizada(s), ${summary.blocked} bloqueio(s)`,
          'success'
        )
      } else {
        showToast(
          `ℹ️ Nenhuma alteração detectada`,
          'info'
        )
      }

      setTimeout(() => {
        fetchMetrics()
      }, 2000)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error('Erro ao sincronizar:', error)
      showToast(`❌ Erro: ${errorMsg}`, 'error')
      setSyncProgress('')
    } finally {
      setSyncing(false)
    }
  }

  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: '#F7F5EF' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#10203E' }}></div>
      </div>
    )
  }


  // Componente de resultado da sincronização
  const syncResultComponent = syncResult && (
    <div className="mb-8 p-6 rounded-lg" style={{ backgroundColor: syncResult.errors > 0 ? '#FEE2E2' : '#ECFDF5', border: `1px solid ${syncResult.errors > 0 ? '#FECACA' : '#A7F3D0'}` }}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold" style={{ color: syncResult.errors > 0 ? '#991B1B' : '#065F46' }}>
            {syncResult.errors > 0 ? '⚠️ Sincronização com erros' : '✅ Sincronização concluída'}
          </h3>
          <p style={{ color: syncResult.errors > 0 ? '#7F1D1D' : '#047857', fontSize: '14px', marginTop: '4px' }}>
            Processados em {syncResult.duration}ms
          </p>
        </div>
        <button
          onClick={() => setSyncResult(null)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px' }}
        >
          ✕
        </button>
      </div>
      <div className="grid grid-cols-4 gap-4">
        <div className="p-3 rounded" style={{ backgroundColor: '#BFDBFE' }}>
          <p style={{ fontSize: '12px', opacity: 0.8 }}>✨ Novas</p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '4px' }}>{syncResult.created}</p>
        </div>
        <div className="p-3 rounded" style={{ backgroundColor: '#DDD6FE' }}>
          <p style={{ fontSize: '12px', opacity: 0.8 }}>🔄 Atualizadas</p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '4px' }}>{syncResult.updated || 0}</p>
        </div>
        <div className="p-3 rounded" style={{ backgroundColor: '#C7D2FE' }}>
          <p style={{ fontSize: '12px', opacity: 0.8 }}>🔒 Bloqueios</p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '4px' }}>{syncResult.blocked || 0}</p>
        </div>
        <div className="p-3 rounded" style={{ backgroundColor: '#FECACA' }}>
          <p style={{ fontSize: '12px', opacity: 0.8 }}>❌ Erros</p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '4px' }}>{syncResult.errors}</p>
        </div>
      </div>

      {syncResult.properties && (
        <div className="mt-6 pt-6 border-t border-gray-300">
          {syncResult.properties.length === 0 ? (
            <div className="text-center py-6 text-gray-600">
              <p className="text-sm">ℹ️ Nenhuma propriedade com iCal configurado</p>
              <p className="text-xs mt-1 text-gray-500">Configure URLs iCal nas propriedades para ativar sincronização</p>
            </div>
          ) : (
            <>
              <h4 className="font-semibold text-gray-900 mb-4">📋 Resultado por Propriedade:</h4>
          <div className="space-y-3">
            {syncResult.properties.map((prop, idx) => (
              <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold text-gray-900">{prop.propertyName}</p>
                    <p className="text-xs text-gray-600">🌐 {prop.platform}</p>
                  </div>
                  {prop.errors > 0 && (
                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">❌ Erro</span>
                  )}
                </div>
                {prop.errors === 0 ? (
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    <div>
                      <p className="text-xs text-gray-600">Novas</p>
                      <p className="text-lg font-bold text-blue-600">{prop.created}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Atualizadas</p>
                      <p className="text-lg font-bold text-indigo-600">{prop.updated}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Bloqueios</p>
                      <p className="text-lg font-bold text-gray-600">{prop.blocked}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Canceladas</p>
                      <p className="text-lg font-bold text-orange-600">{prop.cancelled}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-red-600 mt-2">⚠️ {prop.errorMessage}</p>
                )}
              </div>
            ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )


  // Seção detalhada de erros
  const errorDetailsSection = syncResult?.errorDetails && syncResult.errorDetails.length > 0 && (
    <div className="mt-4 pt-4 border-t border-gray-300">
      <button
        onClick={() => setExpandErrors(!expandErrors)}
        className="text-sm font-medium text-gray-700 hover:text-gray-900 flex items-center gap-1"
      >
        {expandErrors ? '▼' : '▶'} Detalhes dos erros ({syncResult.errorDetails.length})
      </button>
      {expandErrors && (
        <div className="mt-3 space-y-2">
          {syncResult.errorDetails.map((err, idx) => (
            <div key={idx} className="p-3 bg-red-100 border border-red-300 rounded text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="font-semibold text-red-900">Propriedade</p>
                  <p className="text-red-800">{err.property}</p>
                </div>
                <div>
                  <p className="font-semibold text-red-900">Hóspede</p>
                  <p className="text-red-800">{err.guest}</p>
                </div>
                <div className="col-span-2">
                  <p className="font-semibold text-red-900">Email</p>
                  <p className="text-red-800 break-all text-xs">{err.email}</p>
                </div>
                <div className="col-span-2">
                  <p className="font-semibold text-red-900">Erro</p>
                  <p className="text-red-800">{err.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-4 pt-4 border-t border-gray-300">
        <button
          onClick={() => setExpandErrors(!expandErrors)}
          className="text-sm font-medium text-gray-700 hover:text-gray-900 flex items-center gap-1"
        >
          {expandErrors ? '▼' : '▶'} Detalhes dos erros ({syncResult?.errorDetails?.length || 0})
        </button>
        {expandErrors && syncResult?.errorDetails && syncResult.errorDetails.length > 0 && (
          <div className="mt-3 space-y-2">
            {syncResult.errorDetails.map((err, idx) => (
              <div key={idx} className="p-3 bg-red-100 border border-red-300 rounded text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="font-semibold text-red-900">Propriedade</p>
                    <p className="text-red-800">{err.property}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-red-900">Hóspede</p>
                    <p className="text-red-800">{err.guest}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="font-semibold text-red-900">Email</p>
                    <p className="text-red-800 break-all text-xs">{err.email}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="font-semibold text-red-900">Erro</p>
                    <p className="text-red-800">{err.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  // Componente de progresso
  const syncProgressComponent = syncProgress && (
    <div className="mb-8 p-4 rounded-lg flex items-center gap-3" style={{ backgroundColor: '#DBEAFE', border: '1px solid #93C5FD' }}>
      <div className="animate-spin" style={{ width: '20px', height: '20px', border: '3px solid #3B82F6', borderTop: '3px solid transparent', borderRadius: '50%' }}></div>
      <span style={{ color: '#1E40AF', fontWeight: '500' }}>{syncProgress}</span>
    </div>
  )

  const statusColor = {
    healthy: 'border-l-4 border-l-[#059669]',
    warning: 'border-l-4 border-l-[#C9A227]',
    critical: 'border-l-4 border-l-[#DC2626]',
  }

  const statusBadge = {
    healthy: 'text-[#059669]',
    warning: 'text-[#C9A227]',
    critical: 'text-[#DC2626]',
  }

  const statusText = {
    healthy: '✅ Saudável',
    warning: '⚠️ Atenção',
    critical: '🚨 Crítico',
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F7F5EF' }}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold" style={{ color: '#1B2430' }}>Monitoramento de Sincronização</h1>
            <p className="mt-2" style={{ color: '#4D5566', fontSize: '16px', lineHeight: '1.5' }}>Acompanhe em tempo real o status de sincronização de dados de hóspedes</p>
          </div>
          <div className="flex gap-3 ml-4">
            <button
              onClick={triggerManualSync}
              disabled={syncing}
              style={{
                backgroundColor: syncing ? 'rgba(16, 32, 62, 0.28)' : '#10203E',
                color: '#ffffff',
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                cursor: syncing ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                opacity: syncing ? 0.6 : 1,
              }}
            >
              {syncing ? '⟳ Sincronizando...' : '🔄 Sincronizar'}
            </button>
            <a
              href="/dashboard"
              style={{
                backgroundColor: '#FBFAF6',
                color: '#1B2430',
                padding: '12px 24px',
                borderRadius: '8px',
                border: '1px solid #E5DFD2',
                textDecoration: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              ← Dashboard
            </a>
          </div>
        {syncProgressComponent}
        {syncResultComponent}
        </div>

        {/* Period Selector */}
        <div className="mb-8 flex gap-3">
          {[7, 14, 30].map(days => (
            <button
              key={days}
              onClick={() => setSelectedDays(days)}
              className="px-6 py-2 rounded-lg font-medium transition-colors"
              style={{
                backgroundColor: selectedDays === days ? '#10203E' : '#FBFAF6',
                color: selectedDays === days ? '#ffffff' : '#1B2430',
                border: selectedDays === days ? 'none' : '1px solid #E5DFD2',
              }}
            >
              {days} dias
            </button>
          ))}
        </div>

        {/* Main Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <MetricCard
            title="Total"
            value={metrics?.total || 0}
            subtitle="Extrações processadas"
            icon="📊"
          />
          <MetricCard
            title="Sincronizadas"
            value={metrics?.synced || 0}
            subtitle={`${(metrics?.syncRate ?? 0).toFixed(1)}% de sucesso`}
            icon="✅"
            status="success"
          />
          <MetricCard
            title="Revisão Necessária"
            value={metrics?.needsReview || 0}
            subtitle={`${(metrics?.needsReviewRate ?? 0).toFixed(1)}% do total`}
            icon="⚠️"
            status={metrics?.needsReviewRate! > 10 ? 'critical' : 'warning'}
          />
          <MetricCard
            title="Taxa de Sincronização"
            value={`${(metrics?.syncRate ?? 0).toFixed(1)}%`}
            subtitle="Extrações com sucesso"
            icon="📈"
          />
          <div
            className={`rounded-lg p-6 flex flex-col justify-center items-center ${statusColor[metrics?.status || 'healthy']}`}
            style={{ backgroundColor: '#FBFAF6' }}
          >
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-2 ${statusBadge[metrics?.status || 'healthy']}`}>
              {statusText[metrics?.status || 'healthy']}
            </span>
            <p style={{ color: '#4D5566', fontSize: '14px' }}>Sistema</p>
          </div>
        </div>

        {/* Alert Section */}
        {metrics?.needsReviewRate! > 10 && (
          <div className="mb-8 p-4 rounded-lg border-l-4 border-l-[#DC2626]" style={{ backgroundColor: '#FBFAF6' }}>
            <h3 className="font-bold mb-2" style={{ color: '#DC2626' }}>🚨 Taxa de revisão elevada</h3>
            <p style={{ color: '#4D5566', fontSize: '14px' }}>
              A taxa de emails que precisam de revisão manual está acima de 10%. Verifique os casos abaixo e considere ajustar o extraction prompt.
            </p>
          </div>
        )}

        {/* Daily Trend Chart */}
        <div className="rounded-lg p-6 mb-8" style={{ backgroundColor: '#FBFAF6', border: '1px solid #E5DFD2' }}>
          <h2 className="text-lg font-bold mb-6" style={{ color: '#1B2430' }}>Tendência (últimos {selectedDays} dias)</h2>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="mb-4" style={{ color: '#4D5566', fontSize: '14px', fontWeight: 500 }}>Extrações por dia</p>
              <div className="flex gap-1 h-32 items-end">
                {dailyMetrics.map((day, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t hover:opacity-80 relative group transition-opacity cursor-pointer"
                    style={{
                      backgroundColor: '#10203E',
                      height: `${Math.max(10, (day.total / Math.max(...dailyMetrics.map(d => d.total))) * 100)}%`,
                    }}
                  >
                    <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap mb-1 z-10">
                      {day.date}: {day.total} (✅ {day.synced}, ⚠️ {day.needsReview})
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-4" style={{ color: '#4D5566', fontSize: '14px', fontWeight: 500 }}>Taxa de revisão por dia</p>
              <div className="flex gap-1 h-32 items-end">
                {dailyMetrics.map((day, i) => {
                  const rate = day.total > 0 ? (day.needsReview / day.total) * 100 : 0
                  const barColor = rate > 10 ? '#DC2626' : rate > 5 ? '#C9A227' : '#059669'
                  return (
                    <div
                      key={i}
                      className="flex-1 rounded-t hover:opacity-80 relative group transition-opacity cursor-pointer"
                      style={{
                        backgroundColor: barColor,
                        height: `${Math.max(5, Math.min(100, rate))}%`,
                      }}
                    >
                      <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap mb-1 z-10">
                        {day.date}: {rate.toFixed(1)}%
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Needs Review Cases */}
        <div className="rounded-lg overflow-hidden" style={{ backgroundColor: '#FBFAF6', border: '1px solid #E5DFD2' }}>
          <div className="p-6" style={{ borderBottom: '1px solid #E5DFD2' }}>
            <h2 className="text-lg font-bold" style={{ color: '#1B2430' }}>Casos que Precisam de Revisão ({needsReviewCases.length})</h2>
            <p style={{ color: '#4D5566', fontSize: '14px', marginTop: '8px' }}>Extrações onde a correspondência com reserva foi ambígua</p>
          </div>

          {needsReviewCases.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-lg font-medium" style={{ color: '#1B2430' }}>✅ Nenhum caso aguardando revisão</p>
              <p style={{ color: '#4D5566', fontSize: '14px', marginTop: '8px' }}>Todas as extrações foram sincronizadas com sucesso</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: '#F7F5EF', borderBottom: '1px solid #E5DFD2' }}>
                    <th className="px-6 py-4 text-left text-sm font-semibold" style={{ color: '#1B2430' }}>Hóspede</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold" style={{ color: '#1B2430' }}>Propriedade</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold" style={{ color: '#1B2430' }}>Datas</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold" style={{ color: '#1B2430' }}>Motivo</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold" style={{ color: '#1B2430' }}>Recebido</th>
                  </tr>
                </thead>
                <tbody>
                  {needsReviewCases.slice(0, 20).map(case_ => (
                    <tr key={case_.id} style={{ borderBottom: '1px solid #EFEADF' }}>
                      <td className="px-6 py-4 text-sm">
                        <div className="font-medium" style={{ color: '#1B2430' }}>{case_.guestName || '—'}</div>
                      </td>
                      <td className="px-6 py-4 text-sm" style={{ color: '#4D5566' }}>{case_.propertyName || '—'}</td>
                      <td className="px-6 py-4 text-sm" style={{ color: '#4D5566' }}>
                        {format(new Date(case_.checkIn), 'd MMM', { locale: ptBR })} →{' '}
                        {format(new Date(case_.checkOut), 'd MMM', { locale: ptBR })}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="inline-block px-3 py-1 rounded-lg text-xs font-medium" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
                          {case_.reason}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm" style={{ color: '#4D5566' }}>
                        {format(new Date(case_.createdAt), 'd MMM HH:mm', { locale: ptBR })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {needsReviewCases.length > 20 && (
                <div className="px-6 py-4 text-center text-sm" style={{ backgroundColor: '#F7F5EF', borderTop: '1px solid #E5DFD2', color: '#4D5566' }}>
                  +{needsReviewCases.length - 20} mais casos...
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recommended Actions */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Actions */}
          <div
            className="rounded-lg p-6"
            style={{
              backgroundColor: '#FBFAF6',
              border: '1px solid #E5DFD2',
              borderLeft: metrics?.needsReviewRate! > 15 ? '4px solid #DC2626' : metrics?.needsReviewRate! > 10 ? '4px solid #C9A227' : '4px solid #059669',
            }}
          >
            <h3 className="font-bold text-lg mb-4" style={{ color: '#1B2430' }}>
              {metrics?.needsReviewRate! > 15
                ? '🚨 Ações para Taxa Crítica'
                : metrics?.needsReviewRate! > 10
                  ? '⚠️ Ações para Taxa Elevada'
                  : '✅ Tudo em ordem'}
            </h3>
            <ul className="space-y-3">
              {metrics?.needsReviewRate! > 10 ? (
                <>
                  <li className="flex items-start gap-3">
                    <span className="text-lg">1️⃣</span>
                    <div>
                      <strong style={{ color: '#1B2430' }}>Revisar casos pendentes</strong>
                      <p style={{ color: '#4D5566', fontSize: '14px', marginTop: '4px' }}>Veja a tabela abaixo. Identifique o padrão comum nos {needsReviewCases.length} casos</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-lg">2️⃣</span>
                    <div>
                      <strong style={{ color: '#1B2430' }}>Verificar extraction prompt</strong>
                      <p style={{ color: '#4D5566', fontSize: '14px', marginTop: '4px' }}>Se muitos dizem "Propriedade não identificada", o extraction prompt precisa reforço</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-lg">3️⃣</span>
                    <div>
                      <strong style={{ color: '#1B2430' }}>Testar com emails reais</strong>
                      <p style={{ color: '#4D5566', fontSize: '14px', marginTop: '4px' }}>Copie 2-3 emails dos casos pendentes e teste o OpenAI prompt diretamente</p>
                    </div>
                  </li>
                  {metrics?.needsReviewRate! > 15 && (
                    <li className="flex items-start gap-3 mt-2 pt-2" style={{ borderTop: '1px solid #E5DFD2' }}>
                      <span className="text-lg">⚠️</span>
                      <div>
                        <strong style={{ color: '#1B2430' }}>Considere pausar temporariamente</strong>
                        <p style={{ color: '#4D5566', fontSize: '14px', marginTop: '4px' }}>Se o padrão for crítico, desabilite o sync automático enquanto ajusta</p>
                      </div>
                    </li>
                  )}
                </>
              ) : (
                <>
                  <li className="flex items-start gap-3">
                    <span className="text-lg">✓</span>
                    <div>
                      <strong style={{ color: '#1B2430' }}>Sistema funcionando normalmente</strong>
                      <p style={{ color: '#4D5566', fontSize: '14px', marginTop: '4px' }}>Taxa de revisão está saudável (&lt; 10%)</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-lg">📊</span>
                    <div>
                      <strong style={{ color: '#1B2430' }}>Continuar monitorando</strong>
                      <p style={{ color: '#4D5566', fontSize: '14px', marginTop: '4px' }}>Verifique este dashboard regularmente (1x/semana)</p>
                    </div>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* How to Fix */}
          <div className="rounded-lg p-6" style={{ backgroundColor: '#FBFAF6', border: '1px solid #E5DFD2', borderLeft: '4px solid #10203E' }}>
            <h3 className="font-bold text-lg mb-4" style={{ color: '#1B2430' }}>💡 Como corrigir</h3>
            <div className="space-y-4">
              <div>
                <strong style={{ color: '#1B2430' }}>Opção 1: Refinar Extraction Prompt</strong>
                <p style={{ color: '#4D5566', fontSize: '14px', marginTop: '8px' }}>
                  Arquivo: <code style={{ backgroundColor: '#F7F5EF', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', color: '#1B2430' }}>src/lib/email-reconciliation/extract-service.ts</code>
                </p>
                <p style={{ color: '#4D5566', fontSize: '13px', marginTop: '4px' }}>
                  Adicione exemplos de emails reais dos seus hóspedes ao prompt. Isso treina o OpenAI para reconhecer padrões específicos da Lodgra.
                </p>
              </div>

              <div style={{ borderTop: '1px solid #E5DFD2', paddingTop: '16px' }}>
                <strong style={{ color: '#1B2430' }}>Opção 2: Reconfigurar Thresholds</strong>
                <p style={{ color: '#4D5566', fontSize: '14px', marginTop: '8px' }}>
                  Se muitos casos caem em "múltiplas reservas mesma data", ajuste os thresholds de fuzzy matching:
                </p>
                <p style={{ color: '#4D5566', fontSize: '13px', marginTop: '4px' }}>
                  <code style={{ backgroundColor: '#F7F5EF', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', color: '#1B2430' }}>PROPERTY_MATCH_THRESHOLD</code> e{' '}
                  <code style={{ backgroundColor: '#F7F5EF', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', color: '#1B2430' }}>MIN_WINNER_MARGIN</code>
                </p>
              </div>

              <div style={{ borderTop: '1px solid #E5DFD2', paddingTop: '16px' }}>
                <strong style={{ color: '#1B2430' }}>Opção 3: Contato</strong>
                <p style={{ color: '#4D5566', fontSize: '14px', marginTop: '8px' }}>
                  Se o padrão for complexo, cole 3-5 emails dos casos pendentes no prompt de implementação para análise.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 rounded-lg p-6" style={{ backgroundColor: '#FBFAF6', border: '1px solid #E5DFD2', borderLeft: '4px solid #10203E' }}>
          <h3 className="font-bold mb-4" style={{ color: '#1B2430' }}>ℹ️ Como funciona</h3>
          <ul style={{ fontSize: '14px', color: '#4D5566', lineHeight: '1.6' }} className="space-y-2">
            <li>
              • <strong style={{ color: '#1B2430' }}>Sincronizadas:</strong> Dados do hóspede foram casados com uma reserva existente automaticamente
            </li>
            <li>
              • <strong style={{ color: '#1B2430' }}>Revisão Necessária:</strong> Email chegou mas a correspondência foi ambígua (ex: múltiplas reservas mesma
              data, sem nome da propriedade)
            </li>
            <li>
              • <strong style={{ color: '#1B2430' }}>Taxa de Revisão:</strong> Se &gt; 10%, considere verificar emails reais para refinar o extraction prompt
            </li>
          </ul>
        </div>

        {/* Toast Notification */}
        {toast && (
          <div
            style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              padding: '16px',
              borderRadius: '8px',
              maxWidth: '400px',
              backgroundColor: toast.type === 'error' ? '#FEE2E2' : toast.type === 'success' ? '#ECFDF5' : '#EFF6FF',
              border: `1px solid ${toast.type === 'error' ? '#FECACA' : toast.type === 'success' ? '#D1FAE5' : '#BFDBFE'}`,
              color: toast.type === 'error' ? '#991B1B' : toast.type === 'success' ? '#065F46' : '#1E40AF',
              boxShadow: 'rgba(0,0,0,0.1) 0 4px 12px',
              zIndex: 50,
              animation: 'slideInUp 0.3s ease-out',
            }}
          >
            <style>{`
              @keyframes slideInUp {
                from {
                  opacity: 0;
                  transform: translateY(20px);
                }
                to {
                  opacity: 1;
                  transform: translateY(0);
                }
              }
            `}</style>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, lineHeight: '1.5' }}>{toast.message}</p>
          </div>
        )}
      </div>
    </div>
  )
}

interface MetricCardProps {
  title: string
  value: number | string
  subtitle: string
  icon: string
  status?: 'success' | 'warning' | 'critical'
}

function MetricCard({ title, value, subtitle, icon, status }: MetricCardProps) {
  const borderColor = {
    success: '#059669',
    warning: '#C9A227',
    critical: '#DC2626',
    default: '#E5DFD2',
  }

  return (
    <div
      className="rounded-lg p-6"
      style={{
        backgroundColor: '#FBFAF6',
        border: '1px solid #E5DFD2',
        borderLeft: `4px solid ${status ? borderColor[status] : borderColor.default}`
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p style={{ color: '#4D5566', fontSize: '14px' }}>{title}</p>
          <p className="text-2xl font-bold mt-2" style={{ color: '#1B2430' }}>{value}</p>
          <p style={{ color: '#4D5566', fontSize: '12px', marginTop: '8px' }}>{subtitle}</p>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  )
}
