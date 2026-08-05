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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl mx-4 p-6">
        <h2 className="text-2xl font-bold mb-4" style={{ color: '#1B2430' }}>
          Aplicar Descontos
        </h2>

        <p className="text-sm text-gray-600 mb-4">
          Selecionadas {selectedDates.length} data(s) • {new Date(selectedDates[0]).toLocaleDateString('pt-BR')} até{' '}
          {new Date(selectedDates[selectedDates.length - 1]).toLocaleDateString('pt-BR')}
        </p>

        <div className="space-y-3 max-h-96 overflow-y-auto mb-6">
          {discounts.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum desconto disponível</p>
          ) : (
            discounts.map((discount) => (
              <label
                key={discount.id}
                className="flex items-center p-3 rounded border cursor-pointer transition-colors hover:bg-gray-50"
                style={{ borderColor: '#E5DFD2' }}
              >
                <input
                  type="checkbox"
                  checked={selectedDiscounts.includes(discount.id)}
                  onChange={() => handleToggleDiscount(discount.id)}
                  className="w-4 h-4 mr-3"
                />
                <div className="flex-1">
                  <div className="font-semibold text-sm" style={{ color: '#1B2430' }}>
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
            disabled={loading || selectedDiscounts.length === 0}
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
