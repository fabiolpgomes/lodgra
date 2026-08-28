'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { formatDistance } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CheckCircle2, AlertCircle, Clock, Calendar, Mail, ArrowLeft, RefreshCw, Loader2 } from 'lucide-react'
import { PremiumPageShell, PremiumPageHeader, PremiumCard } from '@/components/common/layout/PremiumPage'
import { Button } from '@/components/common/ui/button'

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
  latestCreated: number | null
  latestUpdated: number | null
  latestFailed: number | null
  latestCycle: SyncLog[]
}

export default function SyncStatusPage() {
  const router = useRouter()
  const params = useParams<{ locale: string }>()
  const [job1Stats, setJob1Stats] = useState<JobStats | null>(null)
  const [job2Stats, setJob2Stats] = useState<JobStats | null>(null)
  const [recentLogs, setRecentLogs] = useState<SyncLog[]>([])
  const [loading, setLoading] = useState(true)
  const [nextRunIn, setNextRunIn] = useState<string>('')
  const [historyWarning, setHistoryWarning] = useState<string | null>(null)
  const [manualSyncing, setManualSyncing] = useState(false)
  const [manualSyncResult, setManualSyncResult] = useState<{
    success: boolean
    message: string
    timestamp: string
  } | null>(null)

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

  async function runManualSync() {
    setManualSyncing(true)
    setManualSyncResult(null)

    try {
      const response = await fetch('/api/admin/run-cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: '/api/cron/sync-ical' }),
      })

      const data = await response.json()

      if (response.ok) {
        const totals = data?.totals || {}
        const created = typeof totals.created === 'number' ? totals.created : 0
        const updated = typeof totals.updated === 'number' ? totals.updated : 0
        const skipped = typeof totals.skipped === 'number' ? totals.skipped : 0
        const cancelled = typeof totals.cancelled === 'number' ? totals.cancelled : 0

        setManualSyncResult({
          success: true,
          message: `Sincronização concluída: ${created} nova(s), ${updated} atualizada(s), ${skipped} ignorada(s)${cancelled > 0 ? `, ${cancelled} cancelada(s)` : ''}.`,
          timestamp: new Date().toISOString(),
        })
      } else {
        setManualSyncResult({
          success: false,
          message: data?.error || 'Não foi possível executar a sincronização dos calendários.',
          timestamp: new Date().toISOString(),
        })
      }
    } catch (error) {
      setManualSyncResult({
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao conectar com o servidor.',
        timestamp: new Date().toISOString(),
      })
    } finally {
      setManualSyncing(false)
    }
  }

  async function fetchSyncData() {
    try {
      const response = await fetch('/api/admin/sync-logs?limit=50')
      if (!response.ok) {
        const warningMsg = 'O histórico de sincronização está indisponível no momento. Você ainda pode usar o botão de sincronização imediata.'
        console.error(warningMsg)
        setHistoryWarning(warningMsg)
        setJob1Stats(calculateStats([]))
        setJob2Stats(calculateStats([]))
        setRecentLogs([])
        setLoading(false)
        return
      }

      const result: ApiResponse = await response.json()

      if (result.error) {
        console.error('API error:', result.message)
        setHistoryWarning('O histórico de sincronização está indisponível no momento. Você ainda pode usar o botão de sincronização imediata.')
        setJob1Stats(calculateStats([]))
        setJob2Stats(calculateStats([]))
        setRecentLogs([])
      } else {
        setHistoryWarning(null)
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
      setHistoryWarning('O histórico de sincronização está indisponível no momento. Você ainda pode usar o botão de sincronização imediata.')
      setJob1Stats(calculateStats([]))
      setJob2Stats(calculateStats([]))
      setRecentLogs([])
      setLoading(false)
    }
  }

  function calculateStats(logs: SyncLog[]): JobStats {
    const latestTimestamp = logs[0] ? new Date(logs[0].synced_at).getTime() : 0
    const latestCycle = logs.filter(log => latestTimestamp - new Date(log.synced_at).getTime() <= 2 * 60 * 1000)

    return {
      latestCreated: sumKnown(latestCycle, 'records_created'),
      latestUpdated: sumKnown(latestCycle, 'records_updated'),
      latestFailed: sumKnown(latestCycle, 'records_failed'),
      latestCycle,
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

      {/* History Warning */}
      {historyWarning && (
        <PremiumCard className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-700">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-amber-800">Histórico de sincronização indisponível</p>
              <p className="mt-1 text-sm text-amber-700">{historyWarning}</p>
            </div>
          </div>
        </PremiumCard>
      )}

      {/* Header */}
      <PremiumPageHeader
        title="Atualização das reservas"
        description="Veja se os calendários das suas propriedades estão funcionando"
        icon={Calendar}
        badge={`Nova verificação em ${nextRunIn}`}
      />

      {/* Next Run Card */}
      <PremiumCard className="border-brand-blue/20 bg-gradient-to-br from-brand-blue/5 to-transparent">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-brand-blue/20 bg-brand-blue/10 text-brand-blue">
            <Clock className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-brand-text-medium">
              Próxima verificação automática
            </p>
            <p className="mt-1 text-2xl font-bold text-brand-blue">em {nextRunIn}</p>
          </div>
        </div>
      </PremiumCard>

      {/* Manual Sync */}
      <PremiumCard className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600">
              <RefreshCw className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-brand-text-medium">
                Sincronização manual via iCal
              </p>
              <h2 className="mt-1 text-xl font-bold text-brand-text-dark">
                Sincronizar todas as plataformas agora
              </h2>
              <p className="mt-1 text-sm text-brand-text-medium">
                Como o agendamento no plano free do Vercel é limitado, use este botão para executar o mesmo fluxo do cron e atualizar as reservas de todas as plataformas cadastradas via iCal.
              </p>
              <p className="mt-2 text-sm font-semibold text-emerald-700">
                Atualiza agora as reservas anunciadas nas plataformas.
              </p>
            </div>
          </div>

          <Button
            onClick={runManualSync}
            disabled={manualSyncing}
            className="inline-flex items-center gap-2 self-start md:self-auto"
          >
            {manualSyncing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sincronizando calendários...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Sincronizar agora
              </>
            )}
          </Button>
        </div>

        {manualSyncResult && (
          <div
            className={`mt-4 rounded-xl border p-4 ${
              manualSyncResult.success
                ? 'border-emerald-500/20 bg-emerald-500/5'
                : 'border-red-500/20 bg-red-500/5'
            }`}
          >
            <div className="flex items-start gap-3">
              {manualSyncResult.success ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              )}
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-semibold ${
                    manualSyncResult.success ? 'text-emerald-800' : 'text-red-800'
                  }`}
                >
                  {manualSyncResult.message}
                </p>
                <p className="mt-1 text-xs text-brand-text-medium">
                  {new Date(manualSyncResult.timestamp).toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
          </div>
        )}
      </PremiumCard>

      {/* Job Stats Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <JobCard
          icon={Calendar}
          jobName="Calendários"
          description="Reservas do Airbnb e Booking.com"
          stats={job1Stats}
          color="blue"
        />

        <JobCard
          icon={Mail}
          jobName="Dados dos hóspedes"
          description="Informações recebidas por email"
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
                  ? `${latestICalAlerts.length} calendário(s) precisa(m) de ajuda`
                  : 'Tudo certo com seus calendários'}
              </h2>
              {latestICalAlerts.length === 0 ? (
                <p className="mt-1 text-sm text-brand-text-medium">
                  Verificamos {job1Stats.latestCycle.length} calendário(s). Você não precisa fazer nada.
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
                      {log.feedback.action && <p className="mt-3 rounded-lg bg-amber-100 p-3 text-sm font-semibold text-amber-900">O que fazer agora: {log.feedback.action}</p>}
                      {log.property_id && (
                        <Link href={`/${params.locale}/properties/${log.property_id}`} className="mt-3 inline-flex text-xs font-bold text-brand-blue hover:underline">
                          Abrir esta propriedade
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
            O que aconteceu recentemente
          </h2>
          <p className="mt-1 text-xs font-semibold text-brand-text-medium">
            As 10 verificações mais recentes
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200/60">
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-brand-text-medium">
                  Origem
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-brand-text-medium">
                  Propriedade
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-brand-text-medium">
                  Resultado
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-brand-text-medium">
                  Novas
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-brand-text-medium">
                  Alteradas
                </th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-brand-text-medium">
                  Problemas
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
                      {log.sync_type === 'ical' ? '📅 Calendário' : '📧 Email'}
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
                            <span className="inline-flex items-center gap-1.5 font-semibold text-red-600">
                              <span className="h-2 w-2 rounded-full bg-red-600" />
                              {log.feedback.title}
                            </span>
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
                    Ainda não há verificações para mostrar
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </PremiumCard>

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
          {/* Simple result */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-neutral-200/60 bg-brand-white p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-text-medium">Reservas novas</p>
              <p className="mt-2 text-lg font-bold text-brand-text-dark">{formatCounter(stats.latestCreated)}</p>
            </div>
            <div className="rounded-lg border border-neutral-200/60 bg-brand-white p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-text-medium">Reservas alteradas</p>
              <p className="mt-2 text-lg font-bold text-brand-text-dark">{formatCounter(stats.latestUpdated)}</p>
            </div>
            <div className="rounded-lg border border-neutral-200/60 bg-brand-white p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-text-medium">Precisam de ajuda</p>
              <p className="mt-2 text-lg font-bold text-red-600">{formatCounter(stats.latestFailed)}</p>
            </div>
          </div>

          {/* Status */}
          {stats.latestCycle.length > 0 ? (
            <div className={`flex items-center gap-2 rounded-lg ${c.badge} px-4 py-3 text-xs font-semibold`}>
              {stats.latestCycle.every(log => !['warning', 'error'].includes(log.feedback.severity)) ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Tudo certo na última verificação
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4" />
                  Há algo que precisa da sua atenção
                </>
              )}
            </div>
          ) : (
            <p className="rounded-lg border border-neutral-200/60 bg-brand-white px-4 py-3 text-xs text-brand-text-medium">
              Ainda não há uma verificação para mostrar.
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
