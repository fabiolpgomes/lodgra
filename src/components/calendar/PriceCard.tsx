'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/common/ui/card'
import { Button } from '@/components/common/ui/button'
import { Input } from '@/components/common/ui/input'
import { Label } from '@/components/common/ui/label'
import { Switch } from '@/components/common/ui/switch'
import { toast } from 'sonner'
import { AlertCircle } from 'lucide-react'

interface PriceCardProps {
  propertyId: string
  basePrice: number | null
  onUpdate?: () => void
}

export function PriceCard({ propertyId, basePrice: initialPrice, onUpdate }: PriceCardProps) {
  const [basePrice, setBasePrice] = useState(initialPrice?.toString() || '')
  const [smartPricingEnabled, setSmartPricingEnabled] = useState(false)
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (initialPrice) {
      setBasePrice(initialPrice.toString())
    }
  }, [initialPrice])

  const handleFillCalendar = async () => {
    try {
      if (!basePrice || parseFloat(basePrice) <= 0) {
        toast.error('Preço base inválido')
        return
      }

      setSaving(true)

      // This endpoint would fill all empty days in the current month
      const response = await fetch(
        `/api/properties/${propertyId}/pricing/bulk-update`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            price: parseFloat(basePrice),
            mode: 'fill-empty-month',
          }),
        }
      )

      if (response.ok) {
        toast.success('Calendário preenchido com sucesso')
        onUpdate?.()
      } else {
        toast.error('Erro ao preencher calendário')
      }
    } catch (error) {
      console.error('Error filling calendar:', error)
      toast.error('Erro ao preencher calendário')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveBasePrice = async () => {
    try {
      const price = parseFloat(basePrice)
      if (isNaN(price) || price <= 0) {
        toast.error('Preço base deve ser maior que 0')
        return
      }

      setSaving(true)

      const response = await fetch(`/api/properties/${propertyId}/pricing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ basePrice: price }),
      })

      if (response.ok) {
        toast.success('Preço base atualizado')
        onUpdate?.()
      } else {
        toast.error('Erro ao salvar preço')
      }
    } catch (error) {
      console.error('Error saving price:', error)
      toast.error('Erro ao atualizar preço')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="p-4 md:p-6">
      <h3 className="text-lg font-semibold mb-6">Preços</h3>

      {/* Base Price Section */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <Label htmlFor="basePrice" className="text-sm mb-3 block">
          Preço Base por Noite
        </Label>
        <div className="flex gap-2">
          <div className="flex-1">
            <div className="relative">
              <span className="absolute left-3 top-3 text-lg font-semibold text-gray-600">
                €
              </span>
              <Input
                id="basePrice"
                type="number"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="h-12 pl-8 text-base font-semibold"
              />
            </div>
          </div>
          <Button
            onClick={handleSaveBasePrice}
            disabled={saving}
            className="h-12 px-4 font-semibold"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Usado como fallback quando não há preço customizado
        </p>
      </div>

      {/* Fill Calendar Button */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <Button
          onClick={handleFillCalendar}
          disabled={saving || !basePrice}
          variant="outline"
          className="w-full h-12 text-base font-semibold"
        >
          📅 Preencher Calendário com Preço Base
        </Button>
        <p className="text-xs text-gray-500 mt-2">
          Preenche todos os dias vazios do mês com o preço base
        </p>
      </div>

      {/* Period/Day Customization Hint */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm font-medium text-blue-900 mb-2">💡 Preços Customizados</p>
        <p className="text-xs text-blue-800">
          Clique em um dia ou selecione um período no calendário para definir preços específicos
        </p>
      </div>

      {/* Smart Pricing Section (TODO) */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex-1">
            <Label className="text-sm font-semibold mb-1 block">
              Preços Inteligentes
            </Label>
            <p className="text-xs text-gray-600">
              Ajuste automático baseado em demanda (em desenvolvimento)
            </p>
          </div>
          <Switch
            checked={smartPricingEnabled}
            onCheckedChange={setSmartPricingEnabled}
            disabled={true}
            className="ml-4"
          />
        </div>
      </div>

      {/* Smart Pricing Fields (disabled) */}
      {smartPricingEnabled && (
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <Label htmlFor="minPrice" className="text-sm mb-2 block">
              Preço Mínimo por Noite
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-lg font-semibold text-gray-400">
                €
              </span>
              <Input
                id="minPrice"
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="0.00"
                disabled={true}
                className="h-12 pl-8 text-base opacity-50"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="maxPrice" className="text-sm mb-2 block">
              Preço Máximo por Noite
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-lg font-semibold text-gray-400">
                €
              </span>
              <Input
                id="maxPrice"
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="0.00"
                disabled={true}
                className="h-12 pl-8 text-base opacity-50"
              />
            </div>
          </div>
        </div>
      )}

      {/* Info Section */}
      <div className="mt-6 p-3 bg-gray-50 rounded-lg flex gap-3">
        <AlertCircle className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-gray-600">
          <p className="font-medium mb-1">Hierarquia de Preços:</p>
          <p>
            Preços diários → Períodos configurados → Preço base
          </p>
        </div>
      </div>
    </Card>
  )
}
