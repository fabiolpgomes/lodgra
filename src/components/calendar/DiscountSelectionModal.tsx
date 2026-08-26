'use client'

import React, { useState } from 'react'
import { Card } from '@/components/common/ui/card'
import { Button } from '@/components/common/ui/button'
import { Input } from '@/components/common/ui/input'
import { Label } from '@/components/common/ui/label'
import { toast } from 'sonner'
import { PropertyDiscount } from '@/types/pricing.types'

interface DiscountSelectionModalProps {
  isOpen: boolean
  selectedDates: Date[]
  propertyId: string
  discounts: PropertyDiscount[]
  onClose: () => void
  onApply: (discountIds: string[]) => Promise<void>
}

export function DiscountSelectionModal({
  isOpen,
  selectedDates,
  propertyId,
  discounts,
  onClose,
  onApply,
}: DiscountSelectionModalProps) {
  const [selectedDiscounts, setSelectedDiscounts] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const handleToggleDiscount = (discountId: string) => {
    setSelectedDiscounts((prev) =>
      prev.includes(discountId)
        ? prev.filter((id) => id !== discountId)
        : [...prev, discountId]
    )
  }

  const handleApply = async () => {
    if (selectedDiscounts.length === 0) {
      toast.error('Selecione pelo menos um desconto')
      return
    }

    setLoading(true)
    try {
      await onApply(selectedDiscounts)
      toast.success('Descontos aplicados com sucesso')
      setSelectedDiscounts([])
      onClose()
    } catch (error) {
      console.error('Error applying discounts:', error)
      toast.error('Erro ao aplicar descontos')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center sm:p-4">
      <Card className="w-full max-w-2xl rounded-t-2xl p-5 sm:mx-4 sm:rounded-2xl sm:p-6">
        <h2 className="mb-4 text-xl font-bold sm:text-2xl" style={{ color: '#1B2430' }}>
          Aplicar Descontos
        </h2>

        <p className="mb-4 text-sm text-gray-600">
          Selecionadas {selectedDates.length} data(s) • {new Date(selectedDates[0]).toLocaleDateString('pt-BR')} até{' '}
          {new Date(selectedDates[selectedDates.length - 1]).toLocaleDateString('pt-BR')}
        </p>

        <div className="mb-6 max-h-96 space-y-3 overflow-y-auto">
          {discounts.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum desconto disponível</p>
          ) : (
            discounts.map((discount) => (
              <label
                key={discount.id}
                className="flex items-start gap-3 rounded border p-3 transition-colors hover:bg-gray-50"
                style={{ borderColor: '#E5DFD2' }}
              >
                <input
                  type="checkbox"
                  checked={selectedDiscounts.includes(discount.id)}
                  onChange={() => handleToggleDiscount(discount.id)}
                  className="mt-1 h-4 w-4 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold" style={{ color: '#1B2430' }}>
                    {discount.discount_type} - {discount.percentage}%
                  </div>
                  <div className="text-xs text-gray-500">
                    Min. {discount.min_nights} noites
                  </div>
                </div>
              </label>
          ))
        )}
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            onClick={onClose}
            className="h-12 w-full rounded px-4 sm:w-auto"
            style={{ backgroundColor: '#E5DFD2', color: '#1B2430' }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleApply}
            disabled={loading || selectedDiscounts.length === 0}
            className="h-12 w-full rounded px-4 text-white sm:w-auto"
            style={{ backgroundColor: '#10203E' }}
          >
            {loading ? 'Aplicando...' : 'Aplicar'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
