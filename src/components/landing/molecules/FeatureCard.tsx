import React from 'react'
import { Card } from '../atoms/Card'

interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  title,
  description,
}) => (
  <Card className="text-center hover:shadow-lg transition-shadow duration-300">
    <div className="flex justify-center mb-6">
      <div className="p-4 bg-lodgra-primary/5 rounded-full">
        {icon}
      </div>
    </div>
    <h3 className="text-xl font-poppins font-bold text-lodgra-primary mb-3">
      {title}
    </h3>
    <p className="text-gray-600 font-inter text-sm leading-relaxed">{description}</p>
  </Card>
)
