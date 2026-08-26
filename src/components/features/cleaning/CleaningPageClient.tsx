'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, CheckSquare, HelpCircle } from 'lucide-react'
import { Button } from '@/components/common/ui/button'
import { CleaningChecklistCard, type Checklist } from './CleaningChecklistCard'
import { NewChecklistModal } from './NewChecklistModal'
import { WorkflowFlowModal } from './WorkflowFlowModal'
import { PropertyFilter } from './PropertyFilter'

interface Property { id: string; name: string }
interface Member { id: string; full_name: string; role: string }

interface Props {
  properties: Property[]
  members: Member[]
  userRole: string
  userId: string
}

type FilterStatus = 'all' | 'pending' | 'in_progress' | 'completed'

export function CleaningPageClient({ properties, members, userRole }: Props) {
  const [checklists, setChecklists] = useState<Checklist[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('pending')
  const [filterProperty, setFilterProperty] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showWorkflowModal, setShowWorkflowModal] = useState(false)

  const isAdmin = ['admin', 'manager'].includes(userRole)

  const fetchChecklists = useCallback(async () => {
    const params = new URLSearchParams()
    if (filterStatus !== 'all') params.set('status', filterStatus)
    if (filterProperty) params.set('property_id', filterProperty)

    const res = await fetch(`/api/cleaning/tasks?${params}`, {
      credentials: 'include',
    })
    if (res.ok) {
      const data = await res.json()
      setChecklists(data.tasks || [])
    }
    setLoading(false)
  }, [filterStatus, filterProperty])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    void fetchChecklists()
  }, [fetchChecklists])

  const pendingCount = checklists.filter(c => c.status === 'pending').length
  const _inProgressCount = checklists.filter(c => c.status === 'in_progress').length

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-24 sm:py-10">
      {/* Header Visual */}
      <div className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
             <div className="p-2 bg-lodgra-blue text-white rounded-xl">
               <CheckSquare className="h-5 w-5" />
             </div>
             <span className="text-xs font-black uppercase tracking-widest text-lodgra-blue">Operacional</span>
          </div>
          <h1 className="text-2xl font-black text-lodgra-blue dark:text-white leading-tight sm:text-3xl">
            Próximas Limpezas
          </h1>
          <p className="mt-2 text-sm font-bold text-gray-500">
            {pendingCount > 0 ? `${pendingCount} tarefas aguardando início` : 'Tudo em dia por aqui!'}
          </p>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
            Toque numa limpeza para expandir e concluir em poucos passos.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-3">
          <button
            onClick={() => setShowWorkflowModal(true)}
            className="flex items-center justify-center gap-2 rounded-2xl bg-blue-100 px-4 py-3 text-sm font-bold text-blue-600 transition hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
            title="Ver fluxo de trabalho"
          >
            <HelpCircle className="h-6 w-6" />
            <span className="sm:hidden">Fluxo</span>
            <span className="hidden sm:inline">Fluxo</span>
          </button>
          {isAdmin && (
            <Button
              onClick={() => setShowModal(true)}
              size="lg"
              className="h-14 rounded-2xl px-5 shadow-lg shadow-brand-500/20"
            >
              <Plus className="h-5 w-5" />
              <span className="text-sm font-bold">Nova limpeza</span>
            </Button>
          )}
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-brand-border-soft bg-white p-4 shadow-sm sm:hidden">
        <p className="text-[10px] font-black uppercase tracking-[1.5px] text-gray-500">Acesso rápido</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {isAdmin && (
            <Button onClick={() => setShowModal(true)} className="col-span-2 h-12 justify-center rounded-2xl shadow-lg shadow-brand-500/20">
              <Plus className="h-4 w-4" />
              Nova limpeza
            </Button>
          )}
          <button
            onClick={() => setShowWorkflowModal(true)}
            className="col-span-2 flex h-12 items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
          >
            <HelpCircle className="h-5 w-5" />
            Ver fluxo
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`h-11 rounded-2xl border px-4 text-xs font-black uppercase tracking-wider transition ${
              filterStatus === 'pending'
                ? 'border-brand-600 bg-brand-600 text-white'
                : 'border-gray-100 bg-white text-gray-500'
            }`}
          >
            Pendentes
          </button>
          <button
            onClick={() => setFilterStatus('in_progress')}
            className={`h-11 rounded-2xl border px-4 text-xs font-black uppercase tracking-wider transition ${
              filterStatus === 'in_progress'
                ? 'border-brand-600 bg-brand-600 text-white'
                : 'border-gray-100 bg-white text-gray-500'
            }`}
          >
            Em curso
          </button>
          <button
            onClick={() => setFilterStatus('all')}
            className={`col-span-2 h-11 rounded-2xl border px-4 text-xs font-black uppercase tracking-wider transition ${
              filterStatus === 'all'
                ? 'border-brand-600 bg-brand-600 text-white'
                : 'border-gray-100 bg-white text-gray-500'
            }`}
          >
            Todas as limpezas
          </button>
        </div>
      </div>

      {/* Modern Filter HUD */}
      <div className="mb-8 flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {(['pending', 'in_progress', 'all', 'completed'] as FilterStatus[]).map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
              filterStatus === s
                ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30'
                : 'bg-white dark:bg-zinc-800 text-gray-500 border border-gray-100 dark:border-zinc-700 hover:border-gray-200'
            }`}
          >
            {s === 'pending' ? 'Pendentes' : s === 'in_progress' ? 'Em curso' : s === 'completed' ? 'Feitas' : 'Todas'}
          </button>
        ))}

        {properties.length > 1 && (
          <PropertyFilter
            properties={properties}
            value={filterProperty}
            onChange={setFilterProperty}
          />
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
        <div className="text-center py-16 text-gray-500">
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
              members={members}
              onUpdate={fetchChecklists}
              onDelete={() => {
                setChecklists(prev => prev.filter(ch => ch.id !== c.id))
              }}
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

      <WorkflowFlowModal isOpen={showWorkflowModal} onClose={() => setShowWorkflowModal(false)} />
    </div>
  )
}
