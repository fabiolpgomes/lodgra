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
    <div className="space-y-6">
      {/* Base Price Section */}
      <div className="pb-6 border-b border-[#E5DFD2]">
        <Label htmlFor="basePrice" className="text-sm font-semibold text-[#1B2430] mb-3 block">
          Preço Base por Noite
        </Label>
        <div className="flex gap-3">
          <div className="flex-1">
            <div className="relative">
              <span className="absolute left-3 top-3 text-lg font-semibold text-[#4D5566]">
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
                className="h-12 pl-8 text-base font-semibold border-[#E5DFD2] bg-[#FBFAF6] text-[#1B2430]"
              />
            </div>
          </div>
          <Button
            onClick={handleSaveBasePrice}
            disabled={saving}
            className="h-12 px-6 font-semibold bg-[#10203E] hover:bg-[#0c1830] text-white"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
        <p className="text-xs text-[#4D5566] mt-2">
          Usado como fallback quando não há preço customizado
        </p>
      </div>

      {/* Fill Calendar Button */}
      <div className="pb-6 border-b border-[#E5DFD2]">
        <Button
          onClick={handleFillCalendar}
          disabled={saving || !basePrice}
          className="w-full h-12 text-base font-semibold border-[#E5DFD2] border bg-white text-[#1B2430] hover:bg-[#F7F5EF]"
        >
          📅 Preencher Calendário com Preço Base
        </Button>
        <p className="text-xs text-[#4D5566] mt-2">
          Preenche todos os dias vazios do mês com o preço base
        </p>
      </div>

      {/* Period/Day Customization Hint */}
      <div className="p-4 bg-[#FBFAF6] rounded-lg border border-[#E5DFD2]">
        <p className="text-sm font-semibold text-[#1B2430] mb-2">💡 Preços Customizados</p>
        <p className="text-xs text-[#4D5566]">
          Clique em um dia ou selecione um período no calendário para definir preços específicos
        </p>
      </div>

      {/* Smart Pricing Section */}
      <div className="pb-6 border-b border-[#E5DFD2]">
        <div className="flex items-center justify-between p-4 bg-[#FBFAF6] rounded-lg border border-[#E5DFD2]">
          <div className="flex-1">
            <Label className="text-sm font-semibold text-[#1B2430] mb-1 block">
              Preços Inteligentes
            </Label>
            <p className="text-xs text-[#4D5566]">
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
        <div className="space-y-4 p-4 bg-[#F7F5EF] rounded-lg">
          <div>
            <Label htmlFor="minPrice" className="text-sm font-semibold text-[#1B2430] mb-2 block">
              Preço Mínimo por Noite
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-lg font-semibold text-[#4D5566]">
                €
              </span>
              <Input
                id="minPrice"
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="0.00"
                disabled={true}
                className="h-12 pl-8 text-base opacity-50 border-[#E5DFD2] bg-[#FBFAF6]"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="maxPrice" className="text-sm font-semibold text-[#1B2430] mb-2 block">
              Preço Máximo por Noite
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-lg font-semibold text-[#4D5566]">
                €
              </span>
              <Input
                id="maxPrice"
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="0.00"
                disabled={true}
                className="h-12 pl-8 text-base opacity-50 border-[#E5DFD2] bg-[#FBFAF6]"
              />
            </div>
          </div>
        </div>
      )}

      {/* Info Section */}
      <div className="mt-6 p-3 bg-[#F7F5EF] rounded-lg flex gap-3 border border-[#E5DFD2]">
        <AlertCircle className="w-5 h-5 text-[#1B2430] flex-shrink-0 mt-0.5" />
        <div className="text-xs text-[#4D5566]">
          <p className="font-semibold text-[#1B2430] mb-1">Hierarquia de Preços:</p>
          <p>Preços diários → Períodos configurados → Preço base</p>
        </div>
      </div>
    </div>
  )
}
