'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Amenity, AmenityCategory } from '@/types/database'
import { AmenityIcon } from './AmenityIcon'

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
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [catalogRes, selectedRes] = await Promise.all([
          fetch('/api/amenities'),
          fetch(`/api/properties/${propertyId}/amenities`),
        ])
        if (!catalogRes.ok || !selectedRes.ok) throw new Error('Erro ao carregar comodidades')
        const catalogData: Amenity[] = await catalogRes.json()
        const selectedData: string[] = await selectedRes.json()
        const seen = new Set<string>()
        const unique = catalogData.filter(a => {
          if (!a.name?.trim()) return false
          const key = `${a.category}:${a.name}`
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
        setCatalog(unique)
        setSelected(new Set(selectedData))
      } catch {
        setError('Não foi possível carregar as comodidades. Tente novamente.')
      } finally {
        setLoading(false)
      }
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
    setSaved(false)
    try {
      const res = await fetch(`/api/properties/${propertyId}/amenities`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([...selected]),
      })
      if (!res.ok) throw new Error('Falha ao guardar')
      setSaved(true)
    } catch {
      setError('Não foi possível guardar as comodidades. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-600">A carregar comodidades…</p>
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>
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
                    className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-all select-none active:scale-95 ${
                      checked
                        ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-brand-400 hover:bg-brand-50'
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
                    {checked && (
                      <svg className="ml-auto h-3.5 w-3.5 shrink-0" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
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
          className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-md hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'A guardar…' : 'Guardar Comodidades'}
        </button>
        {saved && <span className="text-sm text-green-600 font-medium">✓ Guardado</span>}
      </div>
    </div>
  )
}
