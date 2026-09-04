'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { formatDistance } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CheckCircle2, AlertCircle, Clock, Calendar, Mail, ArrowLeft, RefreshCw, Loader2, Search, X } from 'lucide-react'
import { PremiumPageShell, PremiumPageHeader, PremiumCard } from '@/components/common/layout/PremiumPage'
import { Button } from '@/components/common/ui/button'
import { Input } from '@/components/common/ui/input'
import { ChannelsModeTabs } from '@/app/[locale]/settings/channels/ChannelsModeTabs'

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

interface ManualSyncTotals {
  created: number
  updated: number
  blocked: number
  unknown: number
  skipped: number
  cancelled: number
}

interface ApiResponse {
  error: boolean
  message?: string
  data: SyncLog[]
}

interface CalendarEventAuditRow {
  id: string
  property_name?: string | null
  platform_name?: string | null
  source_platform: string
  check_in: string
  check_out: string
  ical_uid: string
  raw_summary: string | null
  raw_vevent: string
  event_kind: 'reservation' | 'block' | 'unknown'
  status: string
  created_at: string
  reservation_id?: string | null
  classification_label: string
  classification_reason: string
  operational_hint: string
  incoming_summary: string
  action_recommendation: string
  action_marker: string
  action_marker_reason: string
}

interface CalendarEventAuditResponse {
  error: boolean
  message?: string
  data: CalendarEventAuditRow[]
  summary?: {
    reservations: number
    blocks: number
    unknown: number
  }
}

interface JobStats {
  latestCreated: number | null
  latestUpdated: number | null
  latestFailed: number | null
  latestCycle: SyncLog[]
}

type AuditFilter = 'all' | 'reservation' | 'block' | 'unknown'
type AuditActionFilter = 'all' | 'inclusão' | 'alteração' | 'cancelamento' | 'bloqueio' | 'revisão'

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
  const [manualSyncTotals, setManualSyncTotals] = useState<ManualSyncTotals | null>(null)
  const [auditEvents, setAuditEvents] = useState<CalendarEventAuditRow[]>([])
  const [auditSummary, setAuditSummary] = useState<CalendarEventAuditResponse['summary'] | null>(null)
  const [auditLoading, setAuditLoading] = useState(true)
  const [auditWarning, setAuditWarning] = useState<string | null>(null)
  const [auditFilter, setAuditFilter] = useState<AuditFilter>('all')
  const [auditActionFilter, setAuditActionFilter] = useState<AuditActionFilter>('all')
  const [auditSearch, setAuditSearch] = useState('')

  useEffect(() => {
    fetchSyncData()
    const interval = setInterval(fetchSyncData, 30000)
    return () => {
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    fetchAuditEvents(auditSearch)
    const auditInterval = setInterval(() => fetchAuditEvents(auditSearch), 30000)
    return () => clearInterval(auditInterval)
  }, [auditSearch])

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
    setManualSyncTotals(null)

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
        const blocked = typeof totals.blocked === 'number' ? totals.blocked : 0
        const unknown = typeof totals.unknown === 'number' ? totals.unknown : 0
        const skipped = typeof totals.skipped === 'number' ? totals.skipped : 0
        const cancelled = typeof totals.cancelled === 'number' ? totals.cancelled : 0

        setManualSyncTotals({
          created,
          updated,
          blocked,
          unknown,
          skipped,
          cancelled,
        })

        setManualSyncResult({
          success: true,
          message: `Sincronização iCal concluída: ${created} nova(s), ${updated} atualizada(s), ${blocked} bloqueio(s), ${unknown} desconhecida(s), ${skipped} ignorada(s)${cancelled > 0 ? `, ${cancelled} cancelada(s)` : ''}.`,
          timestamp: new Date().toISOString(),
        })
      } else {
        setManualSyncResult({
          success: false,
          message: data?.error || 'Não foi possível executar a sincronização iCal dos calendários.',
          timestamp: new Date().toISOString(),
        })
      }
    } catch (error) {
      setManualSyncResult({
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao conectar com o servidor iCal.',
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

  async function fetchAuditEvents(query = auditSearch) {
    try {
      const params = new URLSearchParams({ limit: '12' })
      if (query.trim()) params.set('q', query.trim())

      const response = await fetch(`/api/admin/ical-events?${params.toString()}`)
      if (!response.ok) {
        setAuditWarning('A auditoria recente de iCal está indisponível no momento.')
        setAuditEvents([])
        setAuditSummary(null)
        setAuditLoading(false)
        return
      }

      const result: CalendarEventAuditResponse = await response.json()
      if (result.error) {
        setAuditWarning(result.message || 'Não foi possível carregar a auditoria de iCal.')
        setAuditEvents([])
        setAuditSummary(null)
      } else {
        setAuditWarning(null)
        setAuditEvents(result.data || [])
        setAuditSummary(result.summary || null)
      }

      setAuditLoading(false)
    } catch (error) {
      console.error('Error fetching iCal audit:', error)
      setAuditWarning('A auditoria recente de iCal está indisponível no momento.')
      setAuditEvents([])
      setAuditSummary(null)
      setAuditLoading(false)
    }
  }

  function previewRawVEvent(raw: string) {
    const compact = raw.replace(/\r\n/g, '\n').trim()
    return compact.length > 420 ? `${compact.slice(0, 420)}…` : compact
  }

  const filteredAuditEvents = auditFilter === 'all'
    ? auditEvents
    : auditEvents.filter(event => event.event_kind === auditFilter)

  const actionFilteredAuditEvents = auditActionFilter === 'all'
    ? filteredAuditEvents
    : filteredAuditEvents.filter(event => event.action_marker === auditActionFilter)

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

      <ChannelsModeTabs
        icalPanel={
          <>
            {/* Manual Sync */}
            <PremiumCard className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600">
                    <RefreshCw className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-brand-text-medium">
                      Atualização imediata via iCal
                    </p>
                    <h2 className="mt-1 text-xl font-bold text-brand-text-dark">
                      Atualize as reservas das plataformas
                    </h2>
                    <p className="mt-1 text-sm text-brand-text-medium">
                      Este botão dispara apenas a atualização imediata das reservas anunciadas via iCal. A rotina existente continua responsável pelas atualizações recorrentes das reservas já criadas pelo `run-cron`.
                    </p>
                    <p className="mt-2 text-sm font-semibold text-emerald-700">
                      Atualize as reservas via iCal imediatamente.
                    </p>
                    <p className="mt-2 text-xs text-brand-text-medium">
                      A Booking native API está desenvolvida, mas permanece desativada até a Booking.com reabrir parcerias com desenvolvedores
                      e homologar o produto. Enquanto isso, este botão opera apenas o fluxo iCal em produção.
                    </p>
                  </div>
                </div>

                <Button
                  onClick={runManualSync}
                  disabled={manualSyncing}
                  className="inline-flex items-center gap-2 self-start md:self-auto"
                  aria-label="Sincronizar reservas via iCal"
                >
                  {manualSyncing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sincronizando iCal...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      Sincronizar iCal agora
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

              {manualSyncTotals && (
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
                  <div className="rounded-xl border border-neutral-200/60 bg-white/70 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-brand-text-medium">Reservas</p>
                    <p className="mt-2 text-2xl font-bold text-brand-text-dark">
                      {manualSyncTotals.created + manualSyncTotals.updated}
                    </p>
                    <p className="mt-1 text-xs text-brand-text-medium">
                      {manualSyncTotals.created} criadas, {manualSyncTotals.updated} atualizadas
                    </p>
                  </div>
                  <div className="rounded-xl border border-neutral-200/60 bg-white/70 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-brand-text-medium">Bloqueios</p>
                    <p className="mt-2 text-2xl font-bold text-brand-text-dark">{manualSyncTotals.blocked}</p>
                    <p className="mt-1 text-xs text-brand-text-medium">
                      Bloqueios de calendário importados ou atualizados
                    </p>
                  </div>
                  <div className="rounded-xl border border-neutral-200/60 bg-white/70 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-brand-text-medium">Desconhecidas</p>
                    <p className="mt-2 text-2xl font-bold text-brand-text-dark">{manualSyncTotals.unknown}</p>
                    <p className="mt-1 text-xs text-brand-text-medium">
                      Eventos sem evidência suficiente para classificar
                    </p>
                  </div>
                  <div className="rounded-xl border border-neutral-200/60 bg-white/70 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-brand-text-medium">Ignoradas</p>
                    <p className="mt-2 text-2xl font-bold text-brand-text-dark">{manualSyncTotals.skipped}</p>
                    <p className="mt-1 text-xs text-brand-text-medium">
                      Eventos fora de intervalo ou duplicados
                    </p>
                  </div>
                </div>
              )}
            </PremiumCard>

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

            {/* Job Stats Grid */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <JobCard
                icon={Calendar}
                jobName="Calendários"
                description="Reservas do Airbnb, Booking.com e outras plataformas via iCal"
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

            <PremiumCard as="section" className="border-sky-500/20 bg-gradient-to-br from-sky-500/5 to-transparent">
              <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-bold uppercase tracking-tight text-brand-text-dark">
                    Auditoria iCal
                  </h2>
                  <p className="mt-1 text-xs font-semibold text-brand-text-medium">
                    Eventos recentes com classificação e payload bruto do VEVENT
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  {auditSummary && (
                    <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider text-brand-text-medium">
                      <span className="rounded-full bg-white/70 px-3 py-1">Reservas: {auditSummary.reservations}</span>
                      <span className="rounded-full bg-white/70 px-3 py-1">Bloqueios: {auditSummary.blocks}</span>
                      <span className="rounded-full bg-white/70 px-3 py-1">Desconhecidos: {auditSummary.unknown}</span>
                    </div>
                  )}
                  <div className="relative w-full md:w-80">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-text-medium" />
                    <Input
                      type="search"
                      value={auditSearch}
                      onChange={(event) => setAuditSearch(event.target.value)}
                      placeholder="Buscar por UID, summary ou VEVENT"
                      className="h-10 rounded-full border-neutral-200/80 bg-white/80 pl-10 pr-10 text-sm"
                    />
                    {auditSearch.trim().length > 0 && (
                      <button
                        type="button"
                        onClick={() => setAuditSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-text-medium transition-colors hover:text-brand-text-dark"
                        aria-label="Limpar busca"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(['all', 'inclusão', 'alteração', 'cancelamento', 'bloqueio', 'revisão'] as AuditActionFilter[]).map((action) => {
                      const labels: Record<AuditActionFilter, string> = {
                        all: 'Todas as ações',
                        inclusão: 'Inclusão',
                        alteração: 'Alteração',
                        cancelamento: 'Cancelamento',
                        bloqueio: 'Bloqueio',
                        revisão: 'Revisão',
                      }
                      const active = auditActionFilter === action
                      return (
                        <button
                          key={action}
                          type="button"
                          onClick={() => setAuditActionFilter(action)}
                          className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                            active
                              ? 'bg-brand-text-dark text-white'
                              : 'bg-white/70 text-brand-text-medium hover:bg-brand-text-dark/10 hover:text-brand-text-dark'
                          }`}
                        >
                          {labels[action]}
                        </button>
                      )
                    })}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(['all', 'reservation', 'block', 'unknown'] as AuditFilter[]).map((filter) => {
                      const labels: Record<AuditFilter, string> = {
                        all: 'Todos',
                        reservation: 'Reservas',
                        block: 'Bloqueios',
                        unknown: 'Desconhecidos',
                      }
                      const active = auditFilter === filter
                      return (
                        <button
                          key={filter}
                          type="button"
                          onClick={() => setAuditFilter(filter)}
                          className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                            active
                              ? 'bg-brand-blue text-white'
                              : 'bg-white/70 text-brand-text-medium hover:bg-brand-blue/10 hover:text-brand-blue'
                          }`}
                        >
                          {labels[filter]}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {auditWarning && (
                <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm font-semibold text-amber-800">
                  {auditWarning}
                </div>
              )}

              {auditLoading ? (
                <div className="space-y-3">
                  <div className="h-20 animate-pulse rounded-xl bg-neutral-200/40" />
                  <div className="h-20 animate-pulse rounded-xl bg-neutral-200/40" />
                  <div className="h-20 animate-pulse rounded-xl bg-neutral-200/40" />
                </div>
              ) : actionFilteredAuditEvents.length === 0 ? (
                <p className="text-sm text-brand-text-medium">
                  Ainda não há eventos auditados para mostrar neste filtro.
                </p>
              ) : (
                <div className="space-y-4">
                  {actionFilteredAuditEvents.map((event) => (
                    <div key={event.id} className="rounded-2xl border border-neutral-200/60 bg-white/80 p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-brand-text-dark">
                            {event.property_name || 'Propriedade não identificada'} · {event.platform_name || event.source_platform}
                          </p>
                          <p className="mt-1 text-xs text-brand-text-medium">
                            Status {event.status} · UID {event.ical_uid}
                          </p>
                        </div>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                            event.event_kind === 'reservation'
                              ? 'bg-emerald-500/10 text-emerald-700'
                              : event.event_kind === 'block'
                                ? 'bg-amber-500/10 text-amber-700'
                                : 'bg-slate-500/10 text-slate-700'
                          }`}
                        >
                          {event.event_kind}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
                        <div className="rounded-xl border border-neutral-200/60 bg-brand-bg/80 p-4">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-brand-text-medium">
                            1. O que veio do iCal
                          </p>
                          <p className="mt-2 text-sm font-semibold text-brand-text-dark">
                            {event.incoming_summary}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-text-medium">
                              {event.check_in} → {event.check_out}
                            </span>
                            <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-text-medium">
                              {event.reservation_id ? `reservation_id ${event.reservation_id}` : 'Sem reservation_id'}
                            </span>
                          </div>
                        </div>

                        <div className="rounded-xl border border-sky-500/10 bg-sky-500/5 p-4">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-sky-700">
                            2. Como o sistema classificou
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-sky-700">
                              {event.classification_label}
                            </span>
                            <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-text-medium">
                              Status: {event.status}
                            </span>
                          </div>
                          <p className="mt-3 text-xs text-brand-text-dark">
                            {event.classification_reason}
                          </p>
                        </div>

                        <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-4">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                            3. Ação esperada
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                              event.action_marker === 'inclusão'
                                ? 'bg-emerald-500/10 text-emerald-700'
                                : event.action_marker === 'alteração'
                                  ? 'bg-blue-500/10 text-blue-700'
                                  : event.action_marker === 'cancelamento'
                                    ? 'bg-red-500/10 text-red-700'
                                    : event.action_marker === 'bloqueio'
                                      ? 'bg-amber-500/10 text-amber-700'
                                      : 'bg-slate-500/10 text-slate-700'
                            }`}>
                              {event.action_marker}
                            </span>
                            <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-text-medium">
                              {event.action_marker_reason}
                            </span>
                          </div>
                          <p className="mt-2 text-sm font-semibold text-brand-text-dark">
                            {event.action_recommendation}
                          </p>
                          <p className="mt-3 text-xs font-semibold text-brand-blue">
                            {event.operational_hint}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 rounded-xl border border-neutral-200/60 bg-brand-bg/70 p-4">
                        <details>
                          <summary className="cursor-pointer text-xs font-bold uppercase tracking-wider text-brand-blue">
                            Ver VEVENT bruto
                          </summary>
                          <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed text-brand-text-dark">
                            {previewRawVEvent(event.raw_vevent)}
                          </pre>
                        </details>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </PremiumCard>
          </>
        }
        bookingPanel={
          <PremiumCard className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-700">
                <RefreshCw className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-brand-text-medium">
                  Modo sandbox / preparação
                </p>
                <h2 className="mt-1 text-xl font-bold text-brand-text-dark">
                  Booking API desativada até homologação
                </h2>
                <p className="mt-1 text-sm text-brand-text-medium">
                  A Booking native API está desenvolvida, mas permanece desativada até a Booking.com reabrir parcerias com desenvolvedores
                  e homologar o produto. Enquanto isso, este modo funciona apenas como preparação.
                </p>
                <p className="mt-2 text-sm font-semibold text-amber-700">
                  Enquanto isso, a operação continua via iCal e o botão de sincronização imediata segue ativo apenas para esse fluxo.
                </p>
                <p className="mt-2 text-xs text-brand-text-medium">
                  O painel já está pronto para validar credenciais, importar reservas históricas e receber updates via webhook em ambiente de teste,
                  mas os controles permanecem desativados até existir parceria oficial ativa.
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-dashed border-amber-500/25 bg-white/60 p-4">
              <p className="text-sm font-semibold text-brand-text-dark">Estado atual</p>
              <ul className="mt-3 space-y-2 text-sm text-brand-text-medium">
                <li>• Sync iCal: operação normal e disponível</li>
                <li>• Booking API: sandbox/preparação, desabilitada</li>
                <li>• Ativação futura: somente após parceria e homologação oficial</li>
              </ul>
            </div>
          </PremiumCard>
        }
      />

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
