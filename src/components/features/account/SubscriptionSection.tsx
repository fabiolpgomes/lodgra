'use client'

import { useState } from 'react'
import { CreditCard, ArrowRight, Trash2 } from 'lucide-react'
import { PLAN_DISPLAY } from '@/lib/billing/plans'
import { PlanUpgradeModal } from './PlanUpgradeModal'
import { toast } from 'sonner'
import Link from 'next/link'

interface SubscriptionSectionProps {
  currentPlan: string | null
  subscriptionStatus: string | null
  isAdmin: boolean
}

export function SubscriptionSection({
  currentPlan,
  subscriptionStatus,
  isAdmin,
}: SubscriptionSectionProps) {
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)

  if (!isAdmin) return null

  const planName = PLAN_DISPLAY.find(p => p.id === currentPlan)?.name || 'Starter'
  const isActive = subscriptionStatus === 'active'

  const statusColor = {
    active: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    past_due: 'bg-yellow-100 text-yellow-800',
    trial: 'bg-blue-100 text-blue-800',
  }[subscriptionStatus as string] || 'bg-gray-100 text-gray-800'

  const statusLabel = {
    active: 'Ativo',
    cancelled: 'Cancelado',
    past_due: 'Pendente',
    trial: 'Trial',
  }[subscriptionStatus as string] || 'Desconhecido'

  async function handleCancelSubscription() {
    if (!confirm('Tem a certeza de que pretende cancelar a subscrição? Esta ação é irreversível.')) {
      return
    }

    setCancelLoading(true)
    try {
      const res = await fetch('/api/organization/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Erro ao cancelar subscrição')
        return
      }

      toast.success('Subscrição cancelada com sucesso')
      window.location.reload()
    } catch (err) {
      toast.error('Erro ao cancelar subscrição')
      console.error('Cancel error:', err)
    } finally {
      setCancelLoading(false)
    }
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="h-4 w-4 text-blue-600" />
          <h2 className="text-sm font-semibold text-gray-900">Plano de Subscrição</h2>
        </div>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-500">Plano Atual</p>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900">{planName}</p>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                {statusLabel}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4 pt-3 border-t">
            {currentPlan !== 'business' && isActive && (
              <button
                onClick={() => setUpgradeModalOpen(true)}
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Atualizar Plano <ArrowRight className="h-4 w-4" />
              </button>
            )}
            {isActive && (
              <button
                onClick={handleCancelSubscription}
                disabled={cancelLoading}
                className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700 font-medium ml-auto"
              >
                <Trash2 className="h-4 w-4" />
                {cancelLoading ? 'Cancelando...' : 'Cancelar'}
              </button>
            )}
          </div>
        </div>
      </div>

      <PlanUpgradeModal
        currentPlan={currentPlan}
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
      />
    </>
  )
}
