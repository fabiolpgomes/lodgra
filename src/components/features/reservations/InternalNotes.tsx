'use client'

import { useState } from 'react'
import { StickyNote, Save, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/common/ui/button'
import { Textarea } from '@/components/common/ui/textarea'

export function InternalNotes({
  reservationId,
  initialNotes,
}: {
  reservationId: string
  initialNotes: string | null
}) {
  const [notes, setNotes] = useState(initialNotes || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)

    try {
      const res = await fetch(`/api/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ internal_notes: notes }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao guardar nota')
      }

      toast.success('Nota guardada!')
      setSaved(true)
      setIsEditing(false)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao guardar nota')
      toast.error('Erro ao guardar nota')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <StickyNote className="h-5 w-5" />
        Nota Interna
      </h3>

      {isEditing ? (
        <div className="space-y-3">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Escreva uma nota interna sobre esta reserva..."
            className="resize-none text-sm"
          />

          {error && (
            <p className="text-red-600 text-sm">{error}</p>
          )}

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                'Guardando...'
              ) : saved ? (
                <>
                  <Check className="h-4 w-4" />
                  Guardado
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Guardar
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setIsEditing(false)
                setNotes(initialNotes || '')
                setError(null)
              }}
              disabled={saving}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div>
          {notes ? (
            <p className="text-sm text-gray-700 whitespace-pre-wrap mb-3">{notes}</p>
          ) : (
            <p className="text-sm text-gray-400 italic mb-3">Sem notas internas</p>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="text-blue-600 hover:text-blue-700 px-0"
          >
            {notes ? 'Editar nota' : 'Adicionar nota'}
          </Button>
        </div>
      )}
    </div>
  )
}
