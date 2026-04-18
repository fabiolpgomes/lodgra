import React from 'react'
import { Card } from '../atoms/Card'
import { Button } from '../atoms/Button'
import { Badge } from '../atoms/Badge'

interface PricingCardProps {
  name: string
  price: string
  period: string
  description: string
  features: string[]
  isPrimary?: boolean
  badge?: string
  onSelect: () => void
}

export const PricingCard: React.FC<PricingCardProps> = ({
  name,
  price,
  period,
  description,
  features,
  isPrimary = false,
  badge,
  onSelect,
}) => (
  <Card
    className={`
      flex flex-col h-full transition-all duration-300
      ${isPrimary ? 'border-lodgra-primary border-2 shadow-lg' : ''}
    `}
  >
    {isPrimary && (
      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
        <Badge variant="primary">{badge || 'Recommended'}</Badge>
      </div>
    )}

    <div className="mb-6">
      <h3 className="text-2xl font-poppins font-bold text-lodgra-primary mb-2">
        {name}
      </h3>
    </div>

    <div className="mb-6">
      <div className="flex items-baseline gap-1">
        <span className="text-5xl font-poppins font-bold text-lodgra-neutral">
          {price}
        </span>
        <span className="text-sm font-inter text-gray-600">{period}</span>
      </div>
    </div>

    <p className="text-gray-600 font-inter text-sm leading-relaxed mb-8">{description}</p>

    <ul className="space-y-4 mb-8 flex-grow">
      {features.map((feature, idx) => (
        <li key={idx} className="flex items-start gap-3">
          <svg className="w-5 h-5 text-lodgra-primary flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <span className="text-gray-700 font-inter text-sm">{feature}</span>
        </li>
      ))}
    </ul>

    <Button
      size="lg"
      variant={isPrimary ? 'primary' : 'secondary'}
      className="w-full"
      onClick={onSelect}
    >
      Get Started
    </Button>
  </Card>
)
