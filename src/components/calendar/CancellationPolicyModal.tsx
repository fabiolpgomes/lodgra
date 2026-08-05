'use client'

import React, { useState } from 'react'
import { Card } from '@/components/common/ui/card'
import { Button } from '@/components/common/ui/button'
import { toast } from 'sonner'
import { PropertyCancellationPolicy } from '@/types/cancellation.types'

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

  const policyDescriptions: Record<string, string> = {
    flexible: '⏰ Cancelamento livre até 1 dia antes',
    moderate: '📋 Retenção de 50% até 7 dias antes',
    strict: '🔒 Retenção de 100% até 30 dias antes',
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl mx-4 p-6">
        <h2 className="text-2xl font-bold mb-4" style={{ color: '#1B2430' }}>
          Política de Cancelamento
        </h2>

        <p className="text-sm text-gray-600 mb-4">
          Selecionadas {selectedDates.length} data(s) • {new Date(selectedDates[0]).toLocaleDateString('pt-BR')} até{' '}
          {new Date(selectedDates[selectedDates.length - 1]).toLocaleDateString('pt-BR')}
        </p>

        <div className="space-y-3 max-h-96 overflow-y-auto mb-6">
          {policies.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhuma política disponível</p>
          ) : (
            policies.map((policy) => (
              <label
                key={policy.id}
                className="flex items-center p-4 rounded border cursor-pointer transition-colors hover:bg-gray-50"
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
                  className="w-4 h-4 mr-3"
                />
                <div className="flex-1">
                  <div className="font-semibold text-sm" style={{ color: '#1B2430' }}>
                    {policyDescriptions[policy.policy_type] || policy.policy_type}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {policy.is_long_stay ? 'Aplica a estadias longas' : 'Aplica a estadias curtas'}
                  </div>
                </div>
              </label>
            ))
          )}
        </div>

        <div className="flex gap-2 justify-end">
          <Button
            onClick={onClose}
            className="px-4 py-2 rounded"
            style={{ backgroundColor: '#E5DFD2', color: '#1B2430' }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleApply}
            disabled={loading || !selectedPolicy}
            className="px-4 py-2 rounded text-white"
            style={{ backgroundColor: '#10203E' }}
          >
            {loading ? 'Aplicando...' : 'Aplicar'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
