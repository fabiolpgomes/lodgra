'use client'

import { useEffect, useState, useCallback } from 'react'
import { Trash2, Plus, BedDouble } from 'lucide-react'
import type { BedType } from '@/types/database'

const BED_TYPE_LABELS: Record<BedType, string> = {
  single: 'Solteiro',
  double: 'Casal',
  queen: 'Queen',
  king: 'King',
  sofa_bed: 'Sofá-cama',
  bunk: 'Beliche',
}

const BED_TYPES = Object.entries(BED_TYPE_LABELS) as [BedType, string][]

type RoomRow = {
  _id: string
  name: string
  bed_type: BedType
  bed_count: number
  provides_linen: boolean
}

function makeId() {
  return Math.random().toString(36).slice(2)
}

function defaultRoom(): RoomRow {
  return { _id: makeId(), name: '', bed_type: 'double', bed_count: 1, provides_linen: false }
}

interface RoomsEditorProps {
  propertyId: string
}

export function RoomsEditor({ propertyId }: RoomsEditorProps) {
  const [rooms, setRooms] = useState<RoomRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/properties/${propertyId}/rooms`)
        if (!res.ok) throw new Error('Erro ao carregar quartos')
        const data = await res.json()
        setRooms(data.map((r: RoomRow & { id?: string }) => ({ ...r, _id: r.id ?? makeId() })))
      } catch {
        setError('Não foi possível carregar os quartos. Tente novamente.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [propertyId])

  const addRoom = useCallback(() => {
    setRooms(prev => [...prev, defaultRoom()])
    setSaved(false)
  }, [])

  const updateRoom = useCallback((id: string, patch: Partial<RoomRow>) => {
    setRooms(prev => prev.map(r => r._id === id ? { ...r, ...patch } : r))
    setSaved(false)
  }, [])

  const removeRoom = useCallback((id: string) => {
    setRooms(prev => prev.filter(r => r._id !== id))
    setConfirmingId(null)
    setSaved(false)
  }, [])

  async function save() {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch(`/api/properties/${propertyId}/rooms`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rooms),
      })
      if (!res.ok) throw new Error('Falha ao guardar')
      setSaved(true)
    } catch {
      setError('Não foi possível guardar os quartos. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-gray-500">A carregar quartos…</p>
  if (error) return <p className="text-sm text-red-600">{error}</p>

  return (
    <div className="space-y-3">
      {rooms.length === 0 && (
        <p className="text-sm text-gray-400 italic">Nenhum quarto adicionado.</p>
      )}

      {rooms.map((room, idx) => (
        <div key={room._id} className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <BedDouble className="h-4 w-4" />
              <span>Quarto {idx + 1}</span>
            </div>

            {confirmingId === room._id ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-red-600">Remover?</span>
                <button
                  type="button"
                  onClick={() => removeRoom(room._id)}
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
                onClick={() => setConfirmingId(room._id)}
                className="text-gray-400 hover:text-red-500 transition-colors"
                aria-label="Remover quarto"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nome (opcional)</label>
              <input
                type="text"
                value={room.name}
                onChange={e => updateRoom(room._id, { name: e.target.value })}
                placeholder="ex: Quarto Principal"
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Tipo de cama</label>
              <select
                value={room.bed_type}
                onChange={e => updateRoom(room._id, { bed_type: e.target.value as BedType })}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {BED_TYPES.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Nº de camas</label>
              <input
                type="number"
                min={1}
                max={10}
                value={room.bed_count}
                onChange={e => updateRoom(room._id, { bed_count: Number(e.target.value) })}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="flex items-center gap-2 pt-4">
              <input
                type="checkbox"
                id={`linen-${room._id}`}
                checked={room.provides_linen}
                onChange={e => updateRoom(room._id, { provides_linen: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor={`linen-${room._id}`} className="text-sm text-gray-700 cursor-pointer">
                Disponibiliza lençóis
              </label>
            </div>
          </div>
        </div>
      ))}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={addRoom}
          className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Adicionar Quarto
        </button>

        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'A guardar…' : 'Guardar Quartos'}
        </button>

        {saved && <span className="text-sm text-green-600 font-medium">✓ Guardado</span>}
      </div>
    </div>
  )
}
