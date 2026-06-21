'use client'

import { useState } from 'react'
import { X, Link2, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'

interface EditTaskModalProps {
  task: {
    id: string
    status: 'pending' | 'in_progress' | 'completed'
    scheduled_date: string
    notes: string | null
  }
  members: Array<{ id: string; full_name: string }>
  taskAssignedTo?: string | null
  onClose: () => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSave: (updates: any) => Promise<void>
}

export function EditTaskModal({
  task,
  members,
  taskAssignedTo,
  onClose,
  onSave,
}: EditTaskModalProps) {
  const [status, setStatus] = useState(task.status)
  const [notes, setNotes] = useState(task.notes || '')
  const [scheduledDate, setScheduledDate] = useState(task.scheduled_date)
  const [assignedTo, setAssignedTo] = useState(taskAssignedTo || '')
  const [saving, setSaving] = useState(false)
  const [copyingLink, setCopyingLink] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  const handleCopyAccessLink = async () => {
    setCopyingLink(true)
    try {
      const response = await fetch(`/api/cleaning/tasks/${task.id}/regenerate-access-link`, {
        method: 'POST',
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao gerar link')
      }

      const fullLink = `${window.location.origin}${data.accessLink}`
      await navigator.clipboard.writeText(fullLink)

      setLinkCopied(true)
      toast.success('Link copiado para clipboard!')

      setTimeout(() => setLinkCopied(false), 2000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao copiar link'
      toast.error(message)
    } finally {
      setCopyingLink(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        status,
        notes: notes || null,
        scheduled_date: scheduledDate,
        cleaner_id: assignedTo || null,
      }
      console.log('Saving task with payload:', payload)

      const response = await fetch(`/api/cleaning/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      })

      if (!response.ok) throw new Error('Failed to save task')
      await onSave({
        status,
        notes: notes || null,
        scheduled_date: scheduledDate,
        cleaner_id: assignedTo || null,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full shadow-2xl max-h-[95vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-zinc-700">
          <h2 className="text-xl font-bold text-lodgra-blue dark:text-white">
            Editar Tarefa
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Status */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as 'pending' | 'in_progress' | 'completed')
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="pending">Pendente</option>
              <option value="in_progress">Executando</option>
              <option value="completed">Finalizado</option>
            </select>
          </div>

          {/* Scheduled Date */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              Data Agendada
            </label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Assigned To */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              Responsável
            </label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Sem atribuição</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              Notas
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Adicione observações sobre esta tarefa..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="space-y-3 p-6 border-t border-gray-200 dark:border-zinc-700">
          {taskAssignedTo && (
            <button
              onClick={handleCopyAccessLink}
              disabled={copyingLink}
              className={`w-full px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition ${
                linkCopied
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                  : 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900'
              } disabled:opacity-50`}
            >
              {linkCopied ? (
                <>
                  <Check className="h-4 w-4" />
                  Link Copiado!
                </>
              ) : copyingLink ? (
                <>
                  <div className="h-4 w-4 border-2 border-green-400 border-t-green-700 rounded-full animate-spin" />
                  Copiando...
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copie Link
                </>
              )}
            </button>
          )}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-zinc-800 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-2 bg-lodgra-blue text-white rounded-lg font-bold hover:bg-lodgra-blue/90 transition disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
