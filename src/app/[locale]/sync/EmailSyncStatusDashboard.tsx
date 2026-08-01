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

export function EmailSyncStatusDashboard() {
  const [metrics, setMetrics] = useState<SyncMetrics | null>(null)
  const [needsReviewCases, setNeedsReviewCases] = useState<NeedsReviewCase[]>([])
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetrics[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDays, setSelectedDays] = useState(7)

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--primary, #10203E)' }}></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {[7, 14, 30].map(days => (
          <button
            key={days}
            onClick={() => setSelectedDays(days)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedDays === days
                ? 'text-white'
                : 'border'
            }`}
            style={
              selectedDays === days
                ? { backgroundColor: 'var(--primary, #10203E)' }
                : { borderColor: 'var(--hairline, #E5DFD2)', color: 'var(--body, #4D5566)' }
            }
          >
            {days} dias
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard title="Total" value={metrics?.total || 0} subtitle="Extrações" />
        <MetricCard
          title="Sincronizadas"
          value={metrics?.synced || 0}
          subtitle={`${metrics?.syncRate.toFixed(1) || 0}% sucesso`}
          highlight="success"
        />
        <MetricCard
          title="Revisão"
          value={metrics?.needsReview || 0}
          subtitle={`${metrics?.needsReviewRate.toFixed(1) || 0}% do total`}
          highlight={metrics?.needsReviewRate! > 10 ? 'error' : 'warning'}
        />
        <MetricCard title="Taxa" value={`${metrics?.syncRate.toFixed(1) || 0}%`} subtitle="Sucesso" />
        <StatusCard status={metrics?.status || 'healthy'} />
      </div>

      {metrics?.needsReviewRate! > 10 && (
        <div
          className="rounded-lg p-4 border-l-4"
          style={{
            backgroundColor: 'rgba(159, 47, 31, 0.05)',
            borderColor: 'var(--primary-error-text, #9f2f1f)',
          }}
        >
          <h3 className="font-semibold mb-2" style={{ color: 'var(--primary-error-text, #9f2f1f)' }}>
            🚨 Taxa de revisão elevada
          </h3>
          <p className="text-sm" style={{ color: 'var(--primary-error-text-hover, #7f2115)' }}>
            {metrics?.needsReviewRate! > 15
              ? 'Taxa crítica. Investigar padrão e considerar pausar sync.'
              : 'Taxa acima do esperado. Verifique os casos abaixo.'}
          </p>
        </div>
      )}

      <div
        className="rounded-lg p-6 border"
        style={{ backgroundColor: 'var(--canvas, #FBFAF6)', borderColor: 'var(--hairline, #E5DFD2)' }}
      >
        <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--ink, #1B2430)' }}>
          Tendência (últimos {selectedDays} dias)
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <ChartColumn data={dailyMetrics} type="total" />
          <ChartColumn data={dailyMetrics} type="rate" />
        </div>
      </div>

      <div
        className="rounded-lg border overflow-hidden"
        style={{ backgroundColor: 'var(--canvas, #FBFAF6)', borderColor: 'var(--hairline, #E5DFD2)' }}
      >
        <div
          className="border-b p-6"
          style={{ borderColor: 'var(--hairline, #E5DFD2)' }}
        >
          <h2 className="text-lg font-semibold" style={{ color: 'var(--ink, #1B2430)' }}>
            Casos Pendentes ({needsReviewCases.length})
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--body, #4D5566)' }}>
            Extrações que precisam de revisão manual
          </p>
        </div>

        {needsReviewCases.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-lg font-medium" style={{ color: 'var(--ink, #1B2430)' }}>
              ✅ Nenhum caso aguardando
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--body, #4D5566)' }}>
              Todas as extrações foram sincronizadas com sucesso
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: 'var(--surface-soft, #F7F5EF)' }}>
                <tr style={{ borderBottomColor: 'var(--hairline, #E5DFD2)' }} className="border-b">
                  <th className="px-6 py-3 text-left text-sm font-semibold" style={{ color: 'var(--ink, #1B2430)' }}>
                    Hóspede
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold" style={{ color: 'var(--ink, #1B2430)' }}>
                    Propriedade
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold" style={{ color: 'var(--ink, #1B2430)' }}>
                    Datas
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold" style={{ color: 'var(--ink, #1B2430)' }}>
                    Motivo
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold" style={{ color: 'var(--ink, #1B2430)' }}>
                    Recebido
                  </th>
                </tr>
              </thead>
              <tbody>
                {needsReviewCases.slice(0, 20).map(case_ => (
                  <tr
                    key={case_.id}
                    style={{ borderBottomColor: 'var(--hairline, #E5DFD2)' }}
                    className="border-b hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-medium" style={{ color: 'var(--ink, #1B2430)' }}>
                      {case_.guestName || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm" style={{ color: 'var(--body, #4D5566)' }}>
                      {case_.propertyName || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm" style={{ color: 'var(--body, #4D5566)' }}>
                      {format(new Date(case_.checkIn), 'd MMM', { locale: ptBR })} →{' '}
                      {format(new Date(case_.checkOut), 'd MMM', { locale: ptBR })}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className="inline-block px-2 py-1 rounded text-xs font-medium"
                        style={{
                          backgroundColor: 'rgba(201, 162, 39, 0.1)',
                          color: 'var(--luxe, #C9A227)',
                        }}
                      >
                        {case_.reason}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm" style={{ color: 'var(--body, #4D5566)' }}>
                      {format(new Date(case_.createdAt), 'd MMM HH:mm', { locale: ptBR })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {needsReviewCases.length > 20 && (
              <div
                className="px-6 py-4 text-center text-sm border-t"
                style={{ borderColor: 'var(--hairline, #E5DFD2)', color: 'var(--body, #4D5566)' }}
              >
                +{needsReviewCases.length - 20} mais casos...
              </div>
            )}
          </div>
        )}
      </div>

      <div
        className="rounded-lg p-6 border"
        style={{
          backgroundColor: 'rgba(16, 32, 62, 0.02)',
          borderColor: 'var(--hairline-soft, #EFEADF)',
        }}
      >
        <h3 className="font-semibold mb-3" style={{ color: 'var(--ink, #1B2430)' }}>
          ℹ️ Como funciona
        </h3>
        <ul className="space-y-2 text-sm" style={{ color: 'var(--body, #4D5566)' }}>
          <li>• <strong>Sincronizadas:</strong> Email casado automaticamente com reserva existente</li>
          <li>• <strong>Revisão:</strong> Correspondência ambígua (múltiplas reservas, sem propriedade identificada)</li>
          <li>• <strong>Taxa:</strong> Se &gt; 10%, considere refinar o extraction prompt</li>
        </ul>
      </div>
    </div>
  )
}

function MetricCard({
  title,
  value,
  subtitle,
  highlight,
}: {
  title: string
  value: number | string
  subtitle: string
  highlight?: 'success' | 'warning' | 'error'
}) {
  const bgColor = {
    success: 'rgba(6, 214, 160, 0.05)',
    warning: 'rgba(201, 162, 39, 0.05)',
    error: 'rgba(159, 47, 31, 0.05)',
    default: 'var(--canvas, #FBFAF6)',
  }

  const borderColor = {
    success: 'rgba(6, 214, 160, 0.2)',
    warning: 'rgba(201, 162, 39, 0.2)',
    error: 'rgba(159, 47, 31, 0.2)',
    default: 'var(--hairline, #E5DFD2)',
  }

  return (
    <div
      className="rounded-lg p-4 border"
      style={{
        backgroundColor: bgColor[highlight || 'default'],
        borderColor: borderColor[highlight || 'default'],
      }}
    >
      <p className="text-sm" style={{ color: 'var(--body, #4D5566)' }}>
        {title}
      </p>
      <p className="text-2xl font-bold mt-1" style={{ color: 'var(--ink, #1B2430)' }}>
        {value}
      </p>
      <p className="text-xs mt-2" style={{ color: 'var(--body, #4D5566)' }}>
        {subtitle}
      </p>
    </div>
  )
}

function StatusCard({ status }: { status: 'healthy' | 'warning' | 'critical' }) {
  const statusConfig = {
    healthy: {
      bg: 'rgba(6, 214, 160, 0.05)',
      border: 'rgba(6, 214, 160, 0.2)',
      badge: 'rgba(6, 214, 160, 0.2)',
      badgeText: 'rgba(6, 214, 160, 1)',
      text: '✅ Saudável',
    },
    warning: {
      bg: 'rgba(201, 162, 39, 0.05)',
      border: 'rgba(201, 162, 39, 0.2)',
      badge: 'rgba(201, 162, 39, 0.2)',
      badgeText: 'var(--luxe, #C9A227)',
      text: '⚠️ Atenção',
    },
    critical: {
      bg: 'rgba(159, 47, 31, 0.05)',
      border: 'rgba(159, 47, 31, 0.2)',
      badge: 'rgba(159, 47, 31, 0.2)',
      badgeText: 'var(--primary-error-text, #9f2f1f)',
      text: '🚨 Crítico',
    },
  }

  const config = statusConfig[status]

  return (
    <div
      className="rounded-lg p-4 border flex flex-col justify-center items-center"
      style={{ backgroundColor: config.bg, borderColor: config.border }}
    >
      <span
        className="inline-block px-3 py-1 rounded-full text-sm font-medium mb-2"
        style={{ backgroundColor: config.badge, color: config.badgeText }}
      >
        {config.text}
      </span>
      <p className="text-sm" style={{ color: 'var(--body, #4D5566)' }}>
        Sistema
      </p>
    </div>
  )
}

function ChartColumn({ data, type }: { data: DailyMetrics[]; type: 'total' | 'rate' }) {
  if (data.length === 0) return null

  const maxValue = type === 'total' ? Math.max(...data.map(d => d.total)) : 100

  return (
    <div>
      <p className="text-sm mb-3" style={{ color: 'var(--body, #4D5566)' }}>
        {type === 'total' ? 'Extrações por dia' : 'Taxa de revisão (%)'}
      </p>
      <div className="flex gap-1 h-32 items-end">
        {data.map((day, i) => {
          const value = type === 'total' ? day.total : (day.total > 0 ? (day.needsReview / day.total) * 100 : 0)
          const height = Math.max(10, (value / maxValue) * 100)

          const color =
            type === 'total'
              ? 'var(--primary, #10203E)'
              : value > 10
                ? 'var(--primary-error-text, #9f2f1f)'
                : value > 5
                  ? 'var(--luxe, #C9A227)'
                  : 'rgba(6, 214, 160, 1)'

          return (
            <div
              key={i}
              className="flex-1 rounded-t transition-opacity hover:opacity-80"
              style={{ height: `${height}%`, backgroundColor: color }}
              title={type === 'total' ? `${day.date}: ${day.total}` : `${day.date}: ${value.toFixed(1)}%`}
            ></div>
          )
        })}
      </div>
    </div>
  )
}
