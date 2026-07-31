'use client'

import { useEffect, useState } from 'react'
import { format, subDays } from 'date-fns'
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

export default function EmailSyncStatusPage() {
  const [metrics, setMetrics] = useState<SyncMetrics | null>(null)
  const [needsReviewCases, setNeedsReviewCases] = useState<NeedsReviewCase[]>([])
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetrics[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDays, setSelectedDays] = useState(7)

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 60000) // Atualiza a cada 1 min
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const statusColor = {
    healthy: 'bg-green-50 border-green-200',
    warning: 'bg-yellow-50 border-yellow-200',
    critical: 'bg-red-50 border-red-200',
  }

  const statusBadge = {
    healthy: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    critical: 'bg-red-100 text-red-800',
  }

  const statusText = {
    healthy: '✅ Saudável',
    warning: '⚠️ Atenção',
    critical: '🚨 Crítico',
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Email Sync Status</h1>
          <p className="text-gray-600 mt-2">Monitoramento em tempo real da sincronização de dados de hóspedes</p>
        </div>

        {/* Period Selector */}
        <div className="mb-6 flex gap-2">
          {[7, 14, 30].map(days => (
            <button
              key={days}
              onClick={() => setSelectedDays(days)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedDays === days
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {days} dias
            </button>
          ))}
        </div>

        {/* Main Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
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
            highlight="green"
          />
          <MetricCard
            title="Revisão Necessária"
            value={metrics?.needsReview || 0}
            subtitle={`${(metrics?.needsReviewRate ?? 0).toFixed(1)}% do total`}
            icon="⚠️"
            highlight={metrics?.needsReviewRate! > 10 ? 'red' : 'yellow'}
          />
          <MetricCard
            title="Taxa de Sincronização"
            value={`${(metrics?.syncRate ?? 0).toFixed(1)}%`}
            subtitle="Extrações com sucesso"
            icon="📈"
          />
          <div
            className={`rounded-lg border-2 p-6 ${statusColor[metrics?.status || 'healthy']} flex flex-col justify-center items-center`}
          >
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-2 ${statusBadge[metrics?.status || 'healthy']}`}>
              {statusText[metrics?.status || 'healthy']}
            </span>
            <p className="text-gray-600 text-sm text-center">Sistema</p>
          </div>
        </div>

        {/* Alert Section */}
        {metrics?.needsReviewRate! > 10 && (
          <div className="mb-8 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
            <h3 className="font-bold text-red-800 mb-2">🚨 Taxa de revisão elevada</h3>
            <p className="text-red-700 text-sm">
              A taxa de emails que precisam de revisão manual está acima de 10%. Verifique os casos abaixo e considere ajustar o extraction prompt.
            </p>
          </div>
        )}

        {/* Daily Trend Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Tendência (últimos {selectedDays} dias)</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600 mb-2">Extrações por dia</p>
              <div className="flex gap-1 h-32 items-end">
                {dailyMetrics.map((day, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-blue-200 rounded-t hover:bg-blue-300 relative group"
                    style={{
                      height: `${Math.max(10, (day.total / Math.max(...dailyMetrics.map(d => d.total))) * 100)}%`,
                    }}
                  >
                    <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap mb-1 z-10">
                      {day.date}: {day.total} (✅ {day.synced}, ⚠️ {day.needsReview})
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-gray-600 mb-2">Taxa de revisão por dia</p>
              <div className="flex gap-1 h-32 items-end">
                {dailyMetrics.map((day, i) => {
                  const rate = day.total > 0 ? (day.needsReview / day.total) * 100 : 0
                  return (
                    <div
                      key={i}
                      className={`flex-1 rounded-t hover:opacity-80 relative group ${
                        rate > 10 ? 'bg-red-300' : rate > 5 ? 'bg-yellow-300' : 'bg-green-300'
                      }`}
                      style={{
                        height: `${Math.max(5, Math.min(100, rate))}%`,
                      }}
                    >
                      <div className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap mb-1 z-10">
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
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900">Casos que Precisam de Revisão ({needsReviewCases.length})</h2>
            <p className="text-sm text-gray-600 mt-1">Extrações onde a correspondência com reserva foi ambígua</p>
          </div>

          {needsReviewCases.length === 0 ? (
            <div className="p-6 text-center text-gray-600">
              <p className="text-lg">✅ Nenhum caso aguardando revisão</p>
              <p className="text-sm mt-1">Todas as extrações foram sincronizadas com sucesso</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Hóspede</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Propriedade</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Datas</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Motivo</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Recebido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {needsReviewCases.slice(0, 20).map(case_ => (
                    <tr key={case_.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm">
                        <div className="font-medium text-gray-900">{case_.guestName || '—'}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{case_.propertyName || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {format(new Date(case_.checkIn), 'd MMM', { locale: ptBR })} →{' '}
                        {format(new Date(case_.checkOut), 'd MMM', { locale: ptBR })}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                          {case_.reason}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {format(new Date(case_.createdAt), 'd MMM HH:mm', { locale: ptBR })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {needsReviewCases.length > 20 && (
                <div className="px-6 py-4 text-center text-sm text-gray-600 border-t border-gray-200 bg-gray-50">
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
            className={`rounded-lg border-2 p-6 ${
              metrics?.needsReviewRate! > 15
                ? 'bg-red-50 border-red-200'
                : metrics?.needsReviewRate! > 10
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-green-50 border-green-200'
            }`}
          >
            <h3 className="font-bold text-lg mb-4">
              {metrics?.needsReviewRate! > 15
                ? '🚨 Ações para Taxa Crítica'
                : metrics?.needsReviewRate! > 10
                  ? '⚠️ Ações para Taxa Elevada'
                  : '✅ Tudo em ordem'}
            </h3>
            <ul className="space-y-3 text-sm">
              {metrics?.needsReviewRate! > 10 ? (
                <>
                  <li className="flex items-start gap-3">
                    <span className="text-lg">1️⃣</span>
                    <div>
                      <strong>Revisar casos pendentes</strong>
                      <p className="text-gray-600">Veja a tabela abaixo. Identifique o padrão comum nos {needsReviewCases.length} casos</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-lg">2️⃣</span>
                    <div>
                      <strong>Verificar extraction prompt</strong>
                      <p className="text-gray-600">Se muitos dizem "Propriedade não identificada", o extraction prompt precisa reforço</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-lg">3️⃣</span>
                    <div>
                      <strong>Testar com emails reais</strong>
                      <p className="text-gray-600">Copie 2-3 emails dos casos pendentes e teste o OpenAI prompt diretamente</p>
                    </div>
                  </li>
                  {metrics?.needsReviewRate! > 15 && (
                    <li className="flex items-start gap-3 mt-2 pt-2 border-t border-red-300">
                      <span className="text-lg">⚠️</span>
                      <div>
                        <strong>Considere pausar temporariamente</strong>
                        <p className="text-gray-600">Se o padrão for crítico, desabilite o sync automático enquanto ajusta</p>
                      </div>
                    </li>
                  )}
                </>
              ) : (
                <>
                  <li className="flex items-start gap-3">
                    <span className="text-lg">✓</span>
                    <div>
                      <strong>Sistema funcionando normalmente</strong>
                      <p className="text-gray-600">Taxa de revisão está saudável (&lt; 10%)</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-lg">📊</span>
                    <div>
                      <strong>Continuar monitorando</strong>
                      <p className="text-gray-600">Verifique este dashboard regularmente (1x/semana)</p>
                    </div>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* How to Fix */}
          <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-6">
            <h3 className="font-bold text-lg text-blue-900 mb-4">💡 Como corrigir</h3>
            <div className="space-y-4 text-sm">
              <div>
                <strong className="text-blue-900">Opção 1: Refinar Extraction Prompt</strong>
                <p className="text-gray-700 mt-1">
                  Arquivo: <code className="bg-white px-2 py-1 rounded text-xs">src/lib/email-reconciliation/extract-service.ts</code>
                </p>
                <p className="text-gray-600 text-xs mt-1">
                  Adicione exemplos de emails reais dos seus hóspedes ao prompt. Isso treina o OpenAI para reconhecer padrões específicos da Lodgra.
                </p>
              </div>

              <div className="border-t border-blue-200 pt-4">
                <strong className="text-blue-900">Opção 2: Reconfigurar Thresholds</strong>
                <p className="text-gray-700 mt-1">
                  Se muitos casos caem em "múltiplas reservas mesma data", ajuste os thresholds de fuzzy matching:
                </p>
                <p className="text-gray-600 text-xs mt-1">
                  <code className="bg-white px-2 py-1 rounded">PROPERTY_MATCH_THRESHOLD</code> e{' '}
                  <code className="bg-white px-2 py-1 rounded">MIN_WINNER_MARGIN</code>
                </p>
              </div>

              <div className="border-t border-blue-200 pt-4">
                <strong className="text-blue-900">Opção 3: Contato</strong>
                <p className="text-gray-700 mt-1">
                  Se o padrão for complexo, cole 3-5 emails dos casos pendentes no prompt de implementação para análise.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-bold text-blue-900 mb-2">ℹ️ Como funciona</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>
              • <strong>Sincronizadas:</strong> Dados do hóspede foram casados com uma reserva existente automaticamente
            </li>
            <li>
              • <strong>Revisão Necessária:</strong> Email chegou mas a correspondência foi ambígua (ex: múltiplas reservas mesma
              data, sem nome da propriedade)
            </li>
            <li>
              • <strong>Taxa de Revisão:</strong> Se &gt; 10%, considere verificar emails reais para refinar o extraction prompt
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

interface MetricCardProps {
  title: string
  value: number | string
  subtitle: string
  icon: string
  highlight?: 'green' | 'yellow' | 'red'
}

function MetricCard({ title, value, subtitle, icon, highlight }: MetricCardProps) {
  const bgColor = {
    green: 'bg-green-50 border-green-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    red: 'bg-red-50 border-red-200',
    default: 'bg-white border-gray-200',
  }

  return (
    <div className={`rounded-lg border-2 p-4 ${highlight ? bgColor[highlight] : bgColor.default}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          <p className="text-xs text-gray-600 mt-2">{subtitle}</p>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  )
}
