'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, CheckSquare } from 'lucide-react'
import { Button } from '@/components/common/ui/button'
import { CleaningChecklistCard } from './CleaningChecklistCard'
import { NewChecklistModal } from './NewChecklistModal'

interface Property { id: string; name: string }
interface Member { id: string; full_name: string; role: string }

interface Props {
  properties: Property[]
  members: Member[]
  userRole: string
  userId: string
}

type FilterStatus = 'all' | 'pending' | 'in_progress' | 'completed'

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

export function CleaningPageClient({ properties, members, userRole }: Props) {
  const [checklists, setChecklists] = useState<Checklist[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('pending')
  const [filterProperty, setFilterProperty] = useState('')
  const [showModal, setShowModal] = useState(false)

  const isAdmin = ['admin', 'manager'].includes(userRole)

  const fetchChecklists = useCallback(async () => {
    const params = new URLSearchParams()
    if (filterStatus !== 'all') params.set('status', filterStatus)
    if (filterProperty) params.set('property_id', filterProperty)

    const res = await fetch(`/api/cleaning?${params}`)
    if (res.ok) setChecklists(await res.json())
    setLoading(false)
  }, [filterStatus, filterProperty])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    void fetchChecklists()
  }, [fetchChecklists])

  const pendingCount = checklists.filter(c => c.status === 'pending').length
  const inProgressCount = checklists.filter(c => c.status === 'in_progress').length

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 pb-24">
      {/* Header Visual */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <div className="flex items-center gap-2 mb-2">
             <div className="p-2 bg-lodgra-blue text-white rounded-xl">
               <CheckSquare className="h-5 w-5" />
             </div>
             <span className="text-xs font-black uppercase tracking-widest text-lodgra-blue">Operacional</span>
          </div>
          <h1 className="text-3xl font-black text-lodgra-blue dark:text-white leading-tight">
            Próximas <br />
            Limpezas
          </h1>
          <p className="text-sm font-bold text-gray-400 mt-2">
            {pendingCount > 0 ? `${pendingCount} tarefas aguardando início` : 'Tudo em dia por aqui!'}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowModal(true)} size="lg" className="rounded-2xl h-14 w-14 p-0 shadow-lg shadow-blue-500/20">
            <Plus className="h-6 w-6" />
          </Button>
        )}
      </div>

      {/* Modern Filter HUD */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2 no-scrollbar">
        {(['pending', 'in_progress', 'all', 'completed'] as FilterStatus[]).map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
              filterStatus === s
                ? 'bg-lodgra-blue text-white shadow-md'
                : 'bg-white dark:bg-zinc-800 text-gray-400 border border-gray-100 dark:border-zinc-700'
            }`}
          >
            {s === 'pending' ? 'Pendentes' : s === 'in_progress' ? 'Em curso' : s === 'completed' ? 'Feitas' : 'Todas'}
          </button>
        ))}

        {properties.length > 1 && (
          <select
            value={filterProperty}
            onChange={e => setFilterProperty(e.target.value)}
            className="px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-none outline-none"
          >
            <option value="">Todos imóveis</option>
            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : checklists.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <CheckSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhuma limpeza {filterStatus === 'all' ? '' : filterStatus === 'pending' ? 'pendente' : 'encontrada'}</p>
          {isAdmin && (
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setShowModal(true)}>
              Criar primeira limpeza
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {checklists.map(c => (
            <CleaningChecklistCard
              key={c.id}
              checklist={c}
              onUpdate={fetchChecklists}
            />
          ))}
        </div>
      )}

      {showModal && (
        <NewChecklistModal
          properties={properties}
          members={members}
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); fetchChecklists() }}
        />
      )}
    </div>
  )
}
