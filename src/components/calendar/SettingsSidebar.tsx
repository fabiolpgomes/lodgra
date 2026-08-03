'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { SettingsTabs } from './SettingsTabs'
import { PriceCard } from './PriceCard'
import { DiscountCard } from './DiscountCard'
import { AvailabilityCard } from './AvailabilityCard'
import { CancellationCard } from './CancellationCard'
import { TaxesCard } from './TaxesCard'
import { toast } from 'sonner'
import { PropertyDiscount } from '@/types/pricing.types'
import { PropertyCancellationPolicy } from '@/types/cancellation.types'

type TabName = 'prices' | 'discounts' | 'availability' | 'cancellations' | 'taxes'

interface PricingData {
  base_price: number
  weekend_price: number | null
}

// Average values (can be calculated from reservations in future)
const AVERAGES = {
  weekly: 894,
  monthly: 1724,
}

interface SettingsSidebarProps {
  propertyId?: string
}

export function SettingsSidebar({ propertyId: propPropertyId }: SettingsSidebarProps = {}) {
  const params = useParams()
  const propertyId = propPropertyId || (params?.propertyId as string | undefined)

  // Debug: Log if component rendered
  if (typeof window !== 'undefined') {
    console.log('SettingsSidebar rendered with propertyId:', propertyId)
  }

  const [activeTab, setActiveTab] = useState<TabName>('prices')
  const [pricing, setPricing] = useState<PricingData | null>(null)
  const [discounts, setDiscounts] = useState<PropertyDiscount[]>([])
  const [cancellationPolicies, setCancellationPolicies] = useState<PropertyCancellationPolicy[]>([])
  const [loading, setLoading] = useState(true)

  // Price editor modal state
  const [showPriceEditor, setShowPriceEditor] = useState(false)
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  const [editingPrice, setEditingPrice] = useState<number | ''>('')
  const [editorMonth, setEditorMonth] = useState(new Date())

  // Load pricing and discount data on mount
  useEffect(() => {
    if (!propertyId) return

    const loadData = async () => {
      try {
        // Fetch pricing data
        const pricingRes = await fetch(`/api/properties/${propertyId}/pricing`, {
          credentials: 'include'
        })
        if (pricingRes.ok) {
          const pricingData = await pricingRes.json()
          setPricing(pricingData.data)
        }

        // Fetch discounts
        const discountsRes = await fetch(`/api/properties/${propertyId}/discounts`, {
          credentials: 'include'
        })
        if (discountsRes.ok) {
          const discountsData = await discountsRes.json()
          setDiscounts(discountsData.data || [])
        }

        // Fetch cancellation policies
        const policiesRes = await fetch(`/api/properties/${propertyId}/cancellation-policies`, {
          credentials: 'include'
        })
        if (policiesRes.ok) {
          const policiesData = await policiesRes.json()
          setCancellationPolicies(policiesData.data || [])
        }

        setLoading(false)
      } catch (error) {
        console.error('Error loading settings data:', error)
        setLoading(false)
      }
    }

    loadData()
  }, [propertyId])


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
    <div className="settings-sidebar space-y-4 md:space-y-6 p-4 md:p-6">
      <SettingsTabs onTabChange={setActiveTab}>
        {activeTab === 'prices' && propertyId && (
          <div className="space-y-4 md:space-y-6">
            <PriceCard propertyId={propertyId} basePrice={pricing?.base_price || null} weekendPrice={pricing?.weekend_price} />
          </div>
        )}

        {activeTab === 'discounts' && propertyId && (
          <div className="space-y-4 md:space-y-6">
            <DiscountCard propertyId={propertyId} />
          </div>
        )}

        {activeTab === 'availability' && propertyId && (
          <div className="space-y-4 md:space-y-6">
            <AvailabilityCard propertyId={propertyId} />
          </div>
        )}

        {activeTab === 'cancellations' && propertyId && (
          <div className="space-y-4 md:space-y-6">
            {cancellationPolicies.map((policy) => (
              <CancellationCard
                key={policy.id}
                title={policy.policy_type}
                description={`${policy.is_long_stay ? 'Long-stay' : 'Short-stay'}`}
                policy={policy}
                onSave={handleSaveCancellationPolicy}
              />
            ))}
          </div>
        )}

        {activeTab === 'taxes' && propertyId && (
          <div className="space-y-4 md:space-y-6">
            <TaxesCard propertyId={propertyId} />
          </div>
        )}
      </SettingsTabs>
    </div>
  )
}
