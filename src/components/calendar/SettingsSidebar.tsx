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
import { PropertyCancellationPolicy, CancellationPolicyType } from '@/types/cancellation.types'
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

const cancellationPolicyLabels: Record<CancellationPolicyType, string> = {
  flexible: 'Flexível',
  moderate: 'Moderada',
  limited: 'Limitada',
  firm: 'Firme',
  rigid: 'Rígida de longa duração',
}

function getCancellationPolicyLabel(policy: PropertyCancellationPolicy): string {
  if (policy.policy_type === 'rigid' && !policy.is_long_stay) return 'Opção não reembolsável'
  return cancellationPolicyLabels[policy.policy_type]
}

const cancellationPolicyDescriptions: Record<CancellationPolicyType, string> = {
  flexible: 'Reembolso integral até 1 dia antes do check-in',
  moderate: 'Reembolso integral até 5 dias antes do check-in',
  limited: 'Reembolso integral até 14 dias antes do check-in',
  firm: 'Reembolso total pelo menos 30 dias antes do check-in',
  rigid: 'Opção não reembolsável',
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
      if (policiesRes.ok) {
        const policiesPayload = await policiesRes.json()
        let policies = policiesPayload.data || []

        // Policies are property-scoped. Seed the Airbnb-compatible defaults on
        // first use so the cancellation card is useful immediately after a
        // property is created.
        if (policies.length === 0) {
          const seedResponse = await fetch(`/api/properties/${propertyId}/cancellation-policies`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ action: 'seed' }),
          })

          if (seedResponse.ok) {
            const seededPayload = await seedResponse.json()
            policies = seededPayload.data || []
          }
        }

        setCancellationPolicies(policies)
      }
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
  const loyaltyDiscount = discounts.find((discount) => discount.discount_type === 'excellent_guest')
  const activeDiscountLines = [
    weeklyDiscount && Number(weeklyDiscount.percentage) > 0
      ? `Desconto semanal de ${weeklyDiscount.percentage}%`
      : null,
    monthlyDiscount && Number(monthlyDiscount.percentage) > 0
      ? `Desconto mensal de ${monthlyDiscount.percentage}%`
      : null,
    loyaltyDiscount && Number(loyaltyDiscount.percentage) > 0
      ? `Desconto fidelidade de ${loyaltyDiscount.percentage}%`
      : null,
  ].filter((line): line is string => line !== null)
  const shortStayPolicy = cancellationPolicies.find((policy) => !policy.is_long_stay)
  const longStayPolicy = cancellationPolicies.find((policy) => policy.is_long_stay)
  const normalizedCurrency = pricing?.currency?.toUpperCase() ?? null
  const currencyCode: CurrencyCode | null = normalizedCurrency && normalizedCurrency in CURRENCIES
    ? normalizedCurrency as CurrencyCode
    : null
  const currencySymbol = currencyCode ? getCurrencySymbol(currencyCode) : ''

  const summaries: Array<{ id: SectionName; title: string; lines: string[] }> = [
    {
      id: 'prices',
      title: 'Preços',
      lines: [pricing?.base_price
        ? `${currencySymbol ? `${currencySymbol} ` : ''}${pricing.base_price}${pricing.weekend_price ? ` – ${currencySymbol ? `${currencySymbol} ` : ''}${pricing.weekend_price}` : ''} por noite`
        : 'Definir preço base'],
    },
    {
      id: 'discounts',
      title: 'Descontos',
      lines: activeDiscountLines.length > 0 ? activeDiscountLines : ['Nenhum desconto ativo'],
    },
    { id: 'availability', title: 'Disponibilidade', lines: ['Estadias e antecedência', 'Regras de preparação'] },
    {
      id: 'cancellations',
      title: 'Cancelamentos',
      lines: [
        shortStayPolicy
          ? `Curta duração: ${getCancellationPolicyLabel(shortStayPolicy)}`
          : 'Definir política de curta duração',
        longStayPolicy
          ? `Longa duração: ${getCancellationPolicyLabel(longStayPolicy)}`
          : 'Definir política de longa duração',
      ],
    },
    { id: 'taxes', title: 'Taxas', lines: ['Limpeza, serviço e hóspedes adicionais'] },
  ]

  if (loading) {
    return <div className="px-4 py-5 text-sm text-[#717171] sm:p-8">Carregando configurações...</div>
  }

  if (!activeSection) {
    return (
      <div className="divide-y divide-[#EBEBEB]">
        {summaries.map((summary) => (
          <button
            key={summary.id}
            type="button"
            onClick={() => setActiveSection(summary.id)}
            className="flex w-full items-center gap-3 px-4 py-5 text-left transition hover:bg-[#F7F7F7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#222222] sm:gap-4 sm:px-7 sm:py-7"
          >
            <span className="min-w-0 flex-1">
              <span className="mb-1.5 block text-sm font-semibold text-[#222222] sm:mb-2 sm:text-base">
                {summary.title}
              </span>
              {summary.lines.map((line) => <span key={line} className="block text-xs leading-5 text-[#717171] sm:text-sm sm:leading-6">{line}</span>)}
            </span>
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[#F7F7F7] sm:h-10 sm:w-10">
              <ChevronRight size={19} />
            </span>
          </button>
        ))}
      </div>
    )
  }

  const meta = sectionMeta[activeSection]

  return (
    <div className="px-4 py-5 sm:p-6 md:p-7">
      <button
        type="button"
        onClick={() => setActiveSection(null)}
        className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-[#F7F7F7] hover:bg-[#EBEBEB] sm:mb-5"
        aria-label="Voltar às configurações"
      >
        <ArrowLeft size={20} />
      </button>
      <h2 className="text-2xl font-semibold tracking-tight text-[#222222] sm:text-3xl">{meta.title}</h2>
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
      {activeSection === 'discounts' && propertyId && (
        <DiscountCard
          propertyId={propertyId}
          currency={currencyCode}
          onUpdate={() => { void onUpdate?.(); void loadData() }}
        />
      )}
      {activeSection === 'availability' && propertyId && <AvailabilityCard propertyId={propertyId} />}
      {activeSection === 'cancellations' && (
        <div className="space-y-7">
          {(['short', 'long'] as const).map((duration) => {
            const isLongStay = duration === 'long'
            const policies = cancellationPolicies.filter((policy) => policy.is_long_stay === isLongStay)

            return (
              <section key={duration} aria-labelledby={`${duration}-stay-policies`}>
                <h3 id={`${duration}-stay-policies`} className="mb-3 text-lg font-semibold text-[#222222]">
                  {isLongStay ? 'Estadias de longa duração' : 'Estadias de curta duração'}
                </h3>
                <p className="mb-3 text-sm text-[#717171]">
                  {isLongStay ? '28 noites ou mais' : 'Menos de 28 noites'}
                </p>
                <div className="space-y-3">
                  {policies.map((policy) => (
                    <CancellationCard
                      key={policy.id}
                      title={getCancellationPolicyLabel(policy)}
                      description={cancellationPolicyDescriptions[policy.policy_type]}
                      policy={policy}
                      onSave={handleSaveCancellationPolicy}
                    />
                  ))}
                </div>
              </section>
            )
          })}
          {cancellationPolicies.length === 0 && (
            <p className="text-sm text-[#717171]">Não foi possível carregar as políticas de cancelamento.</p>
          )}
        </div>
      )}
      {activeSection === 'taxes' && propertyId && <TaxesCard propertyId={propertyId} />}
    </div>
  )
}
