'use client'

import { useEffect, useState } from 'react'
import { format, formatDistance } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { RefreshCw, CheckCircle2, AlertCircle, Clock } from 'lucide-react'

interface SyncLog {
  id: string
  property_listing_id: string | null
  sync_type: 'ical' | 'email'
  direction: 'inbound' | 'outbound'
  status: 'success' | 'failed'
  error_message: string | null
  records_processed: number | null
  records_created: number | null
  records_updated: number | null
  records_failed: number | null
  synced_at: string
}

interface JobStats {
  totalRuns: number
  successfulRuns: number
  failedRuns: number
  totalCreated: number
  totalUpdated: number
  totalFailed: number
  lastRun: SyncLog | null
  successRate: number
}

export default function SyncStatusPage() {
  const [job1Stats, setJob1Stats] = useState<JobStats | null>(null)
  const [job2Stats, setJob2Stats] = useState<JobStats | null>(null)
  const [recentLogs, setRecentLogs] = useState<SyncLog[]>([])
  const [loading, setLoading] = useState(true)
  const [nextRunIn, setNextRunIn] = useState<string>('')

  useEffect(() => {
    fetchSyncData()
    const interval = setInterval(fetchSyncData, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const timer = setInterval(updateNextRun, 1000)
    return () => clearInterval(timer)
  }, [])

  function updateNextRun() {
    // Next run is every 15 minutes
    const now = new Date()
    const minutes = now.getMinutes()
    const secondsToNext = (15 - (minutes % 15)) * 60 - now.getSeconds()
    if (secondsToNext > 0) {
      setNextRunIn(`${Math.ceil(secondsToNext / 60)}m`)
    } else {
      setNextRunIn('Agora')
    }
  }

  async function fetchSyncData() {
    try {
      // Get sync logs from database
      const response = await fetch('/api/admin/sync-logs?limit=50')
      if (!response.ok) throw new Error('Failed to fetch sync logs')

      const logs: SyncLog[] = await response.json()

      // Separate by job type
      const job1Logs = logs.filter(l => l.sync_type === 'ical')
      const job2Logs = logs.filter(l => l.sync_type === 'email')

      // Calculate stats
      setJob1Stats(calculateStats(job1Logs))
      setJob2Stats(calculateStats(job2Logs))
      setRecentLogs(logs.slice(0, 10))
      setLoading(false)
    } catch (error) {
      console.error('Error fetching sync data:', error)
      setLoading(false)
    }
  }

  function calculateStats(logs: SyncLog[]): JobStats {
    const successful = logs.filter(l => l.status === 'success')
    const failed = logs.filter(l => l.status === 'failed')

    return {
      totalRuns: logs.length,
      successfulRuns: successful.length,
      failedRuns: failed.length,
      totalCreated: successful.reduce((sum, l) => sum + (l.records_created || 0), 0),
      totalUpdated: successful.reduce((sum, l) => sum + (l.records_updated || 0), 0),
      totalFailed: logs.reduce((sum, l) => sum + (l.records_failed || 0), 0),
      lastRun: logs[0] || null,
      successRate: logs.length > 0 ? Math.round((successful.length / logs.length) * 100) : 0,
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-40 bg-gray-200 rounded"></div>
              <div className="h-40 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Sincronização de Dados</h1>
          <p className="text-gray-600">Acompanhe o status em tempo real dos jobs de sincronização</p>
        </div>

        {/* Next Run Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8 flex items-center gap-3">
          <Clock className="w-5 h-5 text-blue-600" />
          <div>
            <p className="text-sm font-medium text-blue-900">Próxima Sincronização</p>
            <p className="text-2xl font-bold text-blue-600">em {nextRunIn}</p>
          </div>
        </div>

        {/* Job Stats Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Job 1: sync-ical */}
          <JobCard
            jobName="Job 1: Sincronizar iCal"
            description="Sincroniza reservas do iCal das plataformas"
            stats={job1Stats}
            color="blue"
          />

          {/* Job 2: enrich-reservations */}
          <JobCard
            jobName="Job 2: Enriquecer Reservas"
            description="Enriquece reservas com dados de emails"
            stats={job2Stats}
            color="green"
          />
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Atividade Recente</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Job</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Criadas</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Atualizadas</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Erros</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Quando</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentLogs.length > 0 ? (
                  recentLogs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {log.sync_type === 'ical' ? '📅 iCal' : '📧 Email'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {log.status === 'success' ? (
                          <span className="inline-flex items-center gap-2 text-green-700 font-medium">
                            <CheckCircle2 className="w-4 h-4" />
                            Sucesso
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 text-red-700 font-medium">
                            <AlertCircle className="w-4 h-4" />
                            Erro
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{log.records_created || 0}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{log.records_updated || 0}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{log.records_failed || 0}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDistance(new Date(log.synced_at), new Date(), {
                          locale: ptBR,
                          addSuffix: true,
                        })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      Sem registros de sincronização
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* System Status */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">📋 Como Funciona</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-semibold text-gray-900 mb-2">Job 1: Sincronizar iCal</h4>
              <p className="text-sm text-gray-600">
                A cada 15 minutos, sincroniza reservas dos feeds iCal do Airbnb e Booking.com, criando
                automaticamente novas reservas no Lodgra com informações básicas (datas, propriedade).
              </p>
            </div>
            <div className="border-l-4 border-green-500 pl-4">
              <h4 className="font-semibold text-gray-900 mb-2">Job 2: Enriquecer Reservas</h4>
              <p className="text-sm text-gray-600">
                A cada 15 minutos, processa emails de confirmação e enriquece reservas existentes com
                dados completos (nome do hóspede, número de hóspedes, valor da reserva).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface JobCardProps {
  jobName: string
  description: string
  stats: JobStats | null
  color: 'blue' | 'green'
}

function JobCard({ jobName, description, stats, color }: JobCardProps) {
  const colorClasses = {
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-900',
      badge: 'bg-blue-100 text-blue-800',
      icon: 'text-blue-600',
    },
    green: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-900',
      badge: 'bg-green-100 text-green-800',
      icon: 'text-green-600',
    },
  }

  const c = colorClasses[color]

  return (
    <div className={`${c.bg} border ${c.border} rounded-lg p-6`}>
      <h3 className={`text-lg font-bold ${c.text} mb-1`}>{jobName}</h3>
      <p className="text-sm text-gray-600 mb-6">{description}</p>

      {stats ? (
        <div className="space-y-4">
          {/* Success Rate */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Taxa de Sucesso</span>
            <span className={`text-2xl font-bold ${c.text}`}>{stats.successRate}%</span>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded p-3">
              <p className="text-xs text-gray-600 mb-1">Criadas</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalCreated}</p>
            </div>
            <div className="bg-white rounded p-3">
              <p className="text-xs text-gray-600 mb-1">Atualizadas</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalUpdated}</p>
            </div>
            <div className="bg-white rounded p-3">
              <p className="text-xs text-gray-600 mb-1">Erros</p>
              <p className="text-2xl font-bold text-red-600">{stats.totalFailed}</p>
            </div>
          </div>

          {/* Status Badge */}
          {stats.lastRun ? (
            <div className="flex items-center gap-2">
              {stats.lastRun.status === 'success' ? (
                <>
                  <CheckCircle2 className={`w-5 h-5 ${c.icon}`} />
                  <span className={`text-sm font-medium ${c.text}`}>Última execução: Sucesso</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <span className="text-sm font-medium text-red-600">Última execução: Erro</span>
                </>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-600">Aguardando primeira execução...</p>
          )}
        </div>
      ) : (
        <div className="text-sm text-gray-600">Carregando dados...</div>
      )}
    </div>
  )
}
