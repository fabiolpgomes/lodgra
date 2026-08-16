'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/common/ui/card'
import { Button } from '@/components/common/ui/button'
import { Input } from '@/components/common/ui/input'
import { Label } from '@/components/common/ui/label'
import { Switch } from '@/components/common/ui/switch'
import { toast } from 'sonner'
import { AlertCircle } from 'lucide-react'
import { getCurrencySymbol, type CurrencyCode } from '@/lib/utils/currency'

interface PriceCardProps {
  propertyId: string
  basePrice: number | null
  weekendPrice?: number | null
  currency?: CurrencyCode
  onUpdate?: () => void
  calendarMonth?: number
  calendarYear?: number
}

function PriceCardComponent({ propertyId, basePrice: initialPrice, weekendPrice: initialWeekendPrice, currency = 'EUR', onUpdate, calendarMonth, calendarYear }: PriceCardProps) {
  const [basePrice, setBasePrice] = useState(initialPrice?.toString() || '')
  const [weekendPrice, setWeekendPrice] = useState(initialWeekendPrice?.toString() || '')
  const [smartPricingEnabled, setSmartPricingEnabled] = useState(false)
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [saving, setSaving] = useState(false)
  const currencySymbol = getCurrencySymbol(currency)

  useEffect(() => {
    if (initialPrice) {
      setBasePrice(initialPrice.toString())
    }
    if (initialWeekendPrice) {
      setWeekendPrice(initialWeekendPrice.toString())
    }
  }, [initialPrice, initialWeekendPrice])

  const handleFillCalendar = async () => {
    try {
      if (!basePrice || parseFloat(basePrice) <= 0) {
        toast.error('Preço base deve ser maior que 0')
        return
      }

      setSaving(true)

      // Get first and last day of current month
      const today = new Date()
      const year = calendarYear ?? today.getFullYear()
      const month = calendarMonth ?? today.getMonth()
      const firstDay = new Date(year, month, 1)
      const lastDay = new Date(year, month + 1, 0)

      const formatLocalDate = (date: Date) => {
        const localYear = date.getFullYear()
        const localMonth = String(date.getMonth() + 1).padStart(2, '0')
        const localDay = String(date.getDate()).padStart(2, '0')
        return `${localYear}-${localMonth}-${localDay}`
      }
      const startDate = formatLocalDate(firstDay)
      const endDate = formatLocalDate(lastDay)

      console.log('[DEBUG] Filling calendar:', {
        propertyId,
        startDate,
        endDate,
        price: parseFloat(basePrice),
      })

      const response = await fetch(
        `/api/properties/${propertyId}/pricing/bulk-update`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startDate,
            endDate,
            price: parseFloat(basePrice),
          }),
          credentials: 'include',
        }
      )

      if (response.ok) {
        toast.success(`Calendário preenchido: ${startDate} até ${endDate}`)
        onUpdate?.()
      } else {
        const error = await response.json()
        console.error('[ERROR] Fill calendar error:', error)
        toast.error(error?.error || 'Erro ao preencher calendário')
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
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base_price: price }),
        credentials: 'include',
      })

      if (response.ok) {
        toast.success('Preço base atualizado ✓')
        onUpdate?.()
      } else {
        const error = await response.json()
        console.error('API error:', error)
        toast.error(error?.error || `Erro ao salvar (${response.status})`)
      }
    } catch (error) {
      console.error('Error saving price:', error)
      toast.error('Conexão falhou - tente novamente')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveWeekendPrice = async () => {
    try {
      const price = weekendPrice ? parseFloat(weekendPrice) : null

      if (price !== null && (isNaN(price) || price < 0)) {
        toast.error('Preço fim de semana deve ser válido')
        return
      }

      if (price !== null && basePrice && price < parseFloat(basePrice)) {
        toast.error('Preço fim de semana deve ser >= preço base')
        return
      }

      if (!basePrice || parseFloat(basePrice) <= 0) {
        toast.error('Preço base é obrigatório')
        return
      }

      setSaving(true)

      const response = await fetch(`/api/properties/${propertyId}/pricing`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_price: parseFloat(basePrice),
          weekend_price: price
        }),
        credentials: 'include',
      })

      if (response.ok) {
        toast.success('Preço fim de semana atualizado ✓')
        onUpdate?.()
      } else {
        const error = await response.json()
        console.error('API error:', error)
        toast.error(error?.error || `Erro ao salvar (${response.status})`)
      }
    } catch (error) {
      console.error('Error saving weekend price:', error)
      toast.error('Conexão falhou - tente novamente')
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
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base font-semibold text-[#4D5566] pointer-events-none">
                {currencySymbol}
              </span>
              <Input
                id="basePrice"
                type="number"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="h-12 pl-10 pr-4 text-base font-semibold border-[#E5DFD2] bg-[#FBFAF6] text-[#1B2430]" style={{ paddingLeft: '3rem' }}
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

      {/* Weekend Price Section */}
      <div className="pb-6 border-b border-[#E5DFD2]">
        <Label htmlFor="weekendPrice" className="text-sm font-semibold text-[#1B2430] mb-3 block">
          Preço Fim de Semana (Sab-Dom)
        </Label>
        <div className="flex gap-3">
          <div className="flex-1">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base font-semibold text-[#4D5566] pointer-events-none">
                {currencySymbol}
              </span>
              <Input
                id="weekendPrice"
                type="number"
                value={weekendPrice}
                onChange={(e) => setWeekendPrice(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="h-12 pl-10 pr-4 text-base font-semibold border-[#E5DFD2] bg-[#FBFAF6] text-[#1B2430]" style={{ paddingLeft: '3rem' }}
              />
            </div>
          </div>
          <Button
            onClick={handleSaveWeekendPrice}
            disabled={saving}
            className="h-12 px-6 font-semibold bg-[#10203E] hover:bg-[#0c1830] text-white"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
        <p className="text-xs text-[#4D5566] mt-2">
          Deixe em branco para usar o preço base
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
                {currencySymbol}
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
                {currencySymbol}
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
          <p>Preços diários → Fim de semana → Períodos configurados → Preço base</p>
        </div>
      </div>
    </div>
  )
}

export const PriceCard = React.memo(PriceCardComponent, (prev, next) => {
  // Shallow comparison: re-render if any prop changed
  return prev.propertyId === next.propertyId &&
    prev.basePrice === next.basePrice &&
    prev.weekendPrice === next.weekendPrice &&
    prev.currency === next.currency &&
    prev.calendarMonth === next.calendarMonth &&
    prev.calendarYear === next.calendarYear
})
