'use client'

import React from 'react'
import { Container } from '../atoms/Container'
import { PricingCard } from '../molecules/PricingCard'
import { PLAN_PRICES, type BillingCurrency, type PaidPlan } from '@/lib/billing/plans'

// Textos vêm do landing.json de cada idioma; preços vêm sempre de PLAN_PRICES.
export interface PricingTier {
  id: PaidPlan
  name: string
  description: string
  features: string[]
  isPrimary?: boolean
  badge?: string
}

interface PricingProps {
  title: string
  tiers: PricingTier[]
  period: string
  /** ex.: "+ {price}/month per additional property" */
  extraLabel: string
  currency: BillingCurrency
  locale: string
  onSelectTier: (tierId: PaidPlan) => void
}

export const Pricing: React.FC<PricingProps> = ({ title, tiers, period, extraLabel, currency, locale, onSelectTier }) => {
  const money = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  })

  return (
    <section id="pricing" className="bg-white dark:bg-dark-bg-surface py-20 md:py-32">
      <Container>
        <div className="text-center mb-16">
          <h2 className="font-poppins font-bold text-4xl md:text-5xl lg:text-6xl text-be-text mb-4 leading-tight tracking-tight">
            {title}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
          {tiers.map((tier) => {
            const price = PLAN_PRICES[tier.id][currency]
            return (
              <PricingCard
                key={tier.id}
                name={tier.name}
                price={money.format(price.monthly)}
                period={period}
                note={extraLabel.replace('{price}', money.format(price.extraProperty))}
                description={tier.description}
                features={tier.features}
                isPrimary={tier.isPrimary}
                badge={tier.badge}
                onSelect={() => onSelectTier(tier.id)}
              />
            )
          })}
        </div>
      </Container>
    </section>
  )
}
