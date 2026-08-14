'use client'

import { useEffect, useState } from 'react'
import { Building2, Check, ChevronLeft, ChevronRight } from 'lucide-react'

interface PropertyRailItem {
  id: string
  name: string
  image?: string
  image_url?: string
  photos?: Array<string | { url?: string }>
}

interface PropertyRailProps {
  activePropertyId: string
  locale: string
}

function getImage(property: PropertyRailItem) {
  const firstPhoto = property.photos?.[0]
  return property.image || property.image_url || (typeof firstPhoto === 'string' ? firstPhoto : firstPhoto?.url)
}

export function PropertyRail({ activePropertyId, locale }: PropertyRailProps) {
  const [properties, setProperties] = useState<PropertyRailItem[]>([])
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    let mounted = true

    const loadProperties = async () => {
      try {
        const response = await fetch('/api/properties?status=active&limit=100', { credentials: 'include' })
        // Some test and offline environments intentionally provide no response.
        if (!response?.ok) return
        const payload = await response.json()
        const propertyList = payload.data?.properties || payload.properties || payload.data || []
        if (mounted) setProperties(Array.isArray(propertyList) ? propertyList : [])
      } catch (error) {
        console.error('[PropertyRail] Unable to load properties:', error)
      }
    }

    void loadProperties()

    return () => { mounted = false }
  }, [])

  return (
    <aside
      aria-label="Propriedades"
      className={`hidden lg:flex min-h-0 flex-col border-r border-[#E5E7EB] bg-white transition-[width] ${collapsed ? 'w-14' : 'w-24'}`}
    >
      <div className={`min-h-0 flex-1 space-y-3 overflow-y-auto py-4 ${collapsed ? 'px-1' : 'px-2'}`}>
        {properties.map((property) => {
          const image = getImage(property)
          const active = property.id === activePropertyId

          return (
            <div key={property.id} className="relative flex justify-center">
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute -right-1 top-1/2 h-8 w-1 -translate-y-1/2 rounded-full bg-[#10203E]"
                />
              )}
              <a
                href={`/${locale}/calendar/${property.id}`}
                aria-label={`${active ? 'Propriedade selecionada' : 'Abrir calendário'}: ${property.name}`}
                aria-current={active ? 'page' : undefined}
                title={property.name}
                className={`relative mx-auto flex items-center justify-center overflow-hidden rounded-xl border-2 bg-[#F7F7F7] transition duration-150 hover:scale-[1.04] ${collapsed ? 'h-10 w-10' : 'h-14 w-14'} ${active ? 'scale-[1.04] border-white shadow-lg ring-3 ring-[#10203E] ring-offset-2' : 'border-transparent opacity-75 hover:opacity-100'}`}
              >
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={image} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Building2 className="h-5 w-5 text-[#717171]" />
                )}
                {active && (
                  <span className="absolute bottom-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#10203E] text-white shadow" aria-hidden="true">
                    <Check size={11} strokeWidth={3} />
                  </span>
                )}
              </a>
            </div>
          )
        })}
      </div>
      <button
        type="button"
        onClick={() => setCollapsed((value) => !value)}
        className="m-2 flex h-11 items-center justify-center rounded-full bg-[#F7F7F7] text-[#222222] hover:bg-[#EBEBEB]"
        aria-label={collapsed ? 'Expandir propriedades' : 'Recolher propriedades'}
      >
        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>
    </aside>
  )
}
