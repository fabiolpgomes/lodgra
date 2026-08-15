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
import { CalendarDays } from 'lucide-react'
import { CURRENCIES, formatCurrency, getCurrencySymbol, type CurrencyCode } from '@/lib/utils/currency'

interface DateRange {
  start: Date
  end: Date
}

interface CalendarDayClickModalProps {
  isOpen: boolean
  dates: Date | DateRange | null
  propertyId: string
  currency?: string
  onClose: () => void
  onSavePrice?: (price: number) => Promise<void>
  onBlockDates?: (reason?: string) => Promise<void>
  onUnblockDates?: () => Promise<void>
  blockedDateInfo?: { reason: string; count: number } | null
  onOpenDiscounts?: () => void
  onOpenCancellationPolicy?: () => void
}

export function CalendarDayClickModal({
  isOpen,
  dates,
  propertyId,
  currency = 'EUR',
  onClose,
  onSavePrice,
  onBlockDates,
  onUnblockDates,
  blockedDateInfo,
  onOpenDiscounts,
  onOpenCancellationPolicy,
}: CalendarDayClickModalProps) {
  const [price, setPrice] = useState('')
  const [blockReason, setBlockReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [action, setAction] = useState<'price' | 'block' | 'discounts' | 'policy' | 'unblock' | null>(null)

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

  const parsedPrice = Number(price.replace(',', '.'))
  const isPriceValid = Number.isFinite(parsedPrice) && parsedPrice > 0
  const totalPrice = isPriceValid ? parsedPrice * nights : 0
  const normalizedCurrency = currency.toUpperCase()
  const currencyCode: CurrencyCode = normalizedCurrency in CURRENCIES
    ? normalizedCurrency as CurrencyCode
    : 'EUR'

  const handleClose = () => {
    setPrice('')
    setBlockReason('')
    setAction(null)
    onClose()
  }

  const handleSavePrice = async () => {
    try {
      if (!isPriceValid) {
        toast.error('Preço deve ser maior que 0')
        return
      }

      setSaving(true)
      await onSavePrice?.(parsedPrice)
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
      await onBlockDates?.(blockReason || undefined)
      toast.success('Datas bloqueadas' + (blockReason ? `: ${blockReason}` : ''))
      setPrice('')
      setBlockReason('')
      setAction(null)
      onClose()
    } catch (error) {
      console.error('Error blocking dates:', error)
      toast.error('Erro ao bloquear datas')
    } finally {
      setSaving(false)
    }
  }

  const handleUnblockDates = async () => {
    try {
      setSaving(true)
      await onUnblockDates?.()
      toast.success('Datas desbloqueadas')
      setAction(null)
      onClose()
    } catch (error) {
      console.error('Error unblocking dates:', error)
      toast.error('Erro ao desbloquear datas')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose() }}>
      <DialogContent className={action === 'price'
        ? 'w-[calc(100%_-_2rem)] max-w-lg overflow-hidden rounded-3xl border-[#E5E7EB] p-0 shadow-2xl'
        : 'mx-auto w-full max-w-lg'}>
        {/* Action Selection View */}
        {action === null && (
          <>
            <DialogHeader>
              <DialogTitle>
                {blockedDateInfo ? 'Desbloquear Datas' : 'Alterar Preço ou Bloquear Datas'}
              </DialogTitle>
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

            {blockedDateInfo ? (
              <>
                <div className="space-y-4 py-4">
                  <div className="p-4 rounded-lg border" style={{ backgroundColor: '#FFF3CD', borderColor: '#FFE69C' }}>
                    <p className="text-sm font-medium mb-2" style={{ color: '#1B2430' }}>
                      🔒 {blockedDateInfo.count > 1 ? `${blockedDateInfo.count} períodos bloqueados` : 'Data bloqueada'}
                    </p>
                    <p className="text-xs" style={{ color: '#4D5566' }}>
                      {blockedDateInfo.count > 1 ? 'Apenas as datas selecionadas serão desbloqueadas.' : <>Motivo: <strong>{blockedDateInfo.reason}</strong></>}
                    </p>
                  </div>
                </div>

                <DialogFooter className="flex gap-2 sm:gap-3">
                  <Button
                    onClick={onClose}
                    variant="outline"
                    className="flex-1 h-12"
                    disabled={saving}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleUnblockDates}
                    disabled={saving || !onUnblockDates}
                    className="flex-1 h-12 text-base font-semibold text-white"
                    style={{ backgroundColor: '#10203E' }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                  >
                    {saving ? 'Desbloqueando...' : 'Desbloquear Datas'}
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <>
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
              </>
            )}

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
          <form onSubmit={(event) => { event.preventDefault(); void handleSavePrice() }}>
            <div className="border-b border-[#E5E7EB] px-6 pb-5 pt-6 sm:px-8">
              <DialogHeader className="gap-2 text-left">
                <DialogTitle className="text-2xl font-semibold tracking-tight text-[#1B2430]">
                  Definir preço por noite
                </DialogTitle>
                <DialogDescription className="flex flex-wrap items-center gap-2 text-sm text-[#5E6878]">
                  <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>
                    {isSingleDay
                      ? formatDate(dates)
                      : `${formatDate(dateRange.start)} → ${formatDate(dateRange.end)}`}
                  </span>
                  {!isSingleDay && (
                    <span className="rounded-full bg-[#EEF2F7] px-2 py-0.5 text-xs font-semibold text-[#10203E]">
                      {nights} {nights === 1 ? 'noite' : 'noites'}
                    </span>
                  )}
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="space-y-5 px-6 py-6 sm:px-8">
              <div className="space-y-2">
                <Label htmlFor="price" className="block text-sm font-semibold text-[#1B2430]">
                  Preço por noite
                </Label>
                <div className="flex h-14 items-center overflow-hidden rounded-xl border border-[#B8C0CC] bg-white shadow-sm transition focus-within:border-[#10203E] focus-within:ring-2 focus-within:ring-[#10203E]/15">
                  <span className="flex h-full w-14 shrink-0 items-center justify-center border-r border-[#E5E7EB] bg-[#F7F8FA] text-[#4D5566]" aria-hidden="true">
                    {getCurrencySymbol(currencyCode)}
                  </span>
                  <Input
                    id="price"
                    type="text"
                    inputMode="decimal"
                    value={price}
                    onChange={(event) => setPrice(event.target.value.replace(/[^0-9.,]/g, ''))}
                    placeholder="0,00"
                    aria-describedby={isSingleDay ? 'price-help' : 'price-help price-summary'}
                    className="h-full flex-1 rounded-none border-0 bg-transparent px-4 text-xl font-semibold text-[#1B2430] shadow-none focus-visible:ring-0"
                    autoComplete="off"
                    autoFocus
                  />
                </div>
                <p id="price-help" className="text-xs text-[#697386]">
                  Este valor será aplicado a cada noite selecionada.
                </p>
              </div>

              {!isSingleDay && (
                <div id="price-summary" className="rounded-xl border border-[#E5E7EB] bg-[#F7F8FA] p-4" aria-live="polite">
                  <div className="flex items-center justify-between gap-4 text-sm text-[#5E6878]">
                    <span>{formatCurrency(isPriceValid ? parsedPrice : 0, currencyCode)} × {nights} noites</span>
                    <span className="text-base font-semibold text-[#1B2430]">{formatCurrency(totalPrice, currencyCode)}</span>
                  </div>
                  <p className="mt-1 text-xs text-[#697386]">Estimativa total do período</p>
                </div>
              )}
            </div>

            <DialogFooter className="grid grid-cols-2 gap-3 border-t border-[#E5E7EB] bg-white px-6 py-5 sm:px-8">
              <Button
                onClick={() => setAction(null)}
                variant="outline"
                type="button"
                className="h-12 rounded-xl border-[#CDD3DB] text-base font-semibold"
                disabled={saving}
              >
                Voltar
              </Button>
              <Button
                type="submit"
                disabled={saving || !isPriceValid}
                className="h-12 rounded-xl bg-[#10203E] text-base font-semibold text-white hover:bg-[#1B3155] disabled:bg-[#D8DDE5]"
              >
                {saving ? 'Salvando...' : 'Salvar Preço'}
              </Button>
            </DialogFooter>
          </form>
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

              <div>
                <Label htmlFor="block-reason" className="text-sm mb-2 block">
                  Motivo do Bloqueio (Opcional)
                </Label>
                <Input
                  id="block-reason"
                  type="text"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="Ex: Manutenção, Limpeza, Férias..."
                  className="h-10 text-sm"
                />
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
