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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center sm:p-4">
      <div className="max-h-[calc(100vh-1.5rem)] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 shadow-lg sm:max-h-[calc(100vh-2rem)] sm:rounded-2xl sm:p-6">
        <h2 className="mb-4 text-lg font-bold text-gray-900 sm:text-xl">Bloquear Datas</h2>

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
              className="w-full rounded-lg border border-gray-300 px-3 py-3 focus:border-transparent focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
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
              className="w-full rounded-lg border border-gray-300 px-3 py-3 focus:border-transparent focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
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
              className="w-full rounded-lg border border-gray-300 px-3 py-3 focus:border-transparent focus:ring-2 focus:ring-brand-500"
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
              className="w-full rounded-lg border border-gray-300 px-3 py-3 focus:border-transparent focus:ring-2 focus:ring-brand-500"
              disabled={loading}
            />
          </div>

          {/* Buttons */}
          <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="h-12 flex-1 rounded-lg border border-gray-300 px-4 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="h-12 flex-1 rounded-lg bg-blue-600 px-4 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'A bloquear...' : 'Bloquear Datas'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
