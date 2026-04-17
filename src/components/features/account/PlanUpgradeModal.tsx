'use client'

import { useState } from 'react'
import { Button } from '@/components/common/ui/button'
import { Alert, AlertDescription } from '@/components/common/ui/alert'
import { PLAN_DISPLAY, getPlanLimits } from '@/lib/billing/plans'
import { toast } from 'sonner'
import { Check, AlertCircle } from 'lucide-react'

interface PlanUpgradeModalProps {
  currentPlan: string | null
  isOpen: boolean
  onClose: () => void
}

export function PlanUpgradeModal({ currentPlan, isOpen, onClose }: PlanUpgradeModalProps) {
  const [loading, setLoading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)

  if (!isOpen) return null

  const currentPlanObj = PLAN_DISPLAY.find(p => p.id === currentPlan)
  const plans = PLAN_DISPLAY.filter(p => p.id !== currentPlan)

  async function handleUpgrade() {
    if (!selectedPlan) return

    setLoading(true)
    try {
      const res = await fetch('/api/organization/upgrade-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Erro ao atualizar plano')
        return
      }

      toast.success('Plano atualizado com sucesso!')
      onClose()
      window.location.reload()
    } catch (err) {
      toast.error('Erro ao atualizar plano')
      console.error('Upgrade error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Atualizar Plano</h2>
          <p className="text-gray-600 mt-1">
            Seu plano atual: <strong>{currentPlanObj?.name}</strong>
          </p>
        </div>

        <div className="p-6 space-y-4">
          {plans.map(plan => {
            const limits = getPlanLimits(plan.id)
            const isUpgrade = PLAN_DISPLAY.findIndex(p => p.id === plan.id) >
                            PLAN_DISPLAY.findIndex(p => p.id === currentPlan)

            return (
              <div
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                  selectedPlan === plan.id
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{plan.name}</h3>
                    <p className="text-sm text-gray-600">{plan.description}</p>
                    <p className="text-sm font-semibold text-gray-900 mt-2">
                      €{plan.price}/mês
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        isUpgrade ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                      }`}>
                        {isUpgrade ? 'Atualizar' : 'Desatualizar'}
                      </span>
                    </div>
                  </div>
                </div>

                <ul className="space-y-1 mt-3 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    {limits.maxProperties === null ? 'Propriedades ilimitadas' : `Até ${limits.maxProperties} propriedades`}
                  </li>
                  {limits.ownerReports && (
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      Relatórios por proprietário
                    </li>
                  )}
                  {limits.fiscalCompliance && (
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      Compliance fiscal
                    </li>
                  )}
                </ul>
              </div>
            )
          })}

          {selectedPlan && (
            <Alert className="border-blue-200 bg-blue-50">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                {PLAN_DISPLAY.findIndex(p => p.id === selectedPlan) > PLAN_DISPLAY.findIndex(p => p.id === currentPlan)
                  ? 'Você será cobrado pro-rata pela diferença no seu próximo ciclo de faturação.'
                  : 'Você receberá crédito pro-rata no seu próximo ciclo de faturação.'}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="p-6 border-t flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleUpgrade}
            disabled={!selectedPlan || loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? 'Atualizando...' : 'Atualizar Plano'}
          </Button>
        </div>
      </div>
    </div>
  )
}
