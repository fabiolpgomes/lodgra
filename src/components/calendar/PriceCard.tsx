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

interface PriceCardProps {
  title: string
  value: string | number
  currency?: string
  action?: 'toggle' | 'edit' | 'remove'
  onAction?: () => void
  onSave?: (value: number) => void
  isActive?: boolean
  editableValue?: number | null
}

export function PriceCard({
  title,
  value,
  currency = 'EUR',
  action,
  onAction,
  onSave,
  isActive = true,
  editableValue,
}: PriceCardProps) {
  const [showModal, setShowModal] = useState(false)
  const [inputValue, setInputValue] = useState(editableValue?.toString() || '')
  const [loading, setLoading] = useState(false)

  const handleClick = (e: React.MouseEvent) => {
    if (action === 'edit' && onSave) {
      e.preventDefault()
      setInputValue(editableValue?.toString() || '')
      setShowModal(true)
    } else if (action && onAction) {
      e.preventDefault()
      onAction()
    }
  }

  const handleSave = async () => {
    const numValue = parseFloat(inputValue)
    if (isNaN(numValue) || numValue < 1) {
      toast.error('Preço deve ser >= 1')
      return
    }

    setLoading(true)
    try {
      await onSave?.(numValue)
      toast.success('Preço atualizado')
      setShowModal(false)
    } catch (error) {
      console.error('Error saving price:', error)
      toast.error('Erro ao guardar preço')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="price-card" role="presentation">
        <div className="price-card-content">
          <h4 className="price-title">{title}</h4>
          <div className="price-value">
            {typeof value === 'number' ? (
              <>
                <span className="currency">{currency}</span>
                <span className="amount">{value.toFixed(0)}</span>
              </>
            ) : (
              <span className="amount">{value}</span>
            )}
          </div>
        </div>

        {action === 'toggle' && (
          <button
            className={`toggle-button ${isActive ? 'active' : 'inactive'}`}
            onClick={handleClick}
            aria-label={`Toggle ${title}`}
          >
            <div className="toggle-switch" />
          </button>
        )}

        {action === 'edit' && (
          <button
            className="action-button edit"
            onClick={handleClick}
            aria-label={`Edit ${title}`}
          >
            ✎
          </button>
        )}

        {action === 'remove' && (
          <button
            className="action-button remove"
            onClick={handleClick}
            aria-label={`Remove ${title}`}
          >
            ✕
          </button>
        )}
      </div>

      {action === 'edit' && (
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar {title}</DialogTitle>
              <DialogDescription>
                Digite o novo valor em {currency}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="price-input">Valor</Label>
                <Input
                  id="price-input"
                  type="number"
                  min="1"
                  step="0.01"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ex: 149"
                  className="mt-2"
                />
              </div>
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
