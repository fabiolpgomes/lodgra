'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'

interface BlockDatesModalProps {
  checkIn: string
  checkOut: string
  properties: Array<{ id: string; name: string }>
  selectedPropertyId?: string
  onClose: () => void
  onSuccess: () => void
}

function formatDateToInput(dateStr: string): string {
  // Converte yyyy-mm-dd para dd.mm.yyyy
  const [year, month, day] = dateStr.split('-')
  return `${day}.${month}.${year}`
}

function formatInputToDate(dateStr: string): string {
  // Converte dd.mm.yyyy para yyyy-mm-dd
  const parts = dateStr.split('.')
  if (parts.length === 3) {
    const [day, month, year] = parts
    return `${year}-${month}-${day}`
  }
  return dateStr
}

export function BlockDatesModal({
  checkIn,
  checkOut,
  properties,
  selectedPropertyId,
  onClose,
  onSuccess,
}: BlockDatesModalProps) {
  const [propertyId, setPropertyId] = useState(selectedPropertyId || '')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [formCheckIn, setFormCheckIn] = useState('')
  const [formCheckOut, setFormCheckOut] = useState('')

  useEffect(() => {
    setFormCheckIn(formatDateToInput(checkIn))
    setFormCheckOut(formatDateToInput(checkOut))
  }, [checkIn, checkOut])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!propertyId) {
      toast.error('Seleccione uma propriedade')
      return
    }

    if (!formCheckIn || !formCheckOut) {
      toast.error('Preencha as datas de check-in e check-out')
      return
    }

    const apiCheckIn = formatInputToDate(formCheckIn)
    const apiCheckOut = formatInputToDate(formCheckOut)

    if (!apiCheckIn.match(/^\d{4}-\d{2}-\d{2}$/) || !apiCheckOut.match(/^\d{4}-\d{2}-\d{2}$/)) {
      toast.error('Formato de data inválido. Use dd.mm.yyyy')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/calendar/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id: propertyId,
          start_date: apiCheckIn,
          end_date: apiCheckOut,
          notes: notes || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        toast.error(error.error || 'Erro ao criar bloqueio')
        return
      }

      toast.success('Datas bloqueadas com sucesso')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Erro ao bloquear datas:', error)
      toast.error('Erro ao criar bloqueio')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Bloquear Datas</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Check-in */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Check-in
            </label>
            <input
              type="text"
              placeholder="dd.mm.yyyy"
              value={formCheckIn}
              onChange={(e) => setFormCheckIn(e.target.value)}
              maxLength={10}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:opacity-50"
            />
          </div>

          {/* Check-out */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Check-out
            </label>
            <input
              type="text"
              placeholder="dd.mm.yyyy"
              value={formCheckOut}
              onChange={(e) => setFormCheckOut(e.target.value)}
              maxLength={10}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:opacity-50"
            />
          </div>

          {/* Propriedade */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Propriedade *
            </label>
            <select
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              disabled={loading}
            >
              <option value="">Seleccione uma propriedade</option>
              {properties.map((prop) => (
                <option key={prop.id} value={prop.id}>
                  {prop.name}
                </option>
              ))}
            </select>
          </div>

          {/* Motivo/Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Motivo (opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: Manutenção, Limpeza especial..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              disabled={loading}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'A bloquear...' : 'Bloquear Datas'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
