'use client'

import { useState } from 'react'
import { CheckCircle2, ArrowUpCircle, ExternalLink, Loader2 } from 'lucide-react'
import {
  type BillingCurrency,
  type Plan,
  PLAN_DISPLAY,
  PLAN_LIMITS,
  PLAN_PRICES,
  formatPlanPrice,
  includedPropertiesLabel,
  isPaidPlan,
} from '@/lib/billing/plans'

interface PlanManagementProps {
  currentPlan: Plan
  subscriptionStatus: string
  currency: BillingCurrency
  activeProperties: number
  extraProperties: number
  /** Tem assinatura no Stripe. Sem ela (plano atribuído pela equipa Lodgra) não há troca de plano nem portal. */
  hasSubscription?: boolean
}

const PLAN_LABELS: Record<Plan, string> = {
  essencial:    'Essencial',
  expansao:     'Expansão',
  premium:      'Premium',
  enterprise:   'Enterprise',
  development:  'Desenvolvimento (Laboratório)',
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active:    { label: 'Activa',       color: 'bg-emerald-100 text-emerald-800' },
  trial:     { label: 'Teste',        color: 'bg-brand-100 text-brand-800' },
  past_due:  { label: 'Pagamento em atraso', color: 'bg-red-100 text-red-800' },
  cancelled: { label: 'Cancelada',    color: 'bg-gray-100 text-gray-800' },
}

export function PlanManagement({ currentPlan, subscriptionStatus, currency, activeProperties, extraProperties, hasSubscription = true }: PlanManagementProps) {
  const [upgrading, setUpgrading] = useState<Plan | null>(null)
  const [openingPortal, setOpeningPortal] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const included = PLAN_LIMITS[currentPlan].maxProperties
  const currentPrice = isPaidPlan(currentPlan) ? PLAN_PRICES[currentPlan][currency] : null
  const statusInfo = STATUS_LABELS[subscriptionStatus] ?? { label: subscriptionStatus, color: 'bg-gray-100 text-gray-800' }

  async function handleUpgrade(plan: Plan) {
    setUpgrading(plan)
    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/organization/upgrade-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSuccess(data.warning ?? `Plano alterado para ${PLAN_LABELS[plan]} com sucesso!`)
      setTimeout(() => window.location.reload(), 1500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao alterar plano')
    } finally {
      setUpgrading(null)
    }
  }

  async function handlePortal() {
    setOpeningPortal(true)
    setError('')
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      window.location.href = data.url
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao abrir portal')
      setOpeningPortal(false)
    }
  }

  const currentDisplayIndex = PLAN_DISPLAY.findIndex(p => p.id === currentPlan)

  return (
    <div className="space-y-4">
      {/* Current plan summary */}
      <div className="flex items-center justify-between p-4 bg-brand-50 border border-brand-200 rounded-lg">
        <div>
          <p className="text-xs text-brand-700 font-medium uppercase tracking-wide">Plano atual</p>
          <p className="text-lg font-bold text-brand-900">{PLAN_LABELS[currentPlan]}</p>
          <p className="text-xs text-brand-700 mt-0.5">
            {activeProperties} {activeProperties === 1 ? 'propriedade' : 'propriedades'} · {included} incluídas no plano
            {extraProperties > 0 && currentPrice && (
              <> · {extraProperties} {extraProperties === 1 ? 'adicional' : 'adicionais'} a {formatPlanPrice(currentPrice.extraProperty, currency)}/mês</>
            )}
          </p>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
          {statusInfo.label}
        </span>
      </div>

      {!hasSubscription && (
        <p className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
          Este plano foi atribuído pela equipa Lodgra e não tem cobrança no Stripe. Para alterar, contacte o suporte.
        </p>
      )}

      {/* Feedback */}
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      {success && <p className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">{success}</p>}

      {/* Plan options */}
      <div className="space-y-2">
        {PLAN_DISPLAY.map((plan, idx) => {
          const planKey = plan.id
          const price = PLAN_PRICES[planKey][currency]
          const isCurrent = planKey === currentPlan
          const isUpgrade = currentDisplayIndex === -1 || idx > currentDisplayIndex
          const isDowngrade = !isUpgrade
          const isLoading = upgrading === planKey
          const extrasAfter = Math.max(0, activeProperties - (PLAN_LIMITS[planKey].maxProperties ?? 0))

          return (
            <div
              key={plan.id}
              className={`flex items-center justify-between p-4 rounded-lg border ${
                isCurrent
                  ? 'border-brand-300 bg-brand-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900 text-sm">{plan.name}</p>
                  {isCurrent && <CheckCircle2 className="w-4 h-4 text-brand-600 flex-shrink-0" />}
                </div>
                <p className="text-xs text-gray-500">
                  {includedPropertiesLabel(planKey)} · adicional {formatPlanPrice(price.extraProperty, currency)}/mês
                </p>
                {!isCurrent && extrasAfter > 0 && (
                  <p className="text-xs text-amber-700 mt-0.5">
                    Com as suas {activeProperties} propriedades: + {extrasAfter} {extrasAfter === 1 ? 'adicional' : 'adicionais'} ({formatPlanPrice(extrasAfter * price.extraProperty, currency)}/mês)
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-end gap-3 ml-4 flex-shrink-0">
                <p className="text-sm font-bold text-gray-900 whitespace-nowrap">
                  {formatPlanPrice(price.monthly, currency)}
                  <span className="text-xs font-normal text-gray-500">/mês</span>
                </p>
                {!isCurrent && hasSubscription && (
                  <button
                    onClick={() => handleUpgrade(planKey)}
                    disabled={!!upgrading || !!success}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                      isUpgrade
                        ? 'bg-brand-600 hover:bg-brand-700 text-white'
                        : 'bg-gray-100 hover:bg-neutral-200 text-gray-700'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ArrowUpCircle className={`w-3.5 h-3.5 ${isDowngrade ? 'rotate-180' : ''}`} />
                    )}
                    {isUpgrade ? 'Fazer upgrade' : 'Fazer downgrade'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Billing portal */}
      {hasSubscription && (
      <button
        onClick={handlePortal}
        disabled={openingPortal}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-neutral-900 transition-colors disabled:opacity-50"
      >
        {openingPortal ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
        Gerir faturação, faturas e cancelamento
      </button>
      )}
    </div>
  )
}
