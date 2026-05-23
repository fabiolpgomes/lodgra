'use client'

import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'

interface UpgradeModalProps {
  isOpen: boolean
  feature?: string // e.g., 'cleaner_portal'
  reason?: 'feature_blocked' | 'property_limit' // Why modal opened
  currentPlan: 'essencial' | 'expansao' | 'premium'
  onClose: () => void
  onAddExtra?: () => void
  onUpgrade?: (targetPlan: string) => void
}

const PLAN_PRICES: Record<string, { name: string; price: number }> = {
  essencial: { name: 'Essencial', price: 59 },
  expansao: { name: 'Expansão', price: 149 },
  premium: { name: 'Premium', price: 397 },
}

export function UpgradeModal({
  isOpen,
  feature,
  reason = 'feature_blocked',
  currentPlan,
  onClose,
  onAddExtra,
  onUpgrade,
}: UpgradeModalProps) {
  const [dismissed, setDismissed] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true)
    }
  }, [isOpen])

  const handleClose = () => {
    setIsAnimating(false)
    setTimeout(() => {
      setDismissed(true)
      onClose()
    }, 300)
  }

  if (!isOpen || dismissed) return null

  // Determine target upgrade plan based on current plan
  const getTargetPlan = (): 'expansao' | 'premium' => {
    if (currentPlan === 'premium') return 'premium'
    if (currentPlan === 'essencial') return 'expansao'
    return 'premium'
  }

  const targetPlan = getTargetPlan()
  const targetPlanInfo = PLAN_PRICES[targetPlan]

  // Format feature name for display
  const featureName = feature
    ? feature
        .replace(/_/g, ' ')
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    : 'Esta funcionalidade'

  // Determine modal title and message based on reason
  const getModalTitle = () => {
    if (reason === 'property_limit') {
      return 'Limite de Propriedades Atingido'
    }
    return `Desbloquear ${featureName}`
  }

  const getModalMessage = () => {
    if (reason === 'property_limit') {
      return 'Você atingiu o limite de propriedades do seu plano. Adicione uma unidade extra ou faça upgrade.'
    }
    return `${featureName} está disponível em planos superiores. Escolha a melhor opção:`
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${
        isAnimating ? 'bg-black/50' : 'bg-black/0'
      }`}
    >
      <div
        className={`w-full max-w-md transform rounded-lg bg-white p-6 shadow-2xl transition-all duration-300 ${
          isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">{getModalTitle()}</h2>
            <p className="mt-1 text-sm text-gray-600">{getModalMessage()}</p>
          </div>
          <button
            onClick={handleClose}
            className="ml-2 rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            aria-label="Fechar modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Options Container */}
        <div className="space-y-3">
          {/* Option 1: Add Extra Property (always available except Premium) */}
          {currentPlan !== 'premium' && (
            <button
              onClick={() => {
                onAddExtra?.()
                handleClose()
              }}
              className="w-full transform rounded-lg border-2 border-blue-500 bg-blue-50 p-4 text-left transition-all hover:border-blue-600 hover:bg-blue-100 active:scale-95"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-blue-900">
                    + Adicionar Unidade Extra
                  </h3>
                  <p className="mt-1 text-sm text-blue-700">
                    R$49/mês por unidade • Sem compromisso de plano
                  </p>
                </div>
                <div className="ml-2 flex-shrink-0">
                  <div className="rounded bg-blue-200 px-2 py-1 text-xs font-semibold text-blue-900">
                    R$49
                  </div>
                </div>
              </div>
            </button>
          )}

          {/* Option 2: Upgrade Plan */}
          <button
            onClick={() => {
              onUpgrade?.(targetPlan)
              handleClose()
            }}
            className="w-full transform rounded-lg border-2 border-green-500 bg-green-50 p-4 text-left transition-all hover:border-green-600 hover:bg-green-100 active:scale-95"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-green-900">
                  Fazer Upgrade para {targetPlanInfo.name}
                </h3>
                <p className="mt-1 text-sm text-green-700">
                  Acesso completo • Mais funcionalidades
                </p>
              </div>
              <div className="ml-2 flex-shrink-0">
                <div className="rounded bg-green-200 px-2 py-1 text-xs font-semibold text-green-900">
                  R${targetPlanInfo.price}
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Divider */}
        <div className="my-4 border-t border-gray-200" />

        {/* Footer: Dismiss Button */}
        <button
          onClick={handleClose}
          className="w-full rounded-lg py-2 text-center text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
        >
          Talvez depois
        </button>

        {/* Info text */}
        <p className="mt-3 text-center text-xs text-gray-500">
          Você pode acessar planos e preços a qualquer momento em Configurações
        </p>
      </div>
    </div>
  )
}
