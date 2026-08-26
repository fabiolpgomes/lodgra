'use client'

import { useState } from 'react'
import { PropertyCancellationPolicy } from '@/types/cancellation.types'
import { toast } from 'sonner'

interface CancellationCardProps {
  title: string
  description: string
  policy: PropertyCancellationPolicy
  onSave?: (policyId: string, updates: Partial<PropertyCancellationPolicy>) => Promise<void>
}

export function CancellationCard({ title, description, policy, onSave }: CancellationCardProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fullRefundDays, setFullRefundDays] = useState(String(policy.full_refund_days))
  const [partialRefundDays, setPartialRefundDays] = useState(String(policy.partial_refund_days || ''))
  const [partialRefundPercent, setPartialRefundPercent] = useState(String(policy.partial_refund_percent || ''))
  const [discountPercent, setDiscountPercent] = useState(String(policy.non_refundable_discount_percent))

  const handleSave = async () => {
    if (!onSave) return

    // Validation
    const fullDays = parseInt(fullRefundDays) || 0
    const partialDays = partialRefundDays ? parseInt(partialRefundDays) : null
    const partialPercent = partialRefundPercent ? parseInt(partialRefundPercent) : null
    const discount = parseInt(discountPercent) || 0

    if (fullDays < 0) {
      toast.error('Dias para reembolso total deve ser >= 0')
      return
    }

    if (partialDays && partialDays < 0) {
      toast.error('Dias para reembolso parcial deve ser >= 0')
      return
    }

    if (partialPercent && (partialPercent < 0 || partialPercent > 100)) {
      toast.error('Percentagem de reembolso deve ser 0-100%')
      return
    }

    if (discount < 0 || discount > 100) {
      toast.error('Desconto deve ser 0-100%')
      return
    }

    setLoading(true)
    try {
      await onSave(policy.id, {
        full_refund_days: fullDays,
        partial_refund_days: partialDays,
        partial_refund_percent: partialPercent,
        non_refundable_discount_percent: discount,
      })
      setIsOpen(false)
      toast.success('Política de cancelamento atualizada')
    } catch (error) {
      console.error('Error saving policy:', error)
      toast.error('Erro ao guardar política')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div
        onClick={() => setIsOpen(true)}
        className="rounded-lg border border-[#E5DFD2] p-4 transition-colors hover:bg-[#F7F5EF] cursor-pointer"
      >
        <h3 className="font-semibold text-base text-[#1B2430]">{title}</h3>
        <p className="text-sm text-[#4D5566] mt-1">{description}</p>
        <div className="mt-3 space-y-1 text-sm text-[#4D5566]">
          <p>Reembolso total: {policy.full_refund_days} dias antes</p>
          {policy.partial_refund_days !== null && (
            <p>Reembolso parcial ({policy.partial_refund_percent}%): {policy.partial_refund_days} dias</p>
          )}
          {policy.non_refundable_discount_percent > 0 && (
            <p>Desconto não-reembolsável: {policy.non_refundable_discount_percent}%</p>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center sm:p-4">
          <div className="w-full max-w-md rounded-t-2xl bg-[#FBFAF6] p-5 sm:mx-4 sm:rounded-2xl sm:p-6">
            <h2 className="mb-4 text-lg font-semibold text-[#1B2430]">Editar {title}</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-[#1B2430]">Dias para reembolso total (100%)</label>
                <input
                  type="number"
                  min="0"
                  value={fullRefundDays}
                  onChange={(e) => setFullRefundDays(e.target.value)}
                  disabled={loading}
                  className="w-full rounded border border-[#E5DFD2] px-3 py-3"
                />
                <p className="text-xs text-[#4D5566] mt-1">
                  Número de dias antes do check-in para 100% de reembolso
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-[#1B2430]">Dias para reembolso parcial</label>
                <input
                  type="number"
                  min="0"
                  placeholder="Deixar vazio se não aplicável"
                  value={partialRefundDays}
                  onChange={(e) => setPartialRefundDays(e.target.value)}
                  disabled={loading}
                  className="w-full rounded border border-[#E5DFD2] px-3 py-3"
                />
              </div>

              {partialRefundDays && (
                <div>
                  <label className="block text-sm font-medium mb-1 text-[#1B2430]">Percentagem de reembolso parcial (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={partialRefundPercent}
                    onChange={(e) => setPartialRefundPercent(e.target.value)}
                    disabled={loading}
                    className="w-full rounded border border-[#E5DFD2] px-3 py-3"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1 text-[#1B2430]">Desconto não-reembolsável (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                  disabled={loading}
                  className="w-full rounded border border-[#E5DFD2] px-3 py-3"
                />
                <p className="text-xs text-[#4D5566] mt-1">Desconto oferecido se o hóspede escolher tarifa não-reembolsável</p>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
              <button
                onClick={() => setIsOpen(false)}
                disabled={loading}
                className="h-12 flex-1 rounded border border-[#E5DFD2] px-4 text-[#1B2430] hover:bg-[#F7F5EF] disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="h-12 flex-1 rounded bg-[#10203E] px-4 text-white hover:bg-[#0D1A2E] disabled:opacity-50"
              >
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
