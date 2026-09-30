'use client'

import { useCallback, useEffect, useState } from 'react'
import { loadConnectAndInitialize, type StripeConnectInstance } from '@stripe/connect-js'
import {
  ConnectAccountManagement,
  ConnectAccountOnboarding,
  ConnectComponentsProvider,
  ConnectNotificationBanner,
  ConnectPayments,
  ConnectPayouts,
} from '@stripe/react-connect-js'
import { CheckCircle2, Clock, AlertTriangle, Loader2 } from 'lucide-react'

type Status = 'none' | 'pending' | 'active' | 'restricted'
interface State {
  status: Status
  hasAccount: boolean
  detailsSubmitted: boolean
  countries: { code: string; label: string }[]
}

type Stage = Status | 'review'
const STATUS_UI: Record<Stage, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  none: { label: 'Não configurado', className: 'bg-gray-100 text-gray-800', icon: Clock },
  pending: { label: 'Cadastro por concluir', className: 'bg-amber-100 text-amber-900', icon: Clock },
  review: { label: 'Cadastro concluído — em análise pelo Stripe', className: 'bg-sky-100 text-sky-900', icon: Clock },
  active: { label: 'Cadastro concluído — a receber pagamentos', className: 'bg-emerald-100 text-emerald-900', icon: CheckCircle2 },
  restricted: { label: 'Ação necessária no Stripe', className: 'bg-red-100 text-red-900', icon: AlertTriangle },
}

type Tab = 'payments' | 'payouts' | 'account'

export function OnlinePayments() {
  const [state, setState] = useState<State | null>(null)
  const [country, setCountry] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [connect, setConnect] = useState<StripeConnectInstance | null>(null)
  const [tab, setTab] = useState<Tab>('payments')

  const loadStatus = useCallback(async () => {
    const res = await fetch('/api/stripe/connect')
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Erro ao carregar')
    setState(data)
    if (!country && data.countries?.length) setCountry(data.countries[0].code)
    return data as State
  }, [country])

  const initComponents = useCallback(async () => {
    const first = await fetch('/api/stripe/connect/session', { method: 'POST' })
    const firstData = await first.json()
    if (!first.ok) throw new Error(firstData.error || 'Erro ao abrir o Stripe')
    let pendingSecret: string | null = firstData.clientSecret
    const instance = loadConnectAndInitialize({
      publishableKey: firstData.publishableKey,
      // O Stripe volta a pedir um segredo quando a sessão expira
      fetchClientSecret: async () => {
        if (pendingSecret) {
          const secret = pendingSecret
          pendingSecret = null
          return secret
        }
        const res = await fetch('/api/stripe/connect/session', { method: 'POST' })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Erro ao renovar a sessão')
        return data.clientSecret
      },
      locale: document.documentElement.lang || 'pt-BR',
      appearance: { variables: { colorPrimary: '#10203E', fontFamily: 'inherit' } },
    })
    setConnect(instance)
  }, [])

  useEffect(() => {
    loadStatus()
      .then(s => (s.hasAccount ? initComponents() : undefined))
      .catch(e => setError(e instanceof Error ? e.message : 'Erro ao carregar'))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCreate() {
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/stripe/connect/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao criar a conta')
      await loadStatus()
      await initComponents()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao criar a conta')
    } finally {
      setBusy(false)
    }
  }

  if (!state && !error) {
    return <div className="flex items-center gap-2 text-sm text-gray-600"><Loader2 className="h-4 w-4 animate-spin" /> A carregar…</div>
  }

  const status = state?.status ?? 'none'
  const stage: Stage = status === 'pending' && state?.detailsSubmitted ? 'review' : status
  const ui = STATUS_UI[stage]
  const Icon = ui.icon

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${ui.className}`}>
          <Icon className="h-4 w-4" /> {ui.label}
        </span>
        {status === 'active' && (
          <p className="text-sm text-gray-600">A página de reservas diretas aceita pagamento com cartão.</p>
        )}
        {stage === 'review' && (
          <p className="text-sm text-gray-600">Normalmente leva poucos minutos. Os pagamentos online ficam ativos assim que o Stripe aprovar.</p>
        )}
        {status === 'restricted' && (
          <p className="text-sm text-gray-600">O Stripe precisa de mais dados ou de uma correção. Veja o aviso abaixo.</p>
        )}
      </div>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {state && !state.hasAccount && (
        <div className="space-y-4">
          <div className="space-y-2 text-sm text-gray-700">
            <p>Para os hóspedes pagarem as reservas diretas online, crie a sua conta de recebimentos no Stripe.</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>O dinheiro vai diretamente para a sua conta bancária.</li>
              <li>O Stripe verifica a sua identidade e os dados bancários — demora poucos minutos.</li>
              <li>As taxas de processamento do Stripe são descontadas de cada pagamento.</li>
            </ul>
          </div>
          {state.countries.length === 0 ? (
            <p className="text-sm text-amber-800">Pagamentos online ainda não estão disponíveis. Contacte o suporte.</p>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-gray-900">País do seu negócio</span>
                <select
                  value={country}
                  onChange={e => setCountry(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2"
                >
                  {state.countries.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                </select>
              </label>
              <button
                type="button"
                onClick={handleCreate}
                disabled={busy || !country}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Configurar recebimentos
              </button>
            </div>
          )}
        </div>
      )}

      {connect && (
        <ConnectComponentsProvider connectInstance={connect}>
          <ConnectNotificationBanner />
          {status !== 'active' ? (
            <ConnectAccountOnboarding onExit={() => { loadStatus().catch(() => undefined) }} />
          ) : (
            <div className="space-y-4">
              <div className="flex gap-2 border-b border-gray-200">
                {([['payments', 'Pagamentos'], ['payouts', 'Repasses'], ['account', 'Conta']] as [Tab, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTab(key)}
                    className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
                      tab === key ? 'border-brand-blue text-brand-blue' : 'border-transparent text-gray-600'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {tab === 'payments' && <ConnectPayments />}
              {tab === 'payouts' && <ConnectPayouts />}
              {tab === 'account' && <ConnectAccountManagement />}
            </div>
          )}
        </ConnectComponentsProvider>
      )}
    </div>
  )
}
