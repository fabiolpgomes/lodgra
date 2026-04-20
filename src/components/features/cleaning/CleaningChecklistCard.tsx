'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Clock, Home, User } from 'lucide-react'
import { Button } from '@/components/common/ui/button'

interface ChecklistItem {
  id: string
  label: string
  is_done: boolean
  done_at: string | null
  position: number
}

interface Checklist {
  id: string
  status: 'pending' | 'in_progress' | 'completed'
  scheduled_date: string
  notes: string | null
  properties: { id: string; name: string } | null
  assigned_to: string | null
  cleaning_checklist_items: ChecklistItem[]
}

interface Props {
  checklist: Checklist
  onUpdate: () => void
}

const STATUS_LABELS = {
  pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
  in_progress: { label: 'Em andamento', color: 'bg-blue-100 text-blue-800' },
  completed: { label: 'Concluído', color: 'bg-green-100 text-green-800' },
}

export function CleaningChecklistCard({ checklist, onUpdate }: Props) {
  const [expanded, setExpanded] = useState(checklist.status !== 'completed')
  const [items, setItems] = useState(checklist.cleaning_checklist_items.sort((a, b) => a.position - b.position))
  const [status, setStatus] = useState(checklist.status)
  const [, startTransition] = useTransition()

  const doneCount = items.filter(i => i.is_done).length
  const total = items.length
  const progress = total > 0 ? Math.round((doneCount / total) * 100) : 0

  async function toggleItem(item: ChecklistItem) {
    const newDone = !item.is_done
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_done: newDone } : i))

    startTransition(async () => {
      const res = await fetch(`/api/cleaning/${checklist.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: item.id, is_done: newDone }),
      })
      if (res.ok) {
        const newDoneCount = items.filter(i => i.id === item.id ? newDone : i.is_done).length
        if (newDoneCount === total) setStatus('completed')
        else if (newDoneCount > 0) setStatus('in_progress')
        onUpdate()
      }
    })
  }

  async function markInProgress() {
    setStatus('in_progress')
    await fetch(`/api/cleaning/${checklist.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'in_progress' }),
    })
    onUpdate()
  }

  const propertyName = checklist.properties?.name ?? 'Imóvel'
  const date = new Date(checklist.scheduled_date + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long'
  })

  const THEMES = {
    pending: 'border-amber-100 bg-amber-50/30',
    in_progress: 'border-lodgra-blue bg-blue-50/20 shadow-lg shadow-blue-500/10',
    completed: 'border-emerald-100 bg-emerald-50/20 opacity-80'
  }

  return (
    <div className={`overflow-hidden rounded-[28px] border-2 transition-all duration-300 ${THEMES[status]} bg-white dark:bg-zinc-900 mb-6 group`}>
      {/* Header Visual */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full p-6 pb-4 flex flex-col gap-4 text-left"
      >
        <div className="flex items-start justify-between w-full">
          <div>
            <div className="flex items-center gap-2 mb-1.5 font-bold uppercase tracking-widest text-[10px] text-gray-400">
              <Clock className="h-3 w-3" />
              <span>{date}</span>
              <span>•</span>
              <span className={`px-2 py-0.5 rounded-full ${
                status === 'completed' ? 'text-emerald-600' : 
                status === 'in_progress' ? 'text-blue-600' : 'text-amber-600'
              }`}>
                {status === 'pending' ? 'Pendente' : status === 'in_progress' ? 'Executando' : 'Finalizado'}
              </span>
            </div>
            <h3 className="text-xl font-black text-lodgra-blue dark:text-white leading-tight">
              {propertyName}
            </h3>
          </div>
          <div className={`p-3 rounded-2xl transition-colors ${
            status === 'in_progress' ? 'bg-lodgra-blue text-white' : 'bg-gray-100 text-gray-500'
          }`}>
            <Home className="h-5 w-5" />
          </div>
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
      </button>

      {/* Checklist Surface */}
      {expanded && (
        <div className="px-6 pb-6 pt-2 animate-in fade-in slide-in-from-top-4 duration-300">
          {status === 'pending' && (
            <Button 
              size="lg" 
              onClick={markInProgress} 
              className="w-full mb-6 rounded-2xl h-14 text-base font-bold shadow-xl shadow-blue-500/20 active:scale-95 transition-transform"
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
                  item.is_done
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/50'
                    : 'bg-lodgra-gray dark:bg-zinc-800 hover:bg-white border border-transparent hover:border-blue-100'
                }`}
              >
                <div className={`h-6 w-6 rounded-full flex items-center justify-center transition-all ${
                  item.is_done 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-white border-2 border-gray-200 text-transparent'
                }`}>
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <span className={`text-[15px] font-bold transition-all ${
                    item.is_done ? 'text-emerald-800/50 line-through' : 'text-lodgra-blue'
                  }`}>
                    {item.label}
                  </span>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 flex gap-4">
             <button className="flex-1 bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 p-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors">
               📸 Foto de Evidência
             </button>
             {status === 'completed' && (
               <button className="flex-1 bg-emerald-100 text-emerald-700 p-4 rounded-2xl text-sm font-bold transition-colors">
                 Relatório Gerado
               </button>
             )}
          </div>

          {checklist.notes && (
            <div className="mt-6 p-4 bg-lodgra-gold/10 border border-lodgra-gold/20 rounded-2xl">
              <p className="text-[10px] font-black uppercase tracking-widest text-lodgra-gold mb-1">Observações do Gestor</p>
              <p className="text-sm text-lodgra-gold font-bold">{checklist.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
