'use client'

import { useState } from 'react'
import { X, Copy, Check } from 'lucide-react'
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
  const [time, setTime] = useState('09:00')
  const [assignedTo, setAssignedTo] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<{ link: string; cleaner: string } | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleSubmit() {
    if (!propertyId || !date) { setError('Imóvel e data são obrigatórios'); return }
    setLoading(true)
    setError('')
    const res = await fetch('/api/cleaning/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        property_id: propertyId,
        scheduled_date: date,
        scheduled_time: `${time}:00`,
        cleaner_id: assignedTo || null,
        notes: notes || null
      }),
    })
    setLoading(false)
    if (res.ok) {
      const data = await res.json()
      if (data.accessLink && assignedTo) {
        const cleanerName = members.find(m => m.id === assignedTo)?.full_name || 'Cleaner'
        setSuccess({ link: data.accessLink, cleaner: cleanerName })
      } else {
        onCreated()
      }
    } else {
      const d = await res.json()
      setError(d.error ?? 'Erro ao criar limpeza')
    }
  }

  function copyToClipboard() {
    const fullLink = `${window.location.origin}${success?.link}`
    navigator.clipboard.writeText(fullLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleSuccess() {
    setSuccess(null)
    onCreated()
  }

  // Success screen
  if (success) {
    const fullLink = `${window.location.origin}${success.link}`
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-xl">
          <div className="p-8 text-center space-y-6">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 mx-auto">
              <Check className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Limpeza Criada!</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Link de acesso gerado para <strong>{success.cleaner}</strong></p>
            </div>

            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Link de Acesso:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs break-all text-gray-900 dark:text-white font-mono">{fullLink}</code>
                <button
                  onClick={copyToClipboard}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
                  title="Copiar link"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-gray-600" />}
                </button>
              </div>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-500">
              Compartilhe este link via WhatsApp ou email com o limpador
            </p>

            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1">Fechar</Button>
              <Button onClick={handleSuccess} className="flex-1">Concluído</Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-white">Nova Limpeza</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="h-5 w-5 text-gray-600" />
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

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hora Disponível *</label>
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-lodgra-primary"
            />
            <p className="text-xs text-gray-500 mt-1">A partir de que horas o imóvel está disponível para limpeza</p>
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

          <p className="text-xs text-gray-500">11 itens padrão serão adicionados automaticamente.</p>
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
