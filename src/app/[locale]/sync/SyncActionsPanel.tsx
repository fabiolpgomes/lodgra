'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle2, ChevronRight, ExternalLink, Loader2, OctagonAlert, RefreshCw } from 'lucide-react'
import { PremiumCard } from '@/components/common/layout/PremiumPage'
import { Button } from '@/components/common/ui/button'
import type { SyncAction, SyncHealth } from '@/lib/sync-health/actions'
import { CompleteGuestDrawer, type CompleteGuestTarget } from './CompleteGuestDrawer'

type HealthResponse = SyncHealth & { checked_at: string }
type FullSyncStep = { ok?: boolean; error?: string }
type FullSyncResponse = {
  error?: string
  ical?: FullSyncStep & { created?: number; updated?: number }
  email?: FullSyncStep & { staged?: number; connected?: boolean }
  reconciliation?: FullSyncStep & { processed?: number; matched?: number }
}

const DISMISS_REASONS = ['É um bloqueio meu, não uma reserva', 'Já tratei na plataforma', 'Não é relevante']
const DISMISSIBLE = new Set(['ical_reservation_without_email', 'message_review', 'complete_guest', 'reservation_changed_on_platform'])

/** Plain-language summary of a manual full sync; partial failures name the failing source. */
export function describeFullSync(status: number, data: FullSyncResponse): string {
  if (status !== 200 && status !== 207) return data.error || 'Não foi possível sincronizar agora.'
  const ical = data.ical
  const email = data.email
  const reconciliation = data.reconciliation
  return [
    ical?.ok ? `Calendários lidos (${(ical.created ?? 0) + (ical.updated ?? 0)} reserva(s) nova(s) ou alterada(s))` : 'Um ou mais calendários falharam',
    email?.connected === false ? 'Gmail não ligado' : email?.ok ? `${email.staged ?? 0} e-mail(s) novo(s)` : 'Não foi possível ler o Gmail',
    reconciliation?.ok ? `${reconciliation.matched ?? 0} reserva(s) completada(s) com os dados do e-mail` : 'A ligação entre e-mails e calendários falhou',
  ].join(' · ') + '.'
}

const STATUS = {
  ok: { icon: CheckCircle2, tone: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-800', label: 'Tudo em dia' },
  attention: { icon: AlertCircle, tone: 'border-amber-500/30 bg-amber-500/5 text-amber-900', label: '' },
  stopped: { icon: OctagonAlert, tone: 'border-red-500/30 bg-red-500/5 text-red-800', label: 'Sincronização parada' },
} as const

export function SyncActionsPanel({ locale }: { locale: string }) {
  const router = useRouter()
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [completing, setCompleting] = useState<CompleteGuestTarget | null>(null)
  const [dismissing, setDismissing] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/sync/actions?locale=${encodeURIComponent(locale)}`, { cache: 'no-store' })
      if (!response.ok) throw new Error('unavailable')
      setHealth(await response.json())
      setLoadError(false)
    } catch {
      setLoadError(true)
    }
  }, [locale])

  useEffect(() => {
    void load()
    const timer = setInterval(() => { void load() }, 60_000)
    return () => clearInterval(timer)
  }, [load])

  async function syncNow() {
    setSyncing(true)
    setSyncMessage(null)
    try {
      const response = await fetch('/api/sync/full', { method: 'POST' })
      const data = await response.json().catch(() => ({}))
      setSyncMessage({ ok: response.status === 200 && data?.success === true, text: describeFullSync(response.status, data) })
    } catch {
      setSyncMessage({ ok: false, text: 'Não foi possível contactar o servidor. Tente novamente dentro de instantes.' })
    } finally {
      setSyncing(false)
      void load()
    }
  }

  function open(action: SyncAction) {
    if (action.completable && action.reservationId) {
      setCompleting({ reservationId: action.reservationId, title: action.title, href: action.href })
    } else if (action.kind === 'queue_stalled') {
      void syncNow()
    } else if (action.href && action.external) {
      window.open(action.href, '_blank', 'noopener,noreferrer')
    } else if (action.href) {
      router.push(action.href)
    }
  }

  async function dismiss(action: SyncAction, reason: string) {
    const response = await fetch('/api/sync/actions/dismiss', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: action.key, reason }),
    })
    setDismissing(null)
    if (response.ok) void load()
  }

  const status = loadError ? null : health ? STATUS[health.status] : null
  const StatusIcon = status?.icon ?? AlertCircle

  return (
    <PremiumCard>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {loadError ? (
          <p role="alert" className="flex items-center gap-2 font-semibold text-red-800">
            <AlertCircle className="h-5 w-5" /> Não foi possível verificar a sincronização. Nova tentativa em 1 minuto.
          </p>
        ) : !health ? (
          <p role="status" className="flex items-center gap-2 text-brand-text-medium"><Loader2 className="h-5 w-5 animate-spin" /> A verificar…</p>
        ) : (
          <div className={`flex flex-1 items-center gap-3 rounded-xl border px-4 py-3 ${status!.tone}`}>
            <StatusIcon className="h-6 w-6 shrink-0" />
            <div>
              <p className="text-lg font-bold" data-testid="sync-status">
                {health.status === 'attention' ? `${health.actions.length} ${health.actions.length === 1 ? 'ação pendente' : 'ações pendentes'}` : status!.label}
              </p>
              {health.trust.percent !== null && (
                <p className="text-sm">
                  {health.trust.percent}% das reservas das plataformas chegaram completas nos últimos {health.trust.windowDays} dias ({health.trust.complete} de {health.trust.total}).
                </p>
              )}
            </div>
          </div>
        )}
        <Button onClick={syncNow} disabled={syncing} className="inline-flex items-center gap-2 self-start md:self-auto" aria-label="Sincronizar calendários, e-mails e reservas agora">
          {syncing ? <><Loader2 className="h-4 w-4 animate-spin" /> A sincronizar…</> : <><RefreshCw className="h-4 w-4" /> Sincronizar agora</>}
        </Button>
      </div>

      {syncMessage && (
        <p role="status" className={`mt-3 text-sm ${syncMessage.ok ? 'text-emerald-800' : 'text-brand-text-medium'}`}>
          Última sincronização: {syncMessage.text}
        </p>
      )}

      {health && health.actions.length > 0 && (
        <ul className="mt-5 divide-y divide-neutral-200/70 rounded-xl border border-neutral-200/70 bg-white/60" aria-label="Ações pendentes">
          {health.actions.map(action => (
            <li key={action.key}>
              <div className="flex items-stretch">
                <button type="button" onClick={() => open(action)} className="flex flex-1 items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-brand-blue/5">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${action.severity === 'stopped' ? 'bg-red-500' : 'bg-amber-500'}`} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-brand-text-dark">{action.title}</span>
                    <span className="block text-sm text-brand-text-medium">{action.detail}</span>
                  </span>
                  <span className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-brand-blue sm:inline-flex">
                    {action.cta} {action.external ? <ExternalLink className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </span>
                </button>
                {DISMISSIBLE.has(action.kind) && (
                  <button type="button" onClick={() => setDismissing(dismissing === action.key ? null : action.key)}
                    className="shrink-0 px-3 text-xs font-semibold text-brand-text-medium hover:text-brand-text-dark" aria-expanded={dismissing === action.key}>
                    Ignorar
                  </button>
                )}
              </div>
              {dismissing === action.key && (
                <div className="flex flex-wrap items-center gap-2 bg-neutral-50 px-4 pb-3 pt-1" role="group" aria-label="Motivo para ignorar">
                  <span className="text-xs text-brand-text-medium">Porquê?</span>
                  {DISMISS_REASONS.map(reason => (
                    <button key={reason} type="button" onClick={() => void dismiss(action, reason)}
                      className="rounded-full border border-neutral-300 px-3 py-1 text-xs hover:border-brand-blue hover:text-brand-blue">
                      {reason}
                    </button>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <CompleteGuestDrawer target={completing} onClose={() => setCompleting(null)} onSaved={() => { setCompleting(null); void load() }} />
    </PremiumCard>
  )
}
