'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistance } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { RefreshCw, CheckCircle2, AlertCircle, Clock, Calendar, Mail, ArrowLeft } from 'lucide-react'

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
  property_name?: string
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
  const router = useRouter()
  const [job1Stats, setJob1Stats] = useState<JobStats | null>(null)
  const [job2Stats, setJob2Stats] = useState<JobStats | null>(null)
  const [recentLogs, setRecentLogs] = useState<SyncLog[]>([])
  const [loading, setLoading] = useState(true)
  const [nextRunIn, setNextRunIn] = useState<string>('')

  useEffect(() => {
    fetchSyncData()
    const interval = setInterval(fetchSyncData, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const timer = setInterval(updateNextRun, 1000)
    return () => clearInterval(timer)
  }, [])

  function updateNextRun() {
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
      const response = await fetch('/api/admin/sync-logs?limit=50')
      if (!response.ok) throw new Error('Failed to fetch sync logs')

      const logs: SyncLog[] = await response.json()
      const job1Logs = logs.filter(l => l.sync_type === 'ical')
      const job2Logs = logs.filter(l => l.sync_type === 'email')

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
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6 sm:mb-8 font-medium text-sm sm:text-base transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar
        </button>

        {/* Header */}
        <div className="mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 sm:mb-3">
            Sincronização de Dados
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Acompanhe o status em tempo real dos jobs de sincronização automática
          </p>
        </div>

        {/* Next Run Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6 mb-6 sm:mb-8 flex items-center gap-4 sm:gap-6">
          <div className="flex-shrink-0">
            <Clock className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="text-xs sm:text-sm font-medium text-blue-900">Próxima Sincronização</p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-600">em {nextRunIn}</p>
          </div>
        </div>

        {/* Job Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-8 sm:mb-12">
          {/* Job 1: sync-ical */}
          <JobCard
            icon={<Calendar className="w-6 h-6 sm:w-8 sm:h-8" />}
            jobName="Job 1: Sincronizar iCal"
            description="Sincroniza reservas do iCal das plataformas"
            stats={job1Stats}
            color="blue"
          />

          {/* Job 2: enrich-reservations */}
          <JobCard
            icon={<Mail className="w-6 h-6 sm:w-8 sm:h-8" />}
            jobName="Job 2: Enriquecer Reservas"
            description="Enriquece reservas com dados de emails"
            stats={job2Stats}
            color="green"
          />
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Atividade Recente</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-200">
                  <th className="px-4 sm:px-6 py-3 text-left font-semibold text-gray-900">Job</th>
                  <th className="px-4 sm:px-6 py-3 text-left font-semibold text-gray-900">Propriedade</th>
                  <th className="px-4 sm:px-6 py-3 text-left font-semibold text-gray-900">Status</th>
                  <th className="px-4 sm:px-6 py-3 text-right font-semibold text-gray-900">Criadas</th>
                  <th className="px-4 sm:px-6 py-3 text-right font-semibold text-gray-900">Atualizadas</th>
                  <th className="px-4 sm:px-6 py-3 text-right font-semibold text-gray-900">Erros</th>
                  <th className="px-4 sm:px-6 py-3 text-left font-semibold text-gray-900">Quando</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentLogs.length > 0 ? (
                  recentLogs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 sm:px-6 py-3 text-sm font-medium text-gray-900">
                        {log.sync_type === 'ical' ? '📅 iCal' : '📧 Email'}
                      </td>
                      <td className="px-4 sm:px-6 py-3 text-sm text-gray-600">
                        <span className="inline-block max-w-xs truncate" title={log.property_name || '-'}>
                          {log.property_name ? log.property_name.substring(0, 30) : '-'}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-3 text-sm">
                        {log.status === 'success' ? (
                          <span className="inline-flex items-center gap-2 text-green-700 font-medium">
                            <span className="w-2 h-2 rounded-full bg-green-600"></span>
                            Sucesso
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 text-red-700 font-medium">
                            <span className="w-2 h-2 rounded-full bg-red-600"></span>
                            Erro
                          </span>
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-3 text-sm text-right text-gray-600">
                        {log.records_created || 0}
                      </td>
                      <td className="px-4 sm:px-6 py-3 text-sm text-right text-gray-600">
                        {log.records_updated || 0}
                      </td>
                      <td className="px-4 sm:px-6 py-3 text-sm text-right">
                        <span className={log.records_failed && log.records_failed > 0 ? 'text-red-600 font-medium' : 'text-gray-600'}>
                          {log.records_failed || 0}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {formatDistance(new Date(log.synced_at), new Date(), {
                          locale: ptBR,
                          addSuffix: true,
                        })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 sm:px-6 py-8 text-center text-gray-500">
                      Sem registros de sincronização
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* System Info */}
        <div className="mt-8 sm:mt-12 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-white rounded-lg p-4 sm:p-6 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Job 1: Sincronizar iCal
            </h3>
            <p className="text-sm text-gray-600">
              A cada 15 minutos, sincroniza reservas dos feeds iCal do Airbnb e Booking.com, criando
              automaticamente novas reservas no Lodgra com informações básicas.
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 sm:p-6 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Mail className="w-5 h-5 text-green-600" />
              Job 2: Enriquecer Reservas
            </h3>
            <p className="text-sm text-gray-600">
              A cada 15 minutos, processa emails de confirmação e enriquece reservas existentes com
              dados completos (nome do hóspede, número de hóspedes, valor).
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

interface JobCardProps {
  icon: React.ReactNode
  jobName: string
  description: string
  stats: JobStats | null
  color: 'blue' | 'green'
}

function JobCard({ icon, jobName, description, stats, color }: JobCardProps) {
  const colorClasses = {
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'text-blue-600',
      badge: 'bg-blue-100 text-blue-800',
      pill: 'bg-blue-50 text-blue-700',
    },
    green: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: 'text-green-600',
      badge: 'bg-green-100 text-green-800',
      pill: 'bg-green-50 text-green-700',
    },
  }

  const c = colorClasses[color]

  return (
    <div className={`${c.bg} border ${c.border} rounded-lg p-4 sm:p-6`}>
      <div className="flex items-start gap-3 mb-4">
        <div className={`${c.icon} flex-shrink-0 mt-1`}>{icon}</div>
        <div className="flex-1">
          <h3 className="text-base sm:text-lg font-bold text-gray-900">{jobName}</h3>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">{description}</p>
        </div>
      </div>

      {stats ? (
        <div className="space-y-4">
          {/* Success Rate */}
          <div className="flex items-center justify-between bg-white rounded p-3 sm:p-4">
            <span className="text-xs sm:text-sm font-medium text-gray-700">Taxa de Sucesso</span>
            <span className={`text-lg sm:text-2xl font-bold ${c.icon}`}>{stats.successRate}%</span>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="bg-white rounded p-3 text-center">
              <p className="text-xs text-gray-600 mb-1">Criadas</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">{stats.totalCreated}</p>
            </div>
            <div className="bg-white rounded p-3 text-center">
              <p className="text-xs text-gray-600 mb-1">Atualizadas</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">{stats.totalUpdated}</p>
            </div>
            <div className="bg-white rounded p-3 text-center">
              <p className="text-xs text-gray-600 mb-1">Erros</p>
              <p className="text-lg sm:text-xl font-bold text-red-600">{stats.totalFailed}</p>
            </div>
          </div>

          {/* Status */}
          {stats.lastRun ? (
            <div className={`flex items-center gap-2 text-sm font-medium ${c.pill} rounded p-3`}>
              {stats.lastRun.status === 'success' ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Última execução: Sucesso
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4" />
                  Última execução: Erro
                </>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-600 bg-white rounded p-3">Aguardando primeira execução...</p>
          )}
        </div>
      ) : (
        <div className="text-sm text-gray-600 bg-white rounded p-3">Carregando dados...</div>
      )}
    </div>
  )
}
