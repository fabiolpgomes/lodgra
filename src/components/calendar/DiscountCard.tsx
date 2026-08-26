'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/common/ui/button'
import { Input } from '@/components/common/ui/input'
import { Label } from '@/components/common/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/common/ui/dialog'
import { toast } from 'sonner'
import { AlertCircle, Info } from 'lucide-react'
import { CURRENCIES, getCurrencySymbol, type CurrencyCode } from '@/lib/utils/currency'

interface PropertyDiscounts {
  weeklyPercent: number
  monthlyPercent: number
  loyaltyPercent: number
}

interface DiscountCardProps {
  propertyId: string
  currency?: string
  onUpdate?: () => void
}

const AVERAGES = {
  weekly: 894,
  monthly: 1724,
}

export function DiscountCard({ propertyId, currency, onUpdate }: DiscountCardProps) {
  const [discounts, setDiscounts] = useState<PropertyDiscounts>({
    weeklyPercent: 0,
    monthlyPercent: 0,
    loyaltyPercent: 0,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const normalizedCurrency = currency?.toUpperCase() ?? null
  const currencyCode = normalizedCurrency && normalizedCurrency in CURRENCIES
    ? normalizedCurrency as CurrencyCode
    : null
  const currencySymbol = currencyCode ? getCurrencySymbol(currencyCode) : ''

  useEffect(() => {
    loadDiscounts()
  }, [propertyId])

  const loadDiscounts = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/properties/${propertyId}/discounts`)
      const data = await response.json()

      if (data.success && data.data?.length > 0) {
        const weeklyDiscount = data.data.find((d: any) => d.discount_type === 'weekly')
        const monthlyDiscount = data.data.find((d: any) => d.discount_type === 'monthly')
        const excellentGuestDiscount = data.data.find((d: any) => d.discount_type === 'excellent_guest')

        setDiscounts({
          weeklyPercent: weeklyDiscount?.percentage || 0,
          monthlyPercent: monthlyDiscount?.percentage || 0,
          loyaltyPercent: excellentGuestDiscount?.percentage || 0,
        })
      }
    } catch (error) {
      console.error('Error loading discounts:', error)
      toast.error('Erro ao carregar descontos')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveDiscounts = async () => {
    try {
      if (discounts.weeklyPercent < 0 || discounts.weeklyPercent > 100) {
        toast.error('Desconto semanal deve estar entre 0-100%')
        return
      }
      if (discounts.monthlyPercent < 0 || discounts.monthlyPercent > 100) {
        toast.error('Desconto mensal deve estar entre 0-100%')
        return
      }
      if (discounts.loyaltyPercent < 0 || discounts.loyaltyPercent > 100) {
        toast.error('Desconto fidelidade deve estar entre 0-100%')
        return
      }

      setSaving(true)

      const response = await fetch(`/api/properties/${propertyId}/discounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weeklyPercent: discounts.weeklyPercent,
          monthlyPercent: discounts.monthlyPercent,
          loyaltyPercent: discounts.loyaltyPercent,
        }),
      })

      if (response.ok) {
        toast.success('Descontos atualizado')
        setShowDialog(false)
        onUpdate?.()
      } else {
        toast.error('Erro ao salvar descontos')
      }
    } catch (error) {
      console.error('Error saving discounts:', error)
      toast.error('Erro ao atualizar descontos')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-[#E5DFD2] bg-[#FBFAF6] p-4 md:p-6">
        <h3 className="mb-4 text-lg font-semibold text-[#1B2430]">Descontos</h3>
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-[#F7F5EF] rounded"></div>
          <div className="h-20 bg-[#F7F5EF] rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold text-[#1B2430]">Descontos</h3>
          <Button
            onClick={() => setShowDialog(true)}
            variant="outline"
            size="sm"
            className="h-10 w-full border-[#E5DFD2] text-[#1B2430] hover:bg-[#F7F5EF] sm:w-auto"
          >
            Editar
          </Button>
        </div>

        {/* Warning: Exclusive Discounts */}
          <div className="flex gap-3 rounded-lg border border-[#E5DFD2] bg-[#FBFAF6] p-4">
            <AlertCircle className="w-5 h-5 text-[#C9A227] flex-shrink-0 mt-0.5" />
            <div className="text-sm text-[#4D5566]">
            <p className="font-semibold text-[#1B2430] mb-1">⚠️ Descontos Exclusivos</p>
            <p>
              Apenas um desconto de volume é aplicado por reserva:
              <br />• 28+ noites → Mensal (exclui Semanal)
              <br />• 7-27 noites → Semanal
            </p>
          </div>
        </div>

        {/* Discount Summary Cards */}
        <div className="space-y-3">
          {/* Weekly */}
          <div className="p-4 bg-[#FBFAF6] rounded-lg border border-[#E5DFD2]">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <p className="font-semibold text-sm text-[#1B2430]">Desconto Semanal</p>
                <p className="text-xs text-[#4D5566] mt-1">Para estadias de 7-27 noites</p>
              </div>
              <p className="text-xl font-bold text-[#C9A227] sm:text-2xl">{discounts.weeklyPercent}%</p>
            </div>
            <p className="text-xs text-[#4D5566]">
              Média semanal: {currencySymbol}{AVERAGES.weekly} → Economia: {currencySymbol}
              {(AVERAGES.weekly * (discounts.weeklyPercent / 100)).toFixed(0)}
            </p>
          </div>

          {/* Monthly */}
          <div className="p-4 bg-[#FBFAF6] rounded-lg border border-[#E5DFD2]">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <p className="font-semibold text-sm text-[#1B2430]">Desconto Mensal</p>
                <p className="text-xs text-[#4D5566] mt-1">Para estadias de 28+ noites</p>
              </div>
              <p className="text-xl font-bold text-[#C9A227] sm:text-2xl">{discounts.monthlyPercent}%</p>
            </div>
            <p className="text-xs text-[#4D5566]">
              Média mensal: {currencySymbol}{AVERAGES.monthly} → Economia: {currencySymbol}
              {(AVERAGES.monthly * (discounts.monthlyPercent / 100)).toFixed(0)}
            </p>
          </div>

          {/* Loyalty */}
          <div className="p-4 bg-[#FBFAF6] rounded-lg border border-[#E5DFD2]">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <p className="font-semibold text-sm text-[#1B2430]">Desconto Fidelidade</p>
                <p className="text-xs text-[#4D5566] mt-1">
                  Aplicado em cascata (após desconto de volume)
                </p>
              </div>
              <p className="text-xl font-bold text-[#C9A227] sm:text-2xl">{discounts.loyaltyPercent}%</p>
            </div>
            <p className="text-xs text-[#4D5566]">
              Bônus para hóspedes recorrentes
            </p>
          </div>
        </div>

        {/* Info */}
        <div className="p-3 bg-[#F7F5EF] rounded-lg flex gap-2 border border-[#E5DFD2]">
          <Info className="w-5 h-5 text-[#1B2430] flex-shrink-0 mt-0.5" />
          <p className="text-xs text-[#4D5566]">
            Os descontos são aplicados em cascata: volume primeiro, depois fidelidade
          </p>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="w-[calc(100%_-_1rem)] max-w-lg bg-[#FBFAF6] border-[#E5DFD2] sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-[#1B2430]">Configurar Descontos</DialogTitle>
            <DialogDescription className="text-[#4D5566]">
              Defina as percentagens de desconto para diferentes tipos de estadia
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Weekly Discount */}
            <div className="space-y-2 p-4 bg-[#F7F5EF] rounded-lg border border-[#E5DFD2]">
              <Label htmlFor="weekly" className="text-sm font-semibold text-[#1B2430]">
                Desconto Semanal (7-27 noites)
              </Label>
              <div className="flex gap-2">
                <Input
                  id="weekly"
                  type="number"
                  min="0"
                  max="100"
                  value={discounts.weeklyPercent}
                  onFocus={(event) => event.currentTarget.select()}
                  onChange={(e) =>
                    setDiscounts({
                      ...discounts,
                      weeklyPercent: parseInt(e.target.value) || 0,
                    })
                  }
                  className="h-12 flex-1 border-[#E5DFD2] bg-[#FBFAF6] text-base text-[#1B2430]"
                  placeholder="0"
                />
                <span className="flex items-center text-lg font-semibold text-[#C9A227]">%</span>
              </div>
              <p className="text-xs text-[#4D5566]">
                Economia: {currencySymbol}{(AVERAGES.weekly * (discounts.weeklyPercent / 100)).toFixed(0)}
              </p>
            </div>

            {/* Monthly Discount */}
            <div className="space-y-2 p-4 bg-[#F7F5EF] rounded-lg border border-[#E5DFD2]">
              <Label htmlFor="monthly" className="text-sm font-semibold text-[#1B2430]">
                Desconto Mensal (28+ noites)
              </Label>
              <div className="flex gap-2">
                <Input
                  id="monthly"
                  type="number"
                  min="0"
                  max="100"
                  value={discounts.monthlyPercent}
                  onFocus={(event) => event.currentTarget.select()}
                  onChange={(e) =>
                    setDiscounts({
                      ...discounts,
                      monthlyPercent: parseInt(e.target.value) || 0,
                    })
                  }
                  className="h-12 flex-1 border-[#E5DFD2] bg-[#FBFAF6] text-base text-[#1B2430]"
                  placeholder="0"
                />
                <span className="flex items-center text-lg font-semibold text-[#C9A227]">%</span>
              </div>
              <p className="text-xs text-[#4D5566]">
                Economia: {currencySymbol}{(AVERAGES.monthly * (discounts.monthlyPercent / 100)).toFixed(0)}
              </p>
            </div>

            {/* Loyalty Discount */}
            <div className="space-y-2 p-4 bg-[#F7F5EF] rounded-lg border border-[#E5DFD2]">
              <Label htmlFor="loyalty" className="text-sm font-semibold text-[#1B2430]">
                Desconto Fidelidade (Cascata)
              </Label>
              <div className="flex gap-2">
                <Input
                  id="loyalty"
                  type="number"
                  min="0"
                  max="100"
                  value={discounts.loyaltyPercent}
                  onFocus={(event) => event.currentTarget.select()}
                  onChange={(e) =>
                    setDiscounts({
                      ...discounts,
                      loyaltyPercent: parseInt(e.target.value) || 0,
                    })
                  }
                  className="h-12 flex-1 border-[#E5DFD2] bg-[#FBFAF6] text-base text-[#1B2430]"
                  placeholder="0"
                />
                <span className="flex items-center text-lg font-semibold text-[#C9A227]">%</span>
              </div>
              <p className="text-xs text-[#4D5566]">
                Aplicado APÓS desconto de volume (para hóspedes recorrentes)
              </p>
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:gap-3">
            <Button
              onClick={() => setShowDialog(false)}
              variant="outline"
              className="h-12 w-full flex-1 border-[#E5DFD2] text-[#1B2430] hover:bg-[#F7F5EF] sm:w-auto"
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveDiscounts}
              disabled={saving}
              className="h-12 w-full flex-1 text-base font-semibold bg-[#10203E] text-white hover:bg-[#0c1830] sm:w-auto"
            >
              {saving ? 'Salvando...' : 'Salvar Descontos'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
