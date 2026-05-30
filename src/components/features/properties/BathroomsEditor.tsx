'use client'

import { useEffect, useState, useCallback } from 'react'
import { Trash2, Plus, Bath } from 'lucide-react'
import type { BathroomType } from '@/types/database'

const BATHROOM_TYPE_LABELS: Record<BathroomType, string> = {
  wc: 'WC (casa de banho simples)',
  full: 'Banheiro completo',
}

const BATHROOM_TYPES = Object.entries(BATHROOM_TYPE_LABELS) as [BathroomType, string][]

const BATHROOM_AMENITIES = [
  'Toalhas',
  'Secador de cabelo',
  'Sabonete',
  'Champô',
  'Papel higiénico',
  'Espelho',
  'Banheira',
  'Duche',
]

type BathroomRow = {
  _id: string
  name: string
  bathroom_type: BathroomType
  amenities: string[]
}

function makeId() {
  return Math.random().toString(36).slice(2)
}

function defaultBathroom(): BathroomRow {
  return { _id: makeId(), name: '', bathroom_type: 'full', amenities: [] }
}

interface BathroomsEditorProps {
  propertyId: string
}

export function BathroomsEditor({ propertyId }: BathroomsEditorProps) {
  const [bathrooms, setBathrooms] = useState<BathroomRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/properties/${propertyId}/bathrooms`)
        if (!res.ok) throw new Error('Erro ao carregar banheiros')
        const data = await res.json()
        setBathrooms(data.map((b: BathroomRow & { id?: string }) => ({ ...b, _id: b.id ?? makeId() })))
      } catch {
        setLoadError('Não foi possível carregar os banheiros. Tente novamente.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [propertyId])

  const addBathroom = useCallback(() => {
    setBathrooms(prev => [...prev, defaultBathroom()])
    setSaved(false)
  }, [])

  const updateBathroom = useCallback((id: string, patch: Partial<BathroomRow>) => {
    setBathrooms(prev => prev.map(b => b._id === id ? { ...b, ...patch } : b))
    setSaved(false)
  }, [])

  const toggleAmenity = useCallback((id: string, amenity: string) => {
    setBathrooms(prev => prev.map(b => {
      if (b._id !== id) return b
      const has = b.amenities.includes(amenity)
      return { ...b, amenities: has ? b.amenities.filter(a => a !== amenity) : [...b.amenities, amenity] }
    }))
    setSaved(false)
  }, [])

  const removeBathroom = useCallback((id: string) => {
    setBathrooms(prev => prev.filter(b => b._id !== id))
    setConfirmingId(null)
    setSaved(false)
  }, [])

  async function save() {
    setSaving(true)
    setSaved(false)
    setSaveError(null)
    try {
      const res = await fetch(`/api/properties/${propertyId}/bathrooms`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bathrooms),
      })
      if (!res.ok) throw new Error('Falha ao guardar')
      setSaved(true)
    } catch {
      setSaveError('Não foi possível guardar os banheiros. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-gray-600">A carregar banheiros…</p>
  if (loadError) return <p className="text-sm text-red-600">{loadError}</p>

  return (
    <div className="space-y-3">
      {bathrooms.length === 0 && (
        <p className="text-sm text-gray-500 italic">Nenhum banheiro adicionado.</p>
      )}

      {bathrooms.map((bathroom, idx) => (
        <div key={bathroom._id} className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Bath className="h-4 w-4" />
              <span>Banheiro {idx + 1}</span>
            </div>

            {confirmingId === bathroom._id ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-red-600">Remover?</span>
                <button
                  type="button"
                  onClick={() => removeBathroom(bathroom._id)}
                  className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                >
                  Sim
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingId(null)}
                  className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingId(bathroom._id)}
                className="text-gray-500 hover:text-red-500 transition-colors"
                aria-label="Remover banheiro"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Nome (opcional)</label>
              <input
                type="text"
                value={bathroom.name}
                onChange={e => updateBathroom(bathroom._id, { name: e.target.value })}
                placeholder="ex: Casa de Banho 1"
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Tipo</label>
              <select
                value={bathroom.bathroom_type}
                onChange={e => updateBathroom(bathroom._id, { bathroom_type: e.target.value as BathroomType })}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {BATHROOM_TYPES.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-600 mb-2">Artigos disponíveis</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {BATHROOM_AMENITIES.map(amenity => {
                const checked = bathroom.amenities.includes(amenity)
                return (
                  <label
                    key={amenity}
                    style={checked
                      ? { backgroundColor: '#3A4FC5', borderColor: '#3A4FC5', color: 'white' }
                      : { backgroundColor: 'white', borderColor: '#e5e7eb', color: '#374151' }
                    }
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-md border cursor-pointer text-xs transition-all select-none active:scale-95"
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={() => toggleAmenity(bathroom._id, amenity)}
                    />
                    <span>{amenity}</span>
                    {checked && (
                      <svg className="ml-auto h-3 w-3 shrink-0" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </label>
                )
              })}
            </div>
          </div>
        </div>
      ))}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={addBathroom}
          className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Adicionar Banheiro
        </button>

        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-md hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'A guardar…' : 'Guardar Banheiros'}
        </button>

        {saved && <span className="text-sm text-green-600 font-medium">✓ Guardado</span>}
        {saveError && <span className="text-sm text-red-600">{saveError}</span>}
      </div>
    </div>
  )
}
