'use client'

import React from 'react'
import { Container } from '../atoms/Container'
import { Button } from '../atoms/Button'
import { Logo } from '../atoms/Logo'
import { trackCTA } from '@/lib/analytics/client'

interface HeroProps {
  headline: string
  subheadline: string
  ctaPrimary: string
  ctaSecondary?: string
  onCtaPrimary: () => void
  onCtaSecondary?: () => void
}

export const Hero: React.FC<HeroProps> = ({
  headline,
  subheadline,
  ctaPrimary,
  ctaSecondary,
  onCtaPrimary,
  onCtaSecondary,
}) => (
  <section className="bg-white dark:bg-gray-950 pt-8 sm:pt-16 pb-16 sm:pb-20 md:pt-24 md:pb-32">
    <Container>
      <div className="text-center max-w-4xl mx-auto">
        {/* Logo - Clean and minimal */}
        <div className="mb-6 sm:mb-12 flex justify-center">
          <Logo size="lg" variant="dark" />
        </div>

        {/* Headline - Clean and premium */}
        <h1 className="font-poppins font-bold text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-lodgra-neutral dark:text-white mb-4 sm:mb-6 leading-tight tracking-tight">
          {headline}
        </h1>

        {/* Subheadline - Elegant and clear */}
        <p className="text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-400 leading-relaxed mb-8 sm:mb-12 max-w-3xl mx-auto font-inter font-normal px-4">
          {subheadline}
        </p>

        {/* CTA Buttons - Professional spacing */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-12 sm:mb-16 px-4">
          <Button
            size="lg"
            onClick={() => {
              trackCTA('hero_primary', 'hero')
              onCtaPrimary()
            }}
            className="px-8 py-3 text-base font-semibold"
          >
            {ctaPrimary}
          </Button>

          {ctaSecondary && (
            <Button
              variant="ghost"
              size="lg"
              onClick={onCtaSecondary}
              className="px-8 py-3 text-base font-semibold"
            >
              {ctaSecondary}
            </Button>
          )}
        </div>

        {/* Illustration - Minimal premium */}
        <div className="mt-16 w-full">
          <div className="relative overflow-hidden rounded-2xl bg-lodgra-light dark:bg-gray-800 aspect-video shadow-lg border border-lodgra-primary/10 dark:border-gray-700">
            {/* Content */}
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <svg className="w-20 h-20 text-lodgra-primary mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-3m0 0l7-4 7 4M5 9v10a1 1 0 001 1h12a1 1 0 001-1V9m-9 3l3 3m0 0l3-3m-3 3V8" />
                </svg>
                <p className="text-lodgra-primary font-inter text-sm font-medium tracking-wide">
                  Maximize Your Revenue
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Trust badge - Minimal and elegant */}
        <div className="mt-12 flex justify-center items-center gap-8 text-sm text-gray-500 dark:text-gray-400 font-inter">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-lodgra-primary" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            7 days to test
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-lodgra-primary" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Money-back guarantee
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-lodgra-primary" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Cancel anytime
          </div>
        </div>
      </div>
    </Container>
  </section>
)
