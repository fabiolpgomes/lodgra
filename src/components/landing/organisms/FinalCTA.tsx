import React from 'react'
import { Container } from '../atoms/Container'
import { Button } from '../atoms/Button'

interface FinalCTAProps {
  headline: string
  subheadline: string
  ctaText: string
  note?: string
  onCta: () => void
}

export const FinalCTA: React.FC<FinalCTAProps> = ({
  headline,
  subheadline,
  ctaText,
  note,
  onCta,
}) => (
  <section className="bg-lodgra-blue py-20 md:py-32">
    <Container>
      <div className="text-center max-w-3xl mx-auto">
        <h2 className="font-poppins font-bold text-3xl md:text-4xl lg:text-5xl text-white mb-4 leading-tight">
          {headline}
        </h2>

        <p className="font-inter text-base md:text-lg text-white/85 mb-10 leading-relaxed">
          {subheadline}
        </p>

        <Button
          variant="primary"
          size="lg"
          onClick={onCta}
          className="mb-6"
        >
          {ctaText}
        </Button>

        {note && (
          <p className="text-xs md:text-sm font-inter text-white/70">
            {note}
          </p>
        )}
      </div>
    </Container>
  </section>
)
