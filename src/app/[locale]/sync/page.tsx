'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistance } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CheckCircle2, AlertCircle, Clock, Calendar, Mail, ArrowLeft } from 'lucide-react'
import { PremiumPageShell, PremiumPageHeader, PremiumCard, PremiumMetricCard } from '@/components/common/layout/PremiumPage'

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
      <PremiumPageShell>
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-1/3 rounded-lg bg-neutral-200/40"></div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="h-48 rounded-2xl bg-neutral-200/40"></div>
            <div className="h-48 rounded-2xl bg-neutral-200/40"></div>
          </div>
        </div>
      </PremiumPageShell>
    )
  }

  return (
    <PremiumPageShell>
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="mb-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-blue transition-colors hover:text-brand-blue/80"
        aria-label="Voltar"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </button>

      {/* Header */}
      <PremiumPageHeader
        title="Sincronização"
        description="Acompanhe o status em tempo real dos jobs automáticos"
        icon={Calendar}
        badge={`Próxima: ${nextRunIn}`}
      />

      {/* Next Run Card */}
      <PremiumCard className="border-brand-blue/20 bg-gradient-to-br from-brand-blue/5 to-transparent">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-brand-blue/20 bg-brand-blue/10 text-brand-blue">
            <Clock className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-brand-text-medium">
              Próxima Sincronização
            </p>
            <p className="mt-1 text-2xl font-bold text-brand-blue">em {nextRunIn}</p>
          </div>
        </div>
      </PremiumCard>

      {/* Job Stats Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Job 1: sync-ical */}
        <JobCard
          icon={Calendar}
          jobName="Job 1: iCal"
          description="Sincroniza reservas do iCal"
          stats={job1Stats}
          color="blue"
        />

        {/* Job 2: enrich-reservations */}
        <JobCard
          icon={Mail}
          jobName="Job 2: Email"
          description="Enriquece reservas com dados"
          stats={job2Stats}
          color="success"
        />
      </div>

      {/* Recent Activity */}
      <PremiumCard as="section">
        <div className="mb-6">
          <h2 className="text-lg font-bold uppercase tracking-tight text-brand-text-dark">
            Atividade Recente
          </h2>
          <p className="mt-1 text-xs font-semibold text-brand-text-medium">
            Últimas 10 execuções
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200/60">
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-brand-text-medium">
                  Job
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-brand-text-medium">
                  Propriedade
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-brand-text-medium">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-brand-text-medium">
                  Criadas
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-brand-text-medium">
                  Atualizadas
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-brand-text-medium">
                  Erros
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-brand-text-medium">
                  Quando
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/40">
              {recentLogs.length > 0 ? (
                recentLogs.map(log => (
                  <tr
                    key={log.id}
                    className="transition-colors hover:bg-brand-bg"
                  >
                    <td className="px-4 py-3 text-xs font-semibold text-brand-text-dark">
                      {log.sync_type === 'ical' ? '📅 iCal' : '📧 Email'}
                    </td>
                    <td className="px-4 py-3 text-xs text-brand-text-medium">
                      <span
                        className="inline-block max-w-xs truncate"
                        title={log.property_name || '-'}
                      >
                        {log.property_name ? log.property_name.substring(0, 30) : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {log.status === 'success' ? (
                        <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600">
                          <span className="h-2 w-2 rounded-full bg-emerald-600" />
                          Sucesso
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 font-semibold text-red-600">
                          <span className="h-2 w-2 rounded-full bg-red-600" />
                          Erro
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-brand-text-medium">
                      {log.records_created || 0}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-brand-text-medium">
                      {log.records_updated || 0}
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-semibold">
                      <span
                        className={
                          log.records_failed && log.records_failed > 0
                            ? 'text-red-600'
                            : 'text-brand-text-medium'
                        }
                      >
                        {log.records_failed || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-brand-text-medium">
                      {formatDistance(new Date(log.synced_at), new Date(), {
                        locale: ptBR,
                        addSuffix: true,
                      })}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-xs text-brand-text-medium"
                  >
                    Sem registros de sincronização
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </PremiumCard>

      {/* System Info */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <PremiumCard>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand-blue/10 bg-brand-blue/5 text-brand-blue">
              <Calendar className="h-5 w-5" />
            </div>
            <h3 className="font-bold uppercase tracking-tight text-brand-text-dark">
              Job 1: iCal
            </h3>
          </div>
          <p className="text-xs font-medium leading-relaxed text-brand-text-medium">
            A cada 15 minutos, sincroniza reservas dos feeds iCal do Airbnb e Booking.com, criando automaticamente novas
            reservas com informações básicas.
          </p>
        </PremiumCard>
        <PremiumCard>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/15 bg-emerald-500/10 text-emerald-600">
              <Mail className="h-5 w-5" />
            </div>
            <h3 className="font-bold uppercase tracking-tight text-brand-text-dark">
              Job 2: Email
            </h3>
          </div>
          <p className="text-xs font-medium leading-relaxed text-brand-text-medium">
            A cada 15 minutos, processa emails de confirmação e enriquece reservas existentes com dados completos (nome,
            hóspedes, valor).
          </p>
        </PremiumCard>
      </div>
    </PremiumPageShell>
  )
}

interface JobCardProps {
  icon: React.ComponentType<{ className?: string }>
  jobName: string
  description: string
  stats: JobStats | null
  color: 'blue' | 'success'
}

function JobCard({ icon: Icon, jobName, description, stats, color }: JobCardProps) {
  const colorClasses = {
    blue: {
      bg: 'border-brand-blue/20 bg-brand-blue/5',
      icon: 'border-brand-blue/10 bg-brand-blue/5 text-brand-blue',
      badge: 'bg-brand-blue/10 text-brand-blue',
    },
    success: {
      bg: 'border-emerald-500/15 bg-emerald-500/5',
      icon: 'border-emerald-500/15 bg-emerald-500/10 text-emerald-600',
      badge: 'bg-emerald-500/10 text-emerald-600',
    },
  }

  const c = colorClasses[color]

  return (
    <PremiumCard className={c.bg}>
      <div className="mb-6 flex items-start gap-4">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${c.icon}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold uppercase tracking-tight text-brand-text-dark">{jobName}</h3>
          <p className="mt-1 text-xs text-brand-text-medium">{description}</p>
        </div>
      </div>

      {stats ? (
        <div className="space-y-3">
          {/* Success Rate */}
          <div className="flex items-center justify-between rounded-xl border border-neutral-200/60 bg-brand-white px-4 py-3">
            <span className="text-xs font-semibold text-brand-text-medium">Taxa de Sucesso</span>
            <span className={`text-lg font-bold ${color === 'blue' ? 'text-brand-blue' : 'text-emerald-600'}`}>
              {stats.successRate}%
            </span>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-neutral-200/60 bg-brand-white p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-text-medium">Criadas</p>
              <p className="mt-2 text-lg font-bold text-brand-text-dark">{stats.totalCreated}</p>
            </div>
            <div className="rounded-lg border border-neutral-200/60 bg-brand-white p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-text-medium">Atualizadas</p>
              <p className="mt-2 text-lg font-bold text-brand-text-dark">{stats.totalUpdated}</p>
            </div>
            <div className="rounded-lg border border-neutral-200/60 bg-brand-white p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-text-medium">Erros</p>
              <p className="mt-2 text-lg font-bold text-red-600">{stats.totalFailed}</p>
            </div>
          </div>

          {/* Status */}
          {stats.lastRun ? (
            <div className={`flex items-center gap-2 rounded-lg ${c.badge} px-4 py-3 text-xs font-semibold`}>
              {stats.lastRun.status === 'success' ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Última execução: Sucesso
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4" />
                  Última execução: Erro
                </>
              )}
            </div>
          ) : (
            <p className="rounded-lg border border-neutral-200/60 bg-brand-white px-4 py-3 text-xs text-brand-text-medium">
              Aguardando primeira execução...
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-neutral-200/60 bg-brand-white px-4 py-3 text-xs text-brand-text-medium">
          Carregando dados...
        </div>
      )}
    </PremiumCard>
  )
}
