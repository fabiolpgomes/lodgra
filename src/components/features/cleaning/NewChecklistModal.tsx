'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/common/ui/button'

interface Property { id: string; name: string }
interface Member { id: string; full_name: string; role: string }

interface Props {
  properties: Property[]
  members: Member[]
  onClose: () => void
  onCreated: () => void
}

export function NewChecklistModal({ properties, members, onClose, onCreated }: Props) {
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? '')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [assignedTo, setAssignedTo] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!propertyId || !date) { setError('Imóvel e data são obrigatórios'); return }
    setLoading(true)
    setError('')
    const res = await fetch('/api/cleaning', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ property_id: propertyId, scheduled_date: date, assigned_to: assignedTo || null, notes: notes || null }),
    })
    setLoading(false)
    if (res.ok) onCreated()
    else {
      const d = await res.json()
      setError(d.error ?? 'Erro ao criar limpeza')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-white">Nova Limpeza</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Imóvel *</label>
            <select
              value={propertyId}
              onChange={e => setPropertyId(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-lodgra-primary"
            >
              {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data *</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-lodgra-primary"
            />
          </div>

          {members.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Responsável</label>
              <select
                value={assignedTo}
                onChange={e => setAssignedTo(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-lodgra-primary"
              >
                <option value="">Não atribuído</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observações</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Ex: Trocar filtro do ar-condicionado"
              className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-lodgra-primary resize-none"
            />
          </div>

          <p className="text-xs text-gray-400">11 itens padrão serão adicionados automaticamente.</p>
        </div>

        <div className="flex gap-3 p-4 border-t border-gray-100 dark:border-gray-800">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading} className="flex-1">
            {loading ? 'A criar...' : 'Criar Limpeza'}
          </Button>
        </div>
      </div>
    </div>
  )
}
