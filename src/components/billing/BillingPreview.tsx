'use client'

import React from 'react'
import { useBillingPreview } from '@/hooks/useBillingPreview'
import { PLAN_LIMITS, PLAN_DISPLAY } from '@/lib/billing/plans'

interface BillingPreviewProps {
  orgId: string
  onAddExtraProperty?: () => void
  onManagePlan?: () => void
}

export function BillingPreview({ orgId, onAddExtraProperty, onManagePlan }: BillingPreviewProps) {
  const { subscription, propertyCount, loading, error } = useBillingPreview(orgId)

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-32 bg-gray-200 rounded" />
          <div className="h-20 bg-gray-100 rounded" />
        </div>
      </div>
    )
  }

  if (error || !subscription) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
        <p className="text-sm text-yellow-800">{error || 'Unable to load billing information'}</p>
      </div>
    )
  }

  const plan = subscription.plan as 'essencial' | 'expansao' | 'premium' | string
  const planLimits = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS]
  const planDisplay = PLAN_DISPLAY.find((p) => p.id === plan)

  if (!planLimits || !planDisplay) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
        <p className="text-sm text-yellow-800">Unknown plan: {plan}</p>
      </div>
    )
  }

  // Calculate extra properties
  const maxIncluded = planLimits.maxProperties || 0
  const extraCount = Math.max(0, propertyCount - maxIncluded)
  const extraPrice = planLimits.extraPropertyPrice || 0

  // Calculate totals
  const basePriceMonthly = planDisplay.price
  const extraCost = extraCount * extraPrice
  const totalMonthly = basePriceMonthly + extraCost

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      {/* Header */}
      <h3 className="text-lg font-semibold text-gray-900">Seu Plano</h3>

      {/* Plan Summary */}
      <div className="mt-4 space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-600">Plano:</span>
          <span className="font-semibold text-gray-900">{planDisplay.name}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">Propriedades incluídas:</span>
          <span className="font-semibold text-gray-900">{maxIncluded}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">Propriedades atual:</span>
          <span className={`font-semibold ${propertyCount > maxIncluded ? 'text-orange-600' : 'text-gray-900'}`}>
            {propertyCount}
          </span>
        </div>

        {/* Extra Properties Section */}
        {extraCount > 0 && (
          <>
            <div className="border-t border-gray-200 my-3 pt-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Propriedades extras:</span>
                <span className="text-gray-900">
                  {extraCount} × R${extraPrice} = <span className="font-semibold">R${extraCost}</span>
                </span>
              </div>
            </div>
          </>
        )}

        {/* Total */}
        <div className="border-t border-gray-200 my-3 pt-3 space-y-1">
          <div className="flex justify-between text-lg">
            <span className="font-semibold text-gray-900">Valor esperado/mês:</span>
            <span className="font-bold text-green-600">R${totalMonthly}</span>
          </div>
          <p className="text-xs text-gray-500">
            Será cobrado no próximo ciclo (incluindo créditos/taxas de ajuste)
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex gap-3">
        {extraCount < 10 && maxIncluded < 10 && (
          <button
            onClick={onAddExtraProperty}
            className="flex-1 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600"
          >
            + Adicionar Propriedade Extra
          </button>
        )}

        <button
          onClick={onManagePlan}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          Gerenciar Plano
        </button>
      </div>

      {/* Upgrade Suggestion */}
      {extraCount > 0 && plan === 'essencial' && (
        <div className="mt-4 rounded-lg bg-blue-50 p-3 border border-blue-200">
          <p className="text-xs text-blue-800">
            💡 <strong>Dica:</strong> Plano Expansão inclui 3 propriedades. Considerando fazer upgrade?
          </p>
        </div>
      )}

      {extraCount > 2 && (plan === 'essencial' || plan === 'expansao') && (
        <div className="mt-4 rounded-lg bg-green-50 p-3 border border-green-200">
          <p className="text-xs text-green-800">
            🚀 <strong>Dica:</strong> Plano Premium inclui 10 propriedades + API. Poderia ser mais econômico!
          </p>
        </div>
      )}
    </div>
  )
}
