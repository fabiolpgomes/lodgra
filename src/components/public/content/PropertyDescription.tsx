'use client'

import { useState } from 'react'

interface PropertyDescriptionProps {
  description: string
}

export function PropertyDescription({ description }: PropertyDescriptionProps) {
  const [expanded, setExpanded] = useState(false)
  const lines = description.split('\n').filter(line => line.trim())
  const isLong = lines.length > 3 || description.length > 400

  return (
    <section aria-label="Sobre este espaço">
      <h2 className="text-xl font-semibold text-hs-neutral-900 mb-3">
        Sobre este espaço
      </h2>
      <div className="relative overflow-hidden">
        <div
          style={{
            maxHeight: expanded ? 'none' : '120px',
            overflow: expanded ? 'visible' : 'hidden',
            transition: 'max-height 0.3s ease-out',
          }}
        >
          <p className="text-hs-neutral-500 leading-relaxed whitespace-pre-wrap">
            {description}
          </p>
        </div>
        {!expanded && isLong && (
          <div 
            className="absolute bottom-0 left-0 right-0 pointer-events-none" 
            style={{
              height: '40px',
              background: 'linear-gradient(to top, var(--hs-surface), transparent)'
            }} 
          />
        )}
      </div>
      {isLong && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="mt-2 text-sm font-semibold text-hs-brand-600 hover:text-hs-brand-500 underline underline-offset-2 transition-colors"
        >
          {expanded ? 'Ver menos' : 'Ver mais'}
        </button>
      )}
    </section>
  )
}
