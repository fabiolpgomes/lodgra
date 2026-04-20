import React from 'react'
import { Container } from '../atoms/Container'
import { FeatureCard } from '../molecules/FeatureCard'

interface Feature {
  icon: React.ReactNode
  title: string
  description: string
}

interface FeaturesProps {
  title: string
  features: Feature[]
}

export const Features: React.FC<FeaturesProps> = ({ title, features }) => (
  <section className="bg-gray-50/50 dark:bg-gray-900/50 py-12 sm:py-20 md:py-32">
    <Container>
      <div className="text-center mb-8 sm:mb-16 px-4">
        <h2 className="font-poppins font-bold text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-lodgra-primary mb-4 leading-tight tracking-tight">
          {title}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {features.map((feature, idx) => (
          <FeatureCard
            key={idx}
            icon={feature.icon}
            title={feature.title}
            description={feature.description}
          />
        ))}
      </div>
    </Container>
  </section>
)
