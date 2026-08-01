'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/common/ui/card'
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

interface PropertyDiscounts {
  weeklyPercent: number
  monthlyPercent: number
  loyaltyPercent: number
}

interface DiscountCardProps {
  propertyId: string
  onUpdate?: () => void
}

const AVERAGES = {
  weekly: 894,
  monthly: 1724,
}

export function DiscountCard({ propertyId, onUpdate }: DiscountCardProps) {
  const [discounts, setDiscounts] = useState<PropertyDiscounts>({
    weeklyPercent: 0,
    monthlyPercent: 0,
    loyaltyPercent: 0,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showDialog, setShowDialog] = useState(false)

  useEffect(() => {
    loadDiscounts()
  }, [propertyId])

  const loadDiscounts = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/properties/${propertyId}/discounts`)
      const data = await response.json()

      if (data.success && data.data?.length > 0) {
        // Map API response to component state
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
      // Validate inputs
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
      <Card className="p-4 md:p-6">
        <h3 className="text-lg font-semibold mb-4">Descontos</h3>
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </Card>
    )
  }

  return (
    <>
      <Card className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Descontos</h3>
          <Button
            onClick={() => setShowDialog(true)}
            variant="outline"
            size="sm"
            className="h-10"
          >
            Editar
          </Button>
        </div>

        {/* Warning: Exclusive Discounts */}
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium mb-1">⚠️ Descontos Exclusivos</p>
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
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-medium text-sm text-blue-900">Desconto Semanal</p>
                <p className="text-xs text-blue-700 mt-1">Para estadias de 7-27 noites</p>
              </div>
              <p className="text-2xl font-bold text-blue-600">{discounts.weeklyPercent}%</p>
            </div>
            <p className="text-xs text-blue-700">
              Média semanal: €{AVERAGES.weekly} → Economia: €
              {(AVERAGES.weekly * (discounts.weeklyPercent / 100)).toFixed(0)}
            </p>
          </div>

          {/* Monthly */}
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-medium text-sm text-green-900">Desconto Mensal</p>
                <p className="text-xs text-green-700 mt-1">Para estadias de 28+ noites</p>
              </div>
              <p className="text-2xl font-bold text-green-600">{discounts.monthlyPercent}%</p>
            </div>
            <p className="text-xs text-green-700">
              Média mensal: €{AVERAGES.monthly} → Economia: €
              {(AVERAGES.monthly * (discounts.monthlyPercent / 100)).toFixed(0)}
            </p>
          </div>

          {/* Loyalty */}
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-medium text-sm text-purple-900">Desconto Fidelidade</p>
                <p className="text-xs text-purple-700 mt-1">
                  Aplicado em cascata (após desconto de volume)
                </p>
              </div>
              <p className="text-2xl font-bold text-purple-600">{discounts.loyaltyPercent}%</p>
            </div>
            <p className="text-xs text-purple-700">
              Bônus para hóspedes recorrentes
            </p>
          </div>
        </div>

        {/* Info */}
        <div className="mt-6 p-3 bg-gray-50 rounded-lg flex gap-2">
          <Info className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-gray-600">
            Os descontos são aplicados em cascata: volume primeiro, depois fidelidade
          </p>
        </div>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg w-full mx-auto">
          <DialogHeader>
            <DialogTitle>Configurar Descontos</DialogTitle>
            <DialogDescription>
              Defina as percentagens de desconto para diferentes tipos de estadia
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Weekly Discount */}
            <div className="space-y-2 p-4 bg-blue-50 rounded-lg">
              <Label htmlFor="weekly" className="text-sm font-semibold">
                Desconto Semanal (7-27 noites)
              </Label>
              <div className="flex gap-2">
                <Input
                  id="weekly"
                  type="number"
                  min="0"
                  max="100"
                  value={discounts.weeklyPercent}
                  onChange={(e) =>
                    setDiscounts({
                      ...discounts,
                      weeklyPercent: parseInt(e.target.value) || 0,
                    })
                  }
                  className="h-12 text-base flex-1"
                  placeholder="0"
                />
                <span className="flex items-center text-lg font-semibold text-blue-600">%</span>
              </div>
              <p className="text-xs text-blue-700">
                Economia: €{(AVERAGES.weekly * (discounts.weeklyPercent / 100)).toFixed(0)}
              </p>
            </div>

            {/* Monthly Discount */}
            <div className="space-y-2 p-4 bg-green-50 rounded-lg">
              <Label htmlFor="monthly" className="text-sm font-semibold">
                Desconto Mensal (28+ noites)
              </Label>
              <div className="flex gap-2">
                <Input
                  id="monthly"
                  type="number"
                  min="0"
                  max="100"
                  value={discounts.monthlyPercent}
                  onChange={(e) =>
                    setDiscounts({
                      ...discounts,
                      monthlyPercent: parseInt(e.target.value) || 0,
                    })
                  }
                  className="h-12 text-base flex-1"
                  placeholder="0"
                />
                <span className="flex items-center text-lg font-semibold text-green-600">%</span>
              </div>
              <p className="text-xs text-green-700">
                Economia: €{(AVERAGES.monthly * (discounts.monthlyPercent / 100)).toFixed(0)}
              </p>
            </div>

            {/* Loyalty Discount */}
            <div className="space-y-2 p-4 bg-purple-50 rounded-lg">
              <Label htmlFor="loyalty" className="text-sm font-semibold">
                Desconto Fidelidade (Cascata)
              </Label>
              <div className="flex gap-2">
                <Input
                  id="loyalty"
                  type="number"
                  min="0"
                  max="100"
                  value={discounts.loyaltyPercent}
                  onChange={(e) =>
                    setDiscounts({
                      ...discounts,
                      loyaltyPercent: parseInt(e.target.value) || 0,
                    })
                  }
                  className="h-12 text-base flex-1"
                  placeholder="0"
                />
                <span className="flex items-center text-lg font-semibold text-purple-600">%</span>
              </div>
              <p className="text-xs text-purple-700">
                Aplicado APÓS desconto de volume (para hóspedes recorrentes)
              </p>
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-3">
            <Button
              onClick={() => setShowDialog(false)}
              variant="outline"
              className="flex-1 h-12"
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveDiscounts}
              disabled={saving}
              className="flex-1 h-12 text-base font-semibold"
            >
              {saving ? 'Salvando...' : 'Salvar Descontos'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
