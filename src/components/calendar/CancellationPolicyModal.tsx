'use client'

import React, { useState } from 'react'
import { Card } from '@/components/common/ui/card'
import { Button } from '@/components/common/ui/button'
import { toast } from 'sonner'
import { CancellationPolicyType, PropertyCancellationPolicy } from '@/types/cancellation.types'

interface CancellationPolicyModalProps {
  isOpen: boolean
  selectedDates: Date[]
  propertyId: string
  policies: PropertyCancellationPolicy[]
  onClose: () => void
  onApply: (policyId: string) => Promise<void>
}

export function CancellationPolicyModal({
  isOpen,
  selectedDates,
  propertyId,
  policies,
  onClose,
  onApply,
}: CancellationPolicyModalProps) {
  const [selectedPolicy, setSelectedPolicy] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleApply = async () => {
    if (!selectedPolicy) {
      toast.error('Selecione uma política de cancelamento')
      return
    }

    setLoading(true)
    try {
      await onApply(selectedPolicy)
      toast.success('Política aplicada com sucesso')
      setSelectedPolicy(null)
      onClose()
    } catch (error) {
      console.error('Error applying policy:', error)
      toast.error('Erro ao aplicar política')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const policyLabels: Record<CancellationPolicyType, string> = {
    flexible: 'Flexível',
    moderate: 'Moderada',
    limited: 'Limitada',
    firm: 'Firme',
    rigid: 'Rígida de longa duração',
  }

  const getPolicyLabel = (policy: PropertyCancellationPolicy) => {
    if (policy.policy_type === 'rigid' && !policy.is_long_stay) return 'Opção não reembolsável'
    return policyLabels[policy.policy_type]
  }

  const getPolicyDetails = (policy: PropertyCancellationPolicy) => {
    const details: string[] = [`Reembolso integral até ${policy.full_refund_days} dia(s) antes do check-in`]
    if (policy.partial_refund_days !== null && policy.partial_refund_percent !== null) {
      details.push(`${policy.partial_refund_percent}% de reembolso até ${policy.partial_refund_days} dia(s) antes`)
    } else if (policy.policy_type === 'flexible') {
      details.push('Reembolso parcial de 50% no prazo de 1 dia após o check-in')
    }
    if (policy.policy_type === 'rigid' && !policy.is_long_stay) {
      details.push(`Desconto de ${policy.non_refundable_discount_percent}% na tarifa não reembolsável`)
    }
    return details
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center sm:p-4">
      <Card className="w-full max-w-2xl rounded-t-2xl p-5 sm:mx-4 sm:rounded-2xl sm:p-6">
        <h2 className="mb-4 text-xl font-bold sm:text-2xl" style={{ color: '#1B2430' }}>
          Política de Cancelamento
        </h2>

        <p className="mb-4 text-sm text-gray-600">
          Selecionadas {selectedDates.length} data(s) • {new Date(selectedDates[0]).toLocaleDateString('pt-BR')} até{' '}
          {new Date(selectedDates[selectedDates.length - 1]).toLocaleDateString('pt-BR')}
        </p>

        <div className="mb-6 max-h-96 space-y-3 overflow-y-auto">
          {policies.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhuma política disponível</p>
          ) : (
            policies.map((policy) => (
              <label
                key={policy.id}
                className="flex items-start gap-3 rounded border p-4 transition-colors hover:bg-gray-50"
                style={{
                  borderColor: selectedPolicy === policy.id ? '#10203E' : '#E5DFD2',
                  backgroundColor: selectedPolicy === policy.id ? '#F0F4F8' : 'transparent',
                }}
              >
                <input
                  type="radio"
                  name="policy"
                  checked={selectedPolicy === policy.id}
                  onChange={() => setSelectedPolicy(policy.id)}
                  className="mt-1 h-4 w-4 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold" style={{ color: '#1B2430' }}>
                    {getPolicyLabel(policy)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {policy.is_long_stay ? 'Aplica a estadias longas' : 'Aplica a estadias curtas'}
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-gray-600">
                    {getPolicyDetails(policy).map((detail) => <p key={detail}>{detail}</p>)}
                  </div>
                </div>
              </label>
          ))
        )}
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            onClick={onClose}
            className="h-12 w-full rounded sm:w-auto px-4"
            style={{ backgroundColor: '#E5DFD2', color: '#1B2430' }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleApply}
            disabled={loading || !selectedPolicy}
            className="h-12 w-full rounded text-white sm:w-auto px-4"
            style={{ backgroundColor: '#10203E' }}
          >
            {loading ? 'Aplicando...' : 'Aplicar'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
