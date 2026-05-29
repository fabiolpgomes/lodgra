import React from 'react'

export function TemplateHero({
  headline,
  subtitle,
  description,
  heroImageUrl,
  templateType,
}: {
  headline: string
  subtitle?: string | null
  description?: string | null
  heroImageUrl?: string | null
  templateType: 'standard' | 'luxury' | 'budget'
}) {
  return React.createElement('div', { className: 'template-hero' }, headline)
}
