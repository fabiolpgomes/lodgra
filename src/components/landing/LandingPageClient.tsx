'use client'

import React, { useCallback } from 'react'
import { Navbar } from './organisms/Navbar'
import { Hero } from './organisms/Hero'
import { ValueProposition } from './organisms/ValueProposition'
import { Features } from './organisms/Features'
import { Pricing, type PricingTier } from './organisms/Pricing'
import { FAQ } from './organisms/FAQ'
import { FinalCTA } from './organisms/FinalCTA'
import { Footer } from './organisms/Footer'

interface LandingPageClientProps {
  locale: 'pt-BR' | 'en-US' | 'es'
  content: {
    hero: {
      headline: string
      subheadline: string
      ctaPrimary: string
      ctaSecondary: string
    }
    valueProposition: {
      title: string
      description: string
      bullets: string[]
    }
    features: {
      title: string
      items: Array<{
        icon: string
        title: string
        description: string
      }>
    }
    pricing: {
      title: string
      tiers: PricingTier[]
    }
    faq: {
      title: string
      questions: Array<{
        question: string
        answer: string
      }>
    }
    finalCta: {
      headline: string
      subheadline: string
      ctaText: string
      note: string
    }
    footer: {
      copyright: string
      productLinks: Array<{ label: string; href: string }>
      companyLinks: Array<{ label: string; href: string }>
      supportLinks: Array<{ label: string; href: string }>
      legalLinks: Array<{ label: string; href: string }>
    }
  }
}

export const LandingPageClient: React.FC<LandingPageClientProps> = ({
  locale,
  content,
}) => {
  const handleCtaPrimary = useCallback(() => {
    window.location.href = '/signup?plan=free'
  }, [])

  const handleCtaSecondary = useCallback(() => {
    const videoSection = document.getElementById('demo-video')
    videoSection?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const handleSelectPricing = useCallback((tierId: string) => {
    window.location.href = `/signup?plan=${tierId}`
  }, [])

  const handleFinalCta = useCallback(() => {
    window.location.href = '/signup?plan=free'
  }, [])

  const handleLocaleChange = useCallback((newLocale: 'pt-BR' | 'en-US' | 'es') => {
    const params = new URLSearchParams(window.location.search)
    params.set('locale', newLocale)
    window.location.href = `/landing?${params.toString()}`
  }, [])

  return (
    <>
      <Navbar locale={locale} onLocaleChange={handleLocaleChange} />
      <Hero
        headline={content.hero.headline}
        subheadline={content.hero.subheadline}
        ctaPrimary={content.hero.ctaPrimary}
        ctaSecondary={content.hero.ctaSecondary}
        onCtaPrimary={handleCtaPrimary}
        onCtaSecondary={handleCtaSecondary}
      />

      <ValueProposition
        title={content.valueProposition.title}
        description={content.valueProposition.description}
        bullets={content.valueProposition.bullets}
      />

      <Features
        title={content.features.title}
        features={content.features.items.map((item) => ({
          ...item,
          icon: getIconComponent(item.icon),
        }))}
      />

      <Pricing
        title={content.pricing.title}
        tiers={content.pricing.tiers}
        onSelectTier={handleSelectPricing}
      />

      <FAQ
        title={content.faq.title}
        questions={content.faq.questions}
      />

      <FinalCTA
        headline={content.finalCta.headline}
        subheadline={content.finalCta.subheadline}
        ctaText={content.finalCta.ctaText}
        note={content.finalCta.note}
        onCta={handleFinalCta}
      />

      <Footer
        copyright={content.footer.copyright}
        productLinks={content.footer.productLinks}
        companyLinks={content.footer.companyLinks}
        supportLinks={content.footer.supportLinks}
        legalLinks={content.footer.legalLinks}
      />
    </>
  )
}

function getIconComponent(icon: string): React.ReactNode {
  const iconMap: Record<string, React.ReactNode> = {
    'pricing': (
      <svg className="w-12 h-12 text-lodgra-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    'calendar': (
      <svg className="w-12 h-12 text-lodgra-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    'revenue': (
      <svg className="w-12 h-12 text-lodgra-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    'reports': (
      <svg className="w-12 h-12 text-lodgra-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    'compliance': (
      <svg className="w-12 h-12 text-lodgra-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    'support': (
      <svg className="w-12 h-12 text-lodgra-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  }
  return <div className="flex justify-center">{iconMap[icon] || <div className="w-12 h-12" />}</div>
}
