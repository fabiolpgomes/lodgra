'use client'

import Image from 'next/image'
import { useMemo } from 'react'
import remarkGfm from 'remark-gfm'
import ReactMarkdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'

interface TemplateHeroProps {
  headline: string
  subtitle?: string | null
  description?: string | null
  heroImageUrl?: string | null
  templateType: 'standard' | 'luxury' | 'budget'
}

export function TemplateHero({
  headline,
  subtitle,
  description,
  heroImageUrl,
  templateType,
}: TemplateHeroProps) {
  const heroClass = useMemo(() => {
    return {
      standard: 'py-12 px-4 sm:px-6 lg:px-8',
      luxury: 'py-20 px-6 sm:px-8 lg:px-12',
      budget: 'py-8 px-4 sm:px-6',
    }[templateType]
  }, [templateType])

  const headlineClass = useMemo(() => {
    return {
      standard: 'text-4xl font-bold',
      luxury: 'text-5xl font-light tracking-wide',
      budget: 'text-3xl font-bold',
    }[templateType]
  }, [templateType])

  const subtitleClass = useMemo(() => {
    return {
      standard: 'text-lg text-gray-600 mt-2',
      luxury: 'text-xl text-gray-600 mt-4 font-light',
      budget: 'text-base text-gray-600 mt-1',
    }[templateType]
  }, [templateType])

  return (
    <section className={`bg-white ${heroClass}`} data-testid="template-hero">
      <div className="max-w-7xl mx-auto">
        {heroImageUrl && (
          <div className="relative w-full h-80 mb-8 rounded-lg overflow-hidden">
            <Image
              src={heroImageUrl}
              alt={headline}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        <div>
          <h1 className={`${headlineClass} text-gray-900`}>{headline}</h1>

          {subtitle && <p className={subtitleClass}>{subtitle}</p>}

          {description && (
            <div className="mt-6 prose prose-sm max-w-none text-gray-700">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeSanitize]}
                components={{
                  a: ({ href, children }) => (
                    <a href={href} className="text-brand-600 hover:underline">
                      {children}
                    </a>
                  ),
                  strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                  em: ({ children }) => <em className="italic">{children}</em>,
                  ul: ({ children }) => <ul className="list-disc ml-5">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal ml-5">{children}</ol>,
                }}
              >
                {description}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
