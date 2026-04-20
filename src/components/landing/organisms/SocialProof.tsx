'use client'

import { Quote } from 'lucide-react'
import { Container } from '../atoms/Container'

interface SocialProofProps {
  stats: Array<{ value: string; label: string; color?: string }>
  trustedByTitle: string
  testimonialsTitle: string
  testimonials: Array<{ quote: string; author: string; role: string; properties: string }>
  trustBadges: string[]
}

export const SocialProof: React.FC<SocialProofProps> = ({
  stats,
  trustedByTitle,
  testimonialsTitle,
  testimonials,
  trustBadges,
}) => {
  const propertyLogos = [
    '🏠 Modern Lisbon', '🌴 Beach Resort', '🏘️ City Center', '🏡 Countryside',
    '🌃 Urban Loft', '⛱️ Coastal Villa', '🏨 Boutique Stays', '🌲 Mountain Lodge',
  ]

  return (
    <section className="py-20 bg-white dark:bg-gray-950 border-y border-gray-200 dark:border-gray-800">
      <Container>
        {/* Stats */}
        <div className="mb-16 grid grid-cols-2 md:grid-cols-3 gap-8 text-center">
          {stats.map((stat, i) => (
            <div key={i}>
              <div className={`text-4xl sm:text-5xl font-bold mb-2 ${stat.color ?? 'text-lodgra-primary'}`}>
                {stat.value}
              </div>
              <p className="text-gray-600 dark:text-gray-400">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 my-16" />

        {/* Property logos */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-8">
            {trustedByTitle}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {propertyLogos.map((logo, i) => (
              <div
                key={i}
                className="flex items-center justify-center p-6 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-lodgra-primary dark:hover:border-lodgra-primary hover:shadow-md transition-all bg-gray-50 dark:bg-gray-900"
              >
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">{logo}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 my-16" />

        {/* Testimonials */}
        <div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-12">
            {testimonialsTitle}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <div
                key={i}
                className="relative p-8 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-lodgra-primary/50 bg-gray-50 dark:bg-gray-900 transition-all hover:shadow-lg"
              >
                <Quote className="h-6 w-6 text-lodgra-gold mb-4 opacity-50" />
                <p className="text-gray-700 dark:text-gray-300 mb-6 italic leading-relaxed">
                  &quot;{t.quote}&quot;
                </p>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">{t.author}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{t.role}</div>
                  <div className="text-xs text-lodgra-primary font-medium mt-2">{t.properties}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trust badges */}
        <div className="mt-16 flex flex-col sm:flex-row justify-center items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
          {trustBadges.map((badge, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span className="hidden sm:inline mr-6">•</span>}
              {badge}
            </span>
          ))}
        </div>
      </Container>
    </section>
  )
}

// needed for React import
import React from 'react'
