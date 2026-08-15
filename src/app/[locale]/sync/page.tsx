'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { formatDistance } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CheckCircle2, AlertCircle, Clock, Calendar, Mail, ArrowLeft } from 'lucide-react'
import { PremiumPageShell, PremiumPageHeader, PremiumCard } from '@/components/common/layout/PremiumPage'

interface SyncFeedback {
  title: string
  detail: string
  action: string | null
  severity: 'success' | 'warning' | 'error' | 'info'
}

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
  property_id?: string
  property_name?: string
  platform_name?: string
  feedback: SyncFeedback
}

interface ApiResponse {
  error: boolean
  message?: string
  data: SyncLog[]
}

interface JobStats {
  totalRuns: number
  successfulRuns: number
  failedRuns: number
  latestCreated: number | null
  latestUpdated: number | null
  latestFailed: number | null
  latestCycle: SyncLog[]
  successRate: number
}

export default function SyncStatusPage() {
  const router = useRouter()
  const params = useParams<{ locale: string }>()
  const [job1Stats, setJob1Stats] = useState<JobStats | null>(null)
  const [job2Stats, setJob2Stats] = useState<JobStats | null>(null)
  const [recentLogs, setRecentLogs] = useState<SyncLog[]>([])
  const [loading, setLoading] = useState(true)
  const [nextRunIn, setNextRunIn] = useState<string>('')
  const [apiError, setApiError] = useState<string | null>(null)

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
      if (!response.ok) {
        const errorMsg = `Erro HTTP ${response.status} ao buscar logs`
        console.error(errorMsg)
        setApiError(errorMsg)
        setJob1Stats(calculateStats([]))
        setJob2Stats(calculateStats([]))
        setRecentLogs([])
        setLoading(false)
        return
      }

      const result: ApiResponse = await response.json()

      if (result.error) {
        console.error('API error:', result.message)
        setApiError(result.message || 'Erro desconhecido ao buscar logs')
        setJob1Stats(calculateStats([]))
        setJob2Stats(calculateStats([]))
        setRecentLogs([])
      } else {
        setApiError(null)
        const logs = result.data
        const job1Logs = logs.filter(l => l.sync_type === 'ical')
        const job2Logs = logs.filter(l => l.sync_type === 'email')

        setJob1Stats(calculateStats(job1Logs))
        setJob2Stats(calculateStats(job2Logs))
        setRecentLogs(logs.slice(0, 10))
      }

      setLoading(false)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error('Error fetching sync data:', errorMsg)
      setApiError(`Erro ao conectar com a API: ${errorMsg}`)
      setJob1Stats(calculateStats([]))
      setJob2Stats(calculateStats([]))
      setRecentLogs([])
      setLoading(false)
    }
  }

  function calculateStats(logs: SyncLog[]): JobStats {
    const successful = logs.filter(l => l.status === 'success')
    const failed = logs.filter(l => l.status === 'failed')
    const latestTimestamp = logs[0] ? new Date(logs[0].synced_at).getTime() : 0
    const latestCycle = logs.filter(log => latestTimestamp - new Date(log.synced_at).getTime() <= 2 * 60 * 1000)

    return {
      totalRuns: logs.length,
      successfulRuns: successful.length,
      failedRuns: failed.length,
      latestCreated: sumKnown(latestCycle, 'records_created'),
      latestUpdated: sumKnown(latestCycle, 'records_updated'),
      latestFailed: sumKnown(latestCycle, 'records_failed'),
      latestCycle,
      successRate: logs.length > 0 ? Math.round((successful.length / logs.length) * 100) : 0,
    }

    function sumKnown(items: SyncLog[], field: 'records_created' | 'records_updated' | 'records_failed') {
      if (items.length === 0 || items.some(item => item[field] === null)) return null
      return items.reduce((sum, item) => sum + (item[field] || 0), 0)
    }
  }

  const latestICalAlerts = job1Stats?.latestCycle.filter(log => ['warning', 'error'].includes(log.feedback.severity)) || []

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

      {/* Error Alert */}
      {apiError && (
        <PremiumCard className="border-red-500/20 bg-gradient-to-br from-red-500/5 to-transparent">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-600">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-red-700">Erro ao carregar dados</p>
              <p className="mt-1 text-sm text-red-600">{apiError}</p>
            </div>
          </div>
        </PremiumCard>
      )}

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

      {job1Stats && job1Stats.latestCycle.length > 0 && (
        <PremiumCard className={latestICalAlerts.length > 0 ? 'border-amber-500/30 bg-amber-500/5' : 'border-emerald-500/20 bg-emerald-500/5'}>
          <div className="flex items-start gap-4">
            {latestICalAlerts.length > 0 ? (
              <AlertCircle className="mt-0.5 h-6 w-6 shrink-0 text-amber-600" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
            )}
            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-brand-text-dark">
                {latestICalAlerts.length > 0
                  ? `${latestICalAlerts.length} calendário(s) requer(em) atenção`
                  : 'Todos os calendários responderam no último ciclo'}
              </h2>
              {latestICalAlerts.length === 0 ? (
                <p className="mt-1 text-sm text-brand-text-medium">
                  {job1Stats.latestCycle.length} feed(s) verificado(s). Nenhuma ação é necessária.
                </p>
              ) : (
                <div className="mt-3 space-y-3">
                  {latestICalAlerts.map(log => (
                    <div key={log.id} className="rounded-xl border border-amber-500/20 bg-brand-white p-4">
                      <p className="text-sm font-bold text-brand-text-dark">
                        {log.property_name || 'Propriedade não identificada'} · {log.platform_name || 'Canal não identificado'}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-red-700">{log.feedback.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-brand-text-medium">{log.feedback.detail}</p>
                      {log.feedback.action && <p className="mt-2 text-xs font-semibold text-amber-800">O que fazer: {log.feedback.action}</p>}
                      {log.property_id && (
                        <Link href={`/${params.locale}/properties/${log.property_id}`} className="mt-3 inline-flex text-xs font-bold text-brand-blue hover:underline">
                          Abrir propriedade e corrigir anúncio
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </PremiumCard>
      )}

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
                    className="group transition-colors hover:bg-brand-bg"
                  >
                    <td className="px-4 py-3 text-xs font-semibold text-brand-text-dark">
                      {log.sync_type === 'ical' ? '📅 iCal' : '📧 Email'}
                    </td>
                    <td className="px-4 py-3 text-xs text-brand-text-medium">
                      <span className="block max-w-xs truncate font-semibold text-brand-text-dark" title={log.property_name || 'Não identificada'}>
                        {log.property_name || 'Não identificada'}
                      </span>
                      <span className="mt-0.5 block text-[10px]">{log.platform_name || 'Canal não identificado'}</span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-start gap-1.5">
                          {['success', 'info'].includes(log.feedback.severity) ? (
                            <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600">
                              <span className="h-2 w-2 rounded-full bg-emerald-600" />
                              {log.feedback.title}
                            </span>
                          ) : (
                            <>
                              <span className="inline-flex items-center gap-1.5 font-semibold text-red-600">
                                <span className="h-2 w-2 rounded-full bg-red-600" />
                                {log.feedback.title}
                              </span>
                              {log.error_message && (
                                <span
                                  className="cursor-help text-red-500 hover:text-red-600"
                                  title={log.error_message}
                                >
                                  ⓘ
                                </span>
                              )}
                            </>
                          )}
                        </div>

                        {/* Status message */}
                        <p className="max-w-sm text-[10px] leading-relaxed text-brand-text-medium">{log.feedback.detail}</p>
                        {log.feedback.action && <p className="max-w-sm text-[10px] font-semibold text-amber-700">Ação: {log.feedback.action}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-brand-text-medium">
                      {formatCounter(log.records_created)}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-brand-text-medium">
                      {formatCounter(log.records_updated)}
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-semibold">
                      <span
                        className={
                          log.records_failed && log.records_failed > 0
                            ? 'text-red-600'
                            : 'text-brand-text-medium'
                        }
                        title={log.records_failed && log.records_failed > 0 ? `${log.records_failed} registros falharam` : undefined}
                      >
                        {formatCounter(log.records_failed)}
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
            <span className="text-xs font-semibold text-brand-text-medium">Saúde das últimas {stats.totalRuns} verificações</span>
            <span className={`text-lg font-bold ${color === 'blue' ? 'text-brand-blue' : 'text-emerald-600'}`}>
              {stats.successRate}%
            </span>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-neutral-200/60 bg-brand-white p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-text-medium">Criadas no ciclo</p>
              <p className="mt-2 text-lg font-bold text-brand-text-dark">{formatCounter(stats.latestCreated)}</p>
            </div>
            <div className="rounded-lg border border-neutral-200/60 bg-brand-white p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-text-medium">Atualizadas no ciclo</p>
              <p className="mt-2 text-lg font-bold text-brand-text-dark">{formatCounter(stats.latestUpdated)}</p>
            </div>
            <div className="rounded-lg border border-neutral-200/60 bg-brand-white p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-text-medium">Falhas no ciclo</p>
              <p className="mt-2 text-lg font-bold text-red-600">{formatCounter(stats.latestFailed)}</p>
            </div>
          </div>

          {/* Status */}
          {stats.latestCycle.length > 0 ? (
            <div className={`flex items-center gap-2 rounded-lg ${c.badge} px-4 py-3 text-xs font-semibold`}>
              {stats.latestCycle.every(log => !['warning', 'error'].includes(log.feedback.severity)) ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Último ciclo: {stats.latestCycle.length} de {stats.latestCycle.length} feed(s) concluído(s)
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4" />
                  Último ciclo: {stats.latestCycle.filter(log => ['warning', 'error'].includes(log.feedback.severity)).length} de {stats.latestCycle.length} feed(s) requer(em) atenção
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

function formatCounter(value: number | null) {
  return value === null ? '—' : value
}
