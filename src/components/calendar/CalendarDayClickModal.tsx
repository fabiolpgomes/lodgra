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

interface DateRange {
  start: Date
  end: Date
}

interface CalendarDayClickModalProps {
  isOpen: boolean
  dates: Date | DateRange | null
  propertyId: string
  onClose: () => void
  onSavePrice?: (price: number) => Promise<void>
  onBlockDates?: () => Promise<void>
  onOpenDiscounts?: () => void
  onOpenCancellationPolicy?: () => void
}

export function CalendarDayClickModal({
  isOpen,
  dates,
  propertyId,
  onClose,
  onSavePrice,
  onBlockDates,
  onOpenDiscounts,
  onOpenCancellationPolicy,
}: CalendarDayClickModalProps) {
  const [price, setPrice] = useState('')
  const [saving, setSaving] = useState(false)
  const [action, setAction] = useState<'price' | 'block' | 'discounts' | 'policy' | null>(null)

  // Guard by isOpen only, not dates — allows Dialog to control visibility
  if (!isOpen) return null

  // If dates not ready, show loading state inside Dialog
  if (!dates) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <div className="text-center py-8">Carregando...</div>
        </DialogContent>
      </Dialog>
    )
  }

  const isSingleDay = dates instanceof Date
  const dateRange = isSingleDay
    ? { start: dates as Date, end: dates as Date }
    : (dates as DateRange)

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-PT', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const nights =
    Math.ceil(
      (dateRange.end.getTime() - dateRange.start.getTime()) /
        (1000 * 60 * 60 * 24)
    ) || 1

  const handleSavePrice = async () => {
    try {
      const priceVal = parseFloat(price)
      if (isNaN(priceVal) || priceVal <= 0) {
        toast.error('Preço deve ser maior que 0')
        return
      }

      setSaving(true)
      await onSavePrice?.(priceVal)
      toast.success('Preço salvo')
      setPrice('')
      setAction(null)
      onClose()
    } catch (error) {
      console.error('Error saving price:', error)
      toast.error('Erro ao salvar preço')
    } finally {
      setSaving(false)
    }
  }

  const handleBlockDates = async () => {
    try {
      setSaving(true)
      await onBlockDates?.()
      toast.success('Datas bloqueadas')
      setAction(null)
      onClose()
    } catch (error) {
      console.error('Error blocking dates:', error)
      toast.error('Erro ao bloquear datas')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg w-full mx-auto">
        {/* Action Selection View */}
        {action === null && (
          <>
            <DialogHeader>
              <DialogTitle>Alterar Preço ou Bloquear Datas</DialogTitle>
              <DialogDescription>
                {isSingleDay ? (
                  <span>{formatDate(dates)}</span>
                ) : (
                  <span>
                    {formatDate(dateRange.start)} → {formatDate(dateRange.end)} ({nights} {nights === 1 ? 'noite' : 'noites'})
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3 py-4">
              <Button
                onClick={() => setAction('price')}
                variant="outline"
                className="h-20 flex flex-col items-center justify-center gap-1"
              >
                <span className="text-2xl">💰</span>
                <span className="text-xs font-semibold">Definir Preço</span>
              </Button>
              <Button
                onClick={() => setAction('block')}
                variant="outline"
                className="h-20 flex flex-col items-center justify-center gap-1"
              >
                <span className="text-2xl">🔒</span>
                <span className="text-xs font-semibold">Bloquear Datas</span>
              </Button>
              <Button
                onClick={() => {
                  onOpenDiscounts?.()
                  onClose()
                }}
                variant="outline"
                className="h-20 flex flex-col items-center justify-center gap-1"
              >
                <span className="text-2xl">🏷️</span>
                <span className="text-xs font-semibold">Descontos</span>
              </Button>
              <Button
                onClick={() => {
                  onOpenCancellationPolicy?.()
                  onClose()
                }}
                variant="outline"
                className="h-20 flex flex-col items-center justify-center gap-1"
              >
                <span className="text-2xl">📋</span>
                <span className="text-xs font-semibold">Cancelamento</span>
              </Button>
            </div>

            <div className="text-xs p-3 rounded-lg" style={{ backgroundColor: '#F7F5EF', color: '#4D5566' }}>
              <p className="font-medium mb-1" style={{ color: '#1B2430' }}>Dicas:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Clique para definir preço do {isSingleDay ? 'dia' : 'período'}</li>
                <li>Bloqueie datas para não aceitar reservas</li>
              </ul>
            </div>
          </>
        )}

        {/* Price Setting View */}
        {action === 'price' && (
          <>
            <DialogHeader>
              <DialogTitle>Definir Preço</DialogTitle>
              <DialogDescription>
                {isSingleDay
                  ? `${formatDate(dates)}`
                  : `${formatDate(dateRange.start)} → ${formatDate(dateRange.end)}`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="price" className="text-sm mb-2 block">
                  Preço por Noite
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-lg font-semibold" style={{ color: '#4D5566' }}>
                    €
                  </span>
                  <Input
                    id="price"
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="h-12 pl-8 text-base font-semibold"
                    autoFocus
                  />
                </div>
              </div>

              {!isSingleDay && nights > 1 && (
                <div className="p-3 rounded-lg" style={{ backgroundColor: '#F7F5EF' }}>
                  <p className="text-sm font-medium" style={{ color: '#1B2430' }}>Cálculo</p>
                  <p className="text-xs mt-1" style={{ color: '#4D5566' }}>
                    €{price || '0'} × {nights} noites = €
                    {price ? (parseFloat(price) * nights).toFixed(2) : '0.00'}
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="flex gap-2 sm:gap-3">
              <Button
                onClick={() => setAction(null)}
                variant="outline"
                className="flex-1 h-12"
                disabled={saving}
              >
                Voltar
              </Button>
              <Button
                onClick={handleSavePrice}
                disabled={saving || !price}
                className="flex-1 h-12 text-base font-semibold"
              >
                {saving ? 'Salvando...' : 'Salvar Preço'}
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Block Dates View */}
        {action === 'block' && (
          <>
            <DialogHeader>
              <DialogTitle>Bloquear Datas</DialogTitle>
              <DialogDescription>
                {isSingleDay
                  ? `${formatDate(dates)}`
                  : `${formatDate(dateRange.start)} → ${formatDate(dateRange.end)}`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg border" style={{ backgroundColor: '#F7F5EF', borderColor: '#E5DFD2' }}>
                <p className="text-sm font-medium mb-2" style={{ color: '#1B2430' }}>
                  ⚠️ Datas Bloqueadas
                </p>
                <p className="text-xs" style={{ color: '#4D5566' }}>
                  {isSingleDay
                    ? 'Este dia não aceitará novas reservas'
                    : `Este período (${nights} noite${nights !== 1 ? 's' : ''}) não aceitará novas reservas`}
                </p>
              </div>

              <div className="p-3 rounded-lg" style={{ backgroundColor: '#F7F5EF' }}>
                <p className="text-xs" style={{ color: '#4D5566' }}>
                  Você pode desbloquear essas datas a qualquer momento clicando
                  novamente.
                </p>
              </div>
            </div>

            <DialogFooter className="flex gap-2 sm:gap-3">
              <Button
                onClick={() => setAction(null)}
                variant="outline"
                className="flex-1 h-12"
                disabled={saving}
              >
                Voltar
              </Button>
              <Button
                onClick={handleBlockDates}
                disabled={saving}
                className="flex-1 h-12 text-base font-semibold text-white"
                style={{ backgroundColor: '#10203E' }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                {saving ? 'Bloqueando...' : 'Bloquear Datas'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
