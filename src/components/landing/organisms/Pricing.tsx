'use client'

import React, { useState } from 'react'
import { Container } from '../atoms/Container'
import { PricingCard } from '../molecules/PricingCard'

export interface PricingTier {
  id: string
  name: string
  price: string
  period: string
  description: string
  features: string[]
  isPrimary?: boolean
  badge?: string
}

interface PricingProps {
  title: string
  tiers: PricingTier[]
  currencySymbol?: string
  onSelectTier: (tierId: string) => void
}

export const Pricing: React.FC<PricingProps> = ({
  title,
  tiers,
  currencySymbol = '$',
  onSelectTier,
}) => {
  return (
    <section className="bg-white dark:bg-gray-950 py-20 md:py-32">
      <Container>
        <div className="text-center mb-16">
          <h2 className="font-poppins font-bold text-4xl md:text-5xl lg:text-6xl text-lodgra-primary mb-4 leading-tight tracking-tight">
            {title}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {tiers.map((tier) => (
            <PricingCard
              key={tier.id}
              name={tier.name}
              price={tier.price}
              period={tier.period}
              description={tier.description}
              features={tier.features}
              isPrimary={tier.isPrimary}
              badge={tier.badge}
              onSelect={() => onSelectTier(tier.id)}
            />
          ))}
        </div>
      </Container>
    </section>
  )
}
