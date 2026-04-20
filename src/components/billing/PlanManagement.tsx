'use client'

import { useState } from 'react'
import { CheckCircle2, ArrowUpCircle, ExternalLink, Loader2 } from 'lucide-react'
import { Plan, PLAN_DISPLAY, PLAN_LIMITS } from '@/lib/billing/plans'

interface PlanManagementProps {
  currentPlan: Plan
  subscriptionStatus: string
}

const PLAN_LABELS: Record<Plan, string> = {
  starter: 'Starter',
  professional: 'Professional',
  business: 'Business',
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active:    { label: 'Activa',       color: 'bg-green-100 text-green-800' },
  trial:     { label: 'Trial',        color: 'bg-blue-100 text-blue-800' },
  past_due:  { label: 'Pagamento em atraso', color: 'bg-red-100 text-red-800' },
  cancelled: { label: 'Cancelada',    color: 'bg-gray-100 text-gray-800' },
}

export function PlanManagement({ currentPlan, subscriptionStatus }: PlanManagementProps) {
  const [upgrading, setUpgrading] = useState<Plan | null>(null)
  const [openingPortal, setOpeningPortal] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const limits = PLAN_LIMITS[currentPlan]
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
      setSuccess(`Plano alterado para ${PLAN_LABELS[plan]} com sucesso!`)
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

  const planOrder: Plan[] = ['starter', 'professional', 'business']
  const currentIndex = planOrder.indexOf(currentPlan)

  return (
    <div className="space-y-4">
      {/* Current plan summary */}
      <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div>
          <p className="text-xs text-blue-700 font-medium uppercase tracking-wide">Plano actual</p>
          <p className="text-lg font-bold text-blue-900">{PLAN_LABELS[currentPlan]}</p>
          <p className="text-xs text-blue-700 mt-0.5">
            {limits.maxProperties ? `Até ${limits.maxProperties} propriedades` : 'Propriedades ilimitadas'}
          </p>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
          {statusInfo.label}
        </span>
      </div>

      {/* Feedback */}
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      {success && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{success}</p>}

      {/* Plan options */}
      <div className="space-y-2">
        {PLAN_DISPLAY.map((plan, idx) => {
          const planKey = plan.id as Plan
          const isCurrent = planKey === currentPlan
          const isUpgrade = idx > currentIndex
          const isDowngrade = idx < currentIndex
          const isLoading = upgrading === planKey

          return (
            <div
              key={plan.id}
              className={`flex items-center justify-between p-4 rounded-lg border ${
                isCurrent
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-neutral-200 bg-white'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-neutral-900 text-sm">{plan.name}</p>
                  {isCurrent && <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                </div>
                <p className="text-xs text-neutral-500">{plan.properties}</p>
              </div>

              <div className="flex items-center gap-3 ml-4">
                <p className="text-sm font-bold text-neutral-900">€{plan.price}<span className="text-xs font-normal text-neutral-500">/mês</span></p>
                {!isCurrent && (
                  <button
                    onClick={() => handleUpgrade(planKey)}
                    disabled={!!upgrading || !!success}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isUpgrade
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ArrowUpCircle className={`w-3.5 h-3.5 ${isDowngrade ? 'rotate-180' : ''}`} />
                    )}
                    {isUpgrade ? 'Upgrade' : 'Downgrade'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Billing portal */}
      <button
        onClick={handlePortal}
        disabled={openingPortal}
        className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 transition-colors disabled:opacity-50"
      >
        {openingPortal ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
        Gerir faturação, faturas e cancelamento
      </button>
    </div>
  )
}
