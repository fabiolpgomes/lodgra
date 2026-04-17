'use client'

import { useState } from 'react'
import { CreditCard, ArrowRight } from 'lucide-react'
import { PLAN_DISPLAY } from '@/lib/billing/plans'
import { PlanUpgradeModal } from './PlanUpgradeModal'
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

  if (!isAdmin) return null

  const planName = PLAN_DISPLAY.find(p => p.id === currentPlan)?.name || 'Starter'

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
          {currentPlan !== 'business' && (
            <button
              onClick={() => setUpgradeModalOpen(true)}
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium mt-3"
            >
              Atualizar Plano <ArrowRight className="h-4 w-4" />
            </button>
          )}
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
