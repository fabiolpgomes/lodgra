'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

type PropertyOption = {
  id: string
  name: string
  currency?: string | null
}

type PropertyFilterDropdownProps = {
  label: string
  properties: PropertyOption[]
  selectedPropertyId?: string
  totalProperties: number
  fallbackCurrency: string
}

export function PropertyFilterDropdown({
  label,
  properties,
  selectedPropertyId,
  totalProperties,
  fallbackCurrency,
}: PropertyFilterDropdownProps) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  function selectProperty(propertyId?: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (propertyId) {
      params.set('propertyId', propertyId)
    } else {
      params.delete('propertyId')
    }

    setOpen(false)
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  return (
    <div ref={wrapperRef} className="relative z-[90]">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-11 w-full items-center justify-between gap-3 rounded-xl border border-neutral-200/60 bg-brand-bg px-4 text-sm font-semibold text-brand-text-dark shadow-2xs transition-all hover:border-brand-gold/40 hover:bg-brand-white"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="truncate">{label}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-brand-text-medium transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="absolute left-0 top-[calc(100%+10px)] z-[120] w-[min(420px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-neutral-200/80 bg-[#FBFAF6] p-2 shadow-[0_24px_64px_rgba(16,32,62,0.24)] ring-1 ring-white/80"
          role="listbox"
        >
          <button
            type="button"
            onClick={() => selectProperty()}
            className={`flex min-h-11 w-full items-center justify-between rounded-xl px-3 text-left text-sm font-semibold transition-colors ${
              selectedPropertyId
                ? 'text-brand-text-dark hover:bg-brand-bg hover:text-brand-gold'
                : 'bg-brand-blue text-white'
            }`}
            role="option"
            aria-selected={!selectedPropertyId}
          >
            <span>Todas as propriedades</span>
            <span className="text-xs opacity-80">{totalProperties}</span>
          </button>

          <div className="my-2 border-t border-neutral-200/60" />

          <div className="max-h-[360px] space-y-1 overflow-y-auto pr-1">
            {properties.map((property) => (
              <button
                key={property.id}
                type="button"
                onClick={() => selectProperty(property.id)}
                className={`grid min-h-12 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold leading-tight transition-colors ${
                  selectedPropertyId === property.id
                    ? 'bg-brand-blue text-white'
                    : 'bg-[#FBFAF6] text-brand-text-dark hover:bg-brand-bg hover:text-brand-gold'
                }`}
                role="option"
                aria-selected={selectedPropertyId === property.id}
              >
                <span className="truncate">{property.name}</span>
                <span className="shrink-0 rounded-md border border-brand-blue/10 bg-brand-bg px-2 py-0.5 font-mono text-[10px] font-bold text-brand-blue">
                  {property.currency || fallbackCurrency}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
