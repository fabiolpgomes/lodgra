'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/common/ui/dialog'
import { Button } from '@/components/common/ui/button'
import { Input } from '@/components/common/ui/input'
import { Label } from '@/components/common/ui/label'
import { toast } from 'sonner'

interface DiscountCardProps {
  title: string
  condition: string
  discountPercent: number
  onEdit?: () => void
  onSave?: (percentage: number) => void
  averageValue?: number
  discountId?: string
}

export function DiscountCard({
  title,
  condition,
  discountPercent,
  onEdit,
  onSave,
  averageValue,
  discountId,
}: DiscountCardProps) {
  const [showModal, setShowModal] = useState(false)
  const [inputValue, setInputValue] = useState(discountPercent.toString())
  const [loading, setLoading] = useState(false)

  const handleClick = () => {
    if (onSave) {
      setInputValue(discountPercent.toString())
      setShowModal(true)
    } else if (onEdit) {
      onEdit()
    }
  }

  const handleSave = async () => {
    const numValue = parseFloat(inputValue)
    if (isNaN(numValue) || numValue < 0 || numValue > 100) {
      toast.error('Percentagem deve estar entre 0-100%')
      return
    }

    setLoading(true)
    try {
      await onSave?.(numValue)
      toast.success('Desconto atualizado')
      setShowModal(false)
    } catch (error) {
      console.error('Error saving discount:', error)
      toast.error('Erro ao guardar desconto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        className="discount-card"
        onClick={handleClick}
        aria-label={`Edit ${title} discount`}
      >
        <div className="discount-card-content">
          <h4 className="discount-title">{title}</h4>
          <p className="discount-condition">{condition}</p>
          {averageValue && (
            <p className="discount-average">A média é de €{averageValue}</p>
          )}
        </div>

        <div className="discount-value">
          <span className="percent">{discountPercent}%</span>
        </div>

        <div className="edit-indicator">›</div>
      </button>

      {onSave && (
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar {title}</DialogTitle>
              <DialogDescription>
                Digite o percentual de desconto (0-100%)
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="discount-input">Percentagem</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    id="discount-input"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Ex: 5"
                    className="flex-1"
                  />
                  <span className="text-sm font-medium">%</span>
                </div>
              </div>
              {averageValue && (
                <div className="text-sm text-gray-600">
                  Economia estimada: €
                  {(averageValue * (parseFloat(inputValue) / 100)).toFixed(0)}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowModal(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
