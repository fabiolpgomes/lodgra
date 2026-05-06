'use client'

import { useEffect, useState, useCallback } from 'react'
import * as LucideIcons from 'lucide-react'
import { LucideProps } from 'lucide-react'
import type { Amenity, AmenityCategory } from '@/types/database'

type IconName = keyof typeof LucideIcons

function AmenityIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = LucideIcons[name as IconName] as React.ComponentType<LucideProps> | undefined
  if (!Icon) return <LucideIcons.Star {...props} />
  return <Icon {...props} />
}

const CATEGORY_LABELS: Record<AmenityCategory, string> = {
  destaque: 'Destaques',
  sala: 'Sala',
  quarto: 'Quarto',
  cozinha: 'Cozinha',
  banheiro: 'Banheiro',
  seguranca: 'Segurança',
  geral: 'Geral',
}

const CATEGORY_ORDER: AmenityCategory[] = ['destaque', 'geral', 'sala', 'quarto', 'cozinha', 'banheiro', 'seguranca']

interface AmenitiesSelectorProps {
  propertyId: string
}

export function AmenitiesSelector({ propertyId }: AmenitiesSelectorProps) {
  const [catalog, setCatalog] = useState<Amenity[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function load() {
      const [catalogRes, selectedRes] = await Promise.all([
        fetch('/api/amenities'),
        fetch(`/api/properties/${propertyId}/amenities`),
      ])
      const catalogData: Amenity[] = await catalogRes.json()
      const selectedData: string[] = await selectedRes.json()
      setCatalog(catalogData)
      setSelected(new Set(selectedData))
      setLoading(false)
    }
    load()
  }, [propertyId])

  const toggle = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setSaved(false)
  }, [])

  async function save() {
    setSaving(true)
    await fetch(`/api/properties/${propertyId}/amenities`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([...selected]),
    })
    setSaving(false)
    setSaved(true)
  }

  if (loading) {
    return <p className="text-sm text-gray-500">A carregar comodidades…</p>
  }

  const byCategory = CATEGORY_ORDER.reduce<Record<string, Amenity[]>>((acc, cat) => {
    acc[cat] = catalog.filter(a => a.category === cat)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {CATEGORY_ORDER.map(cat => {
        const items = byCategory[cat]
        if (!items?.length) return null
        const isSecurity = cat === 'seguranca'
        return (
          <div key={cat} className={isSecurity ? 'border border-red-100 rounded-lg p-4 bg-red-50' : ''}>
            <h4 className={`text-sm font-semibold mb-3 ${isSecurity ? 'text-red-700' : 'text-gray-700'}`}>
              {CATEGORY_LABELS[cat]}
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {items.map(amenity => {
                const checked = selected.has(amenity.id)
                return (
                  <label
                    key={amenity.id}
                    className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors select-none ${
                      checked
                        ? 'border-blue-500 bg-blue-50 text-blue-800'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={() => toggle(amenity.id)}
                    />
                    <AmenityIcon name={amenity.icon} className="h-4 w-4 shrink-0" />
                    <span className="text-xs font-medium leading-tight">{amenity.name}</span>
                  </label>
                )
              })}
            </div>
          </div>
        )
      })}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'A guardar…' : 'Guardar Comodidades'}
        </button>
        {saved && <span className="text-sm text-green-600 font-medium">✓ Guardado</span>}
      </div>
    </div>
  )
}
