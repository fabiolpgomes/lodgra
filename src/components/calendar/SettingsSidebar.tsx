'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { SettingsTabs } from './SettingsTabs'
import { PriceCard } from './PriceCard'
import { DiscountCard } from './DiscountCard'
import { AvailabilityCard } from './AvailabilityCard'
import { CancellationCard } from './CancellationCard'
import { toast } from 'sonner'
import { PropertyDiscount } from '@/types/pricing.types'
import { PropertyCancellationPolicy } from '@/types/cancellation.types'

type TabName = 'prices' | 'discounts' | 'availability' | 'cancellations'

interface PricingData {
  base_price: number
  weekend_price: number | null
}

// Average values (can be calculated from reservations in future)
const AVERAGES = {
  weekly: 894,
  monthly: 1724,
}

export function SettingsSidebar() {
  const params = useParams()
  const propertyId = params?.id as string | undefined

  const [activeTab, setActiveTab] = useState<TabName>('prices')
  const [pricing, setPricing] = useState<PricingData | null>(null)
  const [discounts, setDiscounts] = useState<PropertyDiscount[]>([])
  const [cancellationPolicies, setCancellationPolicies] = useState<PropertyCancellationPolicy[]>([])
  const [loading, setLoading] = useState(true)
  const [smartPricingEnabled, setSmartPricingEnabled] = useState(false)

  // Load pricing and discount data on mount
  useEffect(() => {
    if (!propertyId) return

    const loadData = async () => {
      try {
        const [pricingRes, discountsRes, policiesRes] = await Promise.all([
          fetch(`/api/properties/${propertyId}/pricing`),
          fetch(`/api/properties/${propertyId}/discounts`),
          fetch(`/api/properties/${propertyId}/cancellation-policies`),
        ])

        const pricingResult = await pricingRes.json()
        const discountsResult = await discountsRes.json()
        const policiesResult = await policiesRes.json()

        if (pricingResult.success) {
          setPricing(pricingResult.data)
        }

        if (discountsResult.success && discountsResult.data) {
          setDiscounts(discountsResult.data)
        }

        if (policiesResult.success && policiesResult.data) {
          setCancellationPolicies(policiesResult.data)
        }
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [propertyId])

  const handleSaveBasePrice = async (value: number) => {
    if (!propertyId || !pricing) return

    try {
      const response = await fetch(`/api/properties/${propertyId}/pricing`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_price: value,
          weekend_price: pricing.weekend_price,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setPricing(result.data)
        toast.success('Preço base atualizado')
      } else {
        toast.error(result.error || 'Erro ao guardar')
      }
    } catch (error) {
      console.error('Error saving base price:', error)
      toast.error('Erro ao guardar preço')
      throw error
    }
  }

  const handleSaveWeekendPrice = async (value: number) => {
    if (!propertyId || !pricing) return

    try {
      const response = await fetch(`/api/properties/${propertyId}/pricing`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_price: pricing.base_price,
          weekend_price: value,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setPricing(result.data)
        toast.success('Preço de fim de semana atualizado')
      } else {
        toast.error(result.error || 'Erro ao guardar')
      }
    } catch (error) {
      console.error('Error saving weekend price:', error)
      toast.error('Erro ao guardar preço')
      throw error
    }
  }

  const handleToggleSmartPricing = () => {
    setSmartPricingEnabled(!smartPricingEnabled)
  }

  const handleSaveCancellationPolicy = async (policyId: string, updates: Partial<PropertyCancellationPolicy>) => {
    if (!propertyId) return

    try {
      const response = await fetch(`/api/properties/${propertyId}/cancellation-policies/${policyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      const result = await response.json()

      if (result.success) {
        setCancellationPolicies(
          cancellationPolicies.map((p) =>
            p.id === policyId ? { ...p, ...updates } : p
          )
        )
      } else {
        toast.error(result.error || 'Erro ao guardar')
      }
    } catch (error) {
      console.error('Error saving cancellation policy:', error)
      toast.error('Erro ao guardar política de cancelamento')
      throw error
    }
  }

  const handleSaveDiscount = async (discountId: string, percentage: number) => {
    if (!propertyId) return

    try {
      const response = await fetch(`/api/properties/${propertyId}/discounts/${discountId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ percentage }),
      })

      const result = await response.json()

      if (result.success) {
        setDiscounts(
          discounts.map((d) =>
            d.id === discountId ? { ...d, percentage } : d
          )
        )
        toast.success('Desconto atualizado')
      } else {
        toast.error(result.error || 'Erro ao guardar')
      }
    } catch (error) {
      console.error('Error saving discount:', error)
      toast.error('Erro ao guardar desconto')
      throw error
    }
  }

  if (loading) {
    return <div className="settings-sidebar">Carregando...</div>
  }

  if (!pricing) {
    return <div className="settings-sidebar">Erro ao carregar preços</div>
  }

  return (
    <div className="settings-sidebar">
      <SettingsTabs onTabChange={setActiveTab}>
        {activeTab === 'prices' && (
          <>
            <PriceCard
              title="Preço básico"
              value={pricing.base_price}
              action="edit"
              onSave={handleSaveBasePrice}
              editableValue={pricing.base_price}
            />
            {pricing.weekend_price && (
              <PriceCard
                title="Preço de fim de semana"
                value={pricing.weekend_price}
                action="edit"
                onSave={handleSaveWeekendPrice}
                editableValue={pricing.weekend_price}
              />
            )}
            <PriceCard
              title="Preço Inteligente"
              value={smartPricingEnabled ? 'Ativado' : 'Desativado'}
              action="toggle"
              onAction={handleToggleSmartPricing}
              isActive={smartPricingEnabled}
            />
          </>
        )}

        {activeTab === 'discounts' && (
          <>
            {discounts.map((discount) => {
              let title = ''
              let condition = ''
              let averageValue = 0

              if (discount.discount_type === 'weekly') {
                title = 'Por semana'
                condition = '7 ou mais noites'
                averageValue = AVERAGES.weekly
              } else if (discount.discount_type === 'monthly') {
                title = 'Por mês'
                condition = '28 ou mais noites'
                averageValue = AVERAGES.monthly
              } else if (discount.discount_type === 'excellent_guest') {
                title = 'Hóspedes com avaliações excelentes'
                condition = 'Nota 4.8+'
                averageValue = 0
              }

              return (
                <DiscountCard
                  key={discount.id}
                  title={title}
                  condition={condition}
                  discountPercent={discount.percentage}
                  averageValue={averageValue}
                  discountId={discount.id}
                  onSave={(percentage) =>
                    handleSaveDiscount(discount.id, percentage)
                  }
                />
              )
            })}
          </>
        )}

        {activeTab === 'availability' && (
          <>
            <AvailabilityCard
              title="Número mínimo de noites"
              value={1}
              onEdit={() => {}}
            />
            <AvailabilityCard
              title="Número máximo de noites"
              value={365}
              onEdit={() => {}}
            />
            <AvailabilityCard
              title="Tempo de antecedência"
              value="Mesmo dia"
              onEdit={() => {}}
            />
            <AvailabilityCard
              title="Aviso prévio"
              value="00:00"
              onEdit={() => {}}
            />
            <AvailabilityCard
              title="Tempo de preparação"
              value="Nenhum"
              onEdit={() => {}}
            />
          </>
        )}

        {activeTab === 'cancellations' && (
          <>
            {cancellationPolicies.map((policy) => {
              let title = ''
              let description = ''

              if (policy.policy_type === 'flexible') {
                title = 'Flexível'
                description = policy.is_long_stay
                  ? 'Reembolso total até 1 dia antes (long-stay)'
                  : 'Reembolso total até 1 dia antes'
              } else if (policy.policy_type === 'moderate') {
                title = 'Moderada'
                description = policy.is_long_stay
                  ? 'Reembolso total até 5 dias antes (long-stay)'
                  : 'Reembolso total até 5 dias antes'
              } else if (policy.policy_type === 'limited') {
                title = 'Limitada'
                description = policy.is_long_stay
                  ? 'Reembolso total até 14 dias antes (long-stay)'
                  : 'Reembolso total até 14 dias antes'
              } else if (policy.policy_type === 'firm') {
                title = 'Firme'
                description = policy.is_long_stay
                  ? 'Reembolso total até 30 dias antes (long-stay)'
                  : 'Reembolso total até 30 dias antes'
              } else if (policy.policy_type === 'rigid') {
                title = 'Rígida'
                description = 'Não-reembolsável (long-stay)'
              }

              return (
                <CancellationCard
                  key={policy.id}
                  title={title}
                  description={description}
                  policy={policy}
                  onSave={handleSaveCancellationPolicy}
                />
              )
            })}
          </>
        )}
      </SettingsTabs>
    </div>
  )
}
