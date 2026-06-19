'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, Clock, Home, Trash2, Edit2 } from 'lucide-react'
import { Button } from '@/components/common/ui/button'
import { EditTaskModal } from './EditTaskModal'

export interface ChecklistItem {
  id: string
  label: string
  is_checked: boolean
  checked_at: string | null
  position: number
}

export interface Checklist {
  id: string
  status: 'pending' | 'in_progress' | 'completed'
  scheduled_date: string
  notes: string | null
  properties?: { id: string; name: string } | null
  assigned_to?: string | null
  cleaner_id?: string | null
  cleaning_checklist_items?: ChecklistItem[]
}

interface Props {
  checklist: Checklist
  members?: Array<{ id: string; full_name: string }>
  onUpdate: () => void
  onDelete?: (id: string) => void
}


export function CleaningChecklistCard({ checklist, members = [], onUpdate, onDelete }: Props) {
  const [expanded, setExpanded] = useState(checklist.status !== 'completed')
  const [items, setItems] = useState(((checklist.cleaning_checklist_items) || []).sort((a, b) => a.position - b.position))
  const [status, setStatus] = useState(checklist.status)
  const [, startTransition] = useTransition()
  const [deleting, setDeleting] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  const doneCount = items.filter(i => i.is_checked).length
  const total = items.length
  const progress = total > 0 ? Math.round((doneCount / total) * 100) : 0

  async function toggleItem(item: ChecklistItem) {
    const newChecked = !item.is_checked
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_checked: newChecked } : i))

    startTransition(async () => {
      const res = await fetch(`/api/cleaning/tasks/${checklist.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: item.id, is_checked: newChecked }),
      })
      if (res.ok) {
        const newCheckedCount = items.filter(i => i.id === item.id ? newChecked : i.is_checked).length
        if (newCheckedCount === total) setStatus('completed')
        else if (newCheckedCount > 0) setStatus('in_progress')
        onUpdate()
      }
    })
  }

  async function markInProgress() {
    setStatus('in_progress')
    await fetch(`/api/cleaning/tasks/${checklist.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'in_progress' }),
    })
    onUpdate()
  }

  async function handleDelete() {
    if (!confirm('Tem certeza que deseja deletar esta limpeza?')) return
    setDeleting(true)
    const res = await fetch(`/api/cleaning/tasks/${checklist.id}`, { method: 'DELETE' })
    setDeleting(false)
    if (res.ok && onDelete) onDelete(checklist.id)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const propertyName = (checklist as any).property_name || checklist.properties?.name || 'Imóvel'
  const date = new Date(checklist.scheduled_date + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long'
  })

  const THEMES = {
    pending: 'border-amber-100 bg-amber-50/30',
    in_progress: 'border-lodgra-blue bg-brand-50/20 shadow-lg shadow-brand-500/10',
    completed: 'border-emerald-100 bg-emerald-50/20 opacity-80'
  }

  return (
    <div className={`overflow-hidden rounded-[28px] border-2 transition-all duration-300 ${THEMES[status]} bg-white dark:bg-zinc-900 mb-6 group`}>
      {/* Header Visual */}
      <div className="p-6 pb-4 flex flex-col gap-4">
        <div className="flex items-start justify-between w-full">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5 font-bold uppercase tracking-widest text-[10px] text-gray-500">
              <Clock className="h-3 w-3" />
              <span>{date}</span>
              <span>•</span>
              <span className={`px-2 py-0.5 rounded-full ${
                status === 'completed' ? 'text-emerald-600' :
                status === 'in_progress' ? 'text-brand-600' : 'text-amber-600'
              }`}>
                {status === 'pending' ? 'Pendente' : status === 'in_progress' ? 'Executando' : 'Finalizado'}
              </span>
            </div>
            <h3 className="text-xl font-black text-lodgra-blue dark:text-white leading-tight">
              {propertyName}
            </h3>
          </div>
          <button
            onClick={() => setExpanded(e => !e)}
            className={`p-3 rounded-2xl transition-colors ${
              status === 'in_progress' ? 'bg-lodgra-blue text-white' : 'bg-gray-100 text-gray-600'
            } hover:opacity-80`}
            title={expanded ? 'Fechar detalhes' : 'Ver detalhes'}
          >
            <Home className="h-5 w-5" />
          </button>
        </div>

        {/* Progress HUD */}
        <div className="flex items-center gap-4 w-full">
          <div className="flex-1 h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden border border-gray-100 dark:border-gray-800">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out-expo ${
                progress === 100 ? 'bg-emerald-500' : 'bg-lodgra-blue'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-sm font-black text-gray-900 dark:text-white min-w-[36px]">
            {progress}%
          </span>
        </div>
      </div>

      {/* Checklist Surface */}
      {expanded && (
        <div className="px-6 pb-6 pt-2 animate-in fade-in slide-in-from-top-4 duration-300">
          {status === 'pending' && (
            <Button 
              size="lg" 
              onClick={markInProgress} 
              className="w-full mb-6 rounded-2xl h-14 text-base font-bold shadow-xl shadow-brand-500/20 active:scale-95 transition-transform"
            >
              Iniciar Checkout de Limpeza
            </Button>
          )}

          <div className="space-y-3">
            {items.map(item => (
              <button
                key={item.id}
                onClick={() => toggleItem(item)}
                className={`group/item w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all active:scale-[0.98] ${
                  item.is_checked
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/50'
                    : 'bg-lodgra-gray dark:bg-zinc-800 hover:bg-white border border-transparent hover:border-brand-100'
                }`}
              >
                <div className={`h-6 w-6 rounded-full flex items-center justify-center transition-all ${
                  item.is_checked
                    ? 'bg-emerald-500 text-white'
                    : 'bg-white border-2 border-gray-200 text-transparent'
                }`}>
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <span className={`text-[15px] font-bold transition-all ${
                    item.is_checked ? 'text-emerald-800/50 line-through' : 'text-lodgra-blue'
                  }`}>
                    {item.label}
                  </span>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 grid grid-cols-2 gap-3">
             <button className="bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 p-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors">
               📸 Foto de Evidência
             </button>
             <button
               onClick={() => setEditOpen(true)}
               className="bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 p-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-blue-200 transition-colors"
               title="Editar tarefa"
             >
               <Edit2 className="h-4 w-4" />
               Editar
             </button>
             {status === 'completed' && (
               <button className="col-span-2 bg-emerald-100 text-emerald-700 p-4 rounded-2xl text-sm font-bold transition-colors">
                 Relatório Gerado
               </button>
             )}
             <button
               onClick={handleDelete}
               disabled={deleting}
               className="col-span-2 bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 p-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-red-200 transition-colors disabled:opacity-50"
               title="Deletar esta limpeza"
             >
               <Trash2 className="h-4 w-4" />
               {deleting ? 'Deletando...' : 'Deletar'}
             </button>
          </div>

          {checklist.notes && (
            <div className="mt-6 p-4 bg-lodgra-gold/10 border border-lodgra-gold/20 rounded-2xl">
              <p className="text-[10px] font-black uppercase tracking-widest text-lodgra-gold mb-1">Observações do Gestor</p>
              <p className="text-sm text-lodgra-gold font-bold">{checklist.notes}</p>
            </div>
          )}
        </div>
      )}

      {editOpen && (
        <EditTaskModal
          task={{
            id: checklist.id,
            status: status as 'pending' | 'in_progress' | 'completed',
            scheduled_date: checklist.scheduled_date || '',
            notes: checklist.notes || null,
          }}
          members={members || []}
          taskAssignedTo={checklist.cleaner_id}
          onClose={() => setEditOpen(false)}
          onSave={async () => {
            setEditOpen(false)
            onUpdate()
          }}
        />
      )}
    </div>
  )
}
