'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { PriceCard } from './PriceCard'
import { DiscountCard } from './DiscountCard'
import { AvailabilityCard } from './AvailabilityCard'
import { CancellationCard } from './CancellationCard'
import { TaxesCard } from './TaxesCard'
import { toast } from 'sonner'
import { PropertyDiscount } from '@/types/pricing.types'
import { PropertyCancellationPolicy } from '@/types/cancellation.types'
import { CURRENCIES, getCurrencySymbol, type CurrencyCode } from '@/lib/utils/currency'

type SectionName = 'prices' | 'discounts' | 'availability' | 'cancellations' | 'taxes'

interface PricingData {
  base_price: number
  weekend_price: number | null
  currency: string
}

interface SettingsSidebarProps {
  propertyId?: string
  calendarMonth?: number
  calendarYear?: number
  onUpdate?: () => Promise<void>
}

const sectionMeta: Record<SectionName, { title: string; description: string }> = {
  prices: { title: 'Preços', description: 'Estas definições aplicam-se a todas as noites, a menos que as personalize por data.' },
  discounts: { title: 'Descontos', description: 'Configure descontos para estadias semanais, mensais e promoções.' },
  availability: { title: 'Disponibilidade', description: 'Estas definições aplicam-se a todas as noites, a menos que as personalize por data.' },
  cancellations: { title: 'Cancelamentos', description: 'Defina as políticas para estadias de curta e longa duração.' },
  taxes: { title: 'Taxas', description: 'Configure limpeza, serviço e valores para hóspedes adicionais.' },
}

export function SettingsSidebar({ propertyId: propPropertyId, calendarMonth, calendarYear, onUpdate }: SettingsSidebarProps = {}) {
  const params = useParams()
  const propertyId = propPropertyId || (params?.propertyId as string | undefined)
  const [activeSection, setActiveSection] = useState<SectionName | null>(null)
  const [pricing, setPricing] = useState<PricingData | null>(null)
  const [discounts, setDiscounts] = useState<PropertyDiscount[]>([])
  const [cancellationPolicies, setCancellationPolicies] = useState<PropertyCancellationPolicy[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    if (!propertyId) return
    setLoading(true)

    try {
      const [pricingRes, discountsRes, policiesRes] = await Promise.all([
        fetch(`/api/properties/${propertyId}/pricing`, { credentials: 'include' }),
        fetch(`/api/properties/${propertyId}/discounts`, { credentials: 'include' }),
        fetch(`/api/properties/${propertyId}/cancellation-policies`, { credentials: 'include' }),
      ])

      if (pricingRes.ok) setPricing((await pricingRes.json()).data)
      if (discountsRes.ok) setDiscounts((await discountsRes.json()).data || [])
      if (policiesRes.ok) setCancellationPolicies((await policiesRes.json()).data || [])
    } catch (error) {
      console.error('Error loading settings data:', error)
    } finally {
      setLoading(false)
    }
  }, [propertyId])

  useEffect(() => { void loadData() }, [loadData])

  const handleSaveCancellationPolicy = async (policyId: string, updates: Partial<PropertyCancellationPolicy>) => {
    if (!propertyId) return

    const response = await fetch(`/api/properties/${propertyId}/cancellation-policies/${policyId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    const result = await response.json()
    if (!result.success) {
      toast.error(result.error || 'Erro ao guardar')
      throw new Error(result.error || 'Erro ao guardar')
    }
    setCancellationPolicies((policies) => policies.map((policy) => policy.id === policyId ? { ...policy, ...updates } : policy))
  }

  const weeklyDiscount = discounts.find((discount) => discount.discount_type === 'weekly')
  const monthlyDiscount = discounts.find((discount) => discount.discount_type === 'monthly')
  const shortStayPolicy = cancellationPolicies.find((policy) => !policy.is_long_stay)
  const longStayPolicy = cancellationPolicies.find((policy) => policy.is_long_stay)
  const normalizedCurrency = pricing?.currency?.toUpperCase() || 'EUR'
  const currencyCode: CurrencyCode = normalizedCurrency in CURRENCIES
    ? normalizedCurrency as CurrencyCode
    : 'EUR'
  const currencySymbol = getCurrencySymbol(currencyCode)

  const summaries: Array<{ id: SectionName; title: string; lines: string[] }> = [
    {
      id: 'prices',
      title: 'Preços',
      lines: [pricing?.base_price ? `${currencySymbol} ${pricing.base_price}${pricing.weekend_price ? ` – ${currencySymbol} ${pricing.weekend_price}` : ''} por noite` : 'Definir preço base'],
    },
    {
      id: 'discounts',
      title: 'Descontos',
      lines: [monthlyDiscount ? `Desconto mensal de ${monthlyDiscount.percentage}%` : weeklyDiscount ? `Desconto semanal de ${weeklyDiscount.percentage}%` : 'Configurar descontos'],
    },
    { id: 'availability', title: 'Disponibilidade', lines: ['Estadias e antecedência', 'Regras de preparação'] },
    {
      id: 'cancellations',
      title: 'Cancelamentos',
      lines: [shortStayPolicy?.policy_type || 'Política de curta duração', longStayPolicy?.policy_type || 'Política de longa duração'],
    },
    { id: 'taxes', title: 'Taxas', lines: ['Limpeza, serviço e hóspedes adicionais'] },
  ]

  if (loading) {
    return <div className="p-8 text-sm text-[#717171]">Carregando configurações...</div>
  }

  if (!activeSection) {
    return (
      <div className="divide-y divide-[#EBEBEB]">
        {summaries.map((summary) => (
          <button
            key={summary.id}
            type="button"
            onClick={() => setActiveSection(summary.id)}
            className="flex w-full items-center gap-4 px-7 py-7 text-left transition hover:bg-[#F7F7F7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#222222]"
          >
            <span className="min-w-0 flex-1">
              <span className="mb-2 block text-base font-semibold text-[#222222]">{summary.title}</span>
              {summary.lines.map((line) => <span key={line} className="block text-sm leading-6 text-[#717171]">{line}</span>)}
            </span>
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[#F7F7F7]">
              <ChevronRight size={19} />
            </span>
          </button>
        ))}
      </div>
    )
  }

  const meta = sectionMeta[activeSection]

  return (
    <div className="p-6 md:p-7">
      <button
        type="button"
        onClick={() => setActiveSection(null)}
        className="mb-5 flex h-11 w-11 items-center justify-center rounded-full bg-[#F7F7F7] hover:bg-[#EBEBEB]"
        aria-label="Voltar às configurações"
      >
        <ArrowLeft size={20} />
      </button>
      <h2 className="text-3xl font-semibold tracking-tight text-[#222222]">{meta.title}</h2>
      <p className="mb-7 mt-3 text-base leading-6 text-[#717171]">{meta.description}</p>

      {activeSection === 'prices' && propertyId && (
        <PriceCard
          propertyId={propertyId}
          basePrice={pricing?.base_price || null}
          weekendPrice={pricing?.weekend_price}
          currency={currencyCode}
          calendarMonth={calendarMonth}
          calendarYear={calendarYear}
          onUpdate={() => { void onUpdate?.(); void loadData() }}
        />
      )}
      {activeSection === 'discounts' && propertyId && <DiscountCard propertyId={propertyId} />}
      {activeSection === 'availability' && propertyId && <AvailabilityCard propertyId={propertyId} />}
      {activeSection === 'cancellations' && cancellationPolicies.map((policy) => (
        <CancellationCard
          key={policy.id}
          title={policy.policy_type}
          description={policy.is_long_stay ? 'Long-stay' : 'Short-stay'}
          policy={policy}
          onSave={handleSaveCancellationPolicy}
        />
      ))}
      {activeSection === 'taxes' && propertyId && <TaxesCard propertyId={propertyId} />}
    </div>
  )
}
