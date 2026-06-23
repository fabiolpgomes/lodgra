'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSupabaseRealtimeSubscription } from '@/hooks/useSupabaseRealtimeSubscription'
import CleanerTaskCard from '../_components/CleanerTaskCard'
import { CleaningTask } from '@/types/cleaning'

export default function CleanerDashboard() {
  const supabase = createClient()
  const [tasks, setTasks] = useState<CleaningTask[]>([])
  const [nextWeekTasks, setNextWeekTasks] = useState<CleaningTask[]>([])
  const [activeTab, setActiveTab] = useState<'today' | 'next'>('today')
  const [cleanerName, setCleanerName] = useState('')
  const [cleanerId, setCleanerId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch tasks for current cleaner
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true)

      // Get cleaner info from API endpoint
      const response = await fetch('/api/cleaners/me', {
        credentials: 'include',
      })

      if (!response.ok) {
        setError('Not authenticated')
        return
      }

      const cleanerData = await response.json()
      const currentCleanerId = cleanerData.cleanerId

      setCleanerId(currentCleanerId)
      setCleanerName(cleanerData.name || 'Limpador')

      // Fetch today's tasks
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayStr = today.toISOString().split('T')[0]

      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowStr = tomorrow.toISOString().split('T')[0]

      const { data: todayTasksData, error: todayError } = await supabase
        .from('cleaning_tasks')
        .select('*, properties(id, name, address)')
        .eq('cleaner_id', currentCleanerId)
        .eq('scheduled_date', todayStr)
        .order('scheduled_date', { ascending: true })

      if (todayError) throw todayError
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const enrichedTodayTasks = (todayTasksData || []).map((task: any) => ({
        ...task,
        property_name: task.properties?.name || 'Imóvel Desconhecido',
        property_address: task.properties?.address || '',
      }))
      setTasks(enrichedTodayTasks)

      // Fetch next 7 days tasks
      const sevenDaysLater = new Date(today)
      sevenDaysLater.setDate(sevenDaysLater.getDate() + 7)
      const sevenDaysStr = sevenDaysLater.toISOString().split('T')[0]

      const { data: nextWeekData, error: nextWeekError } = await supabase
        .from('cleaning_tasks')
        .select('*, properties(id, name, address)')
        .eq('cleaner_id', currentCleanerId)
        .gte('scheduled_date', tomorrowStr)
        .lte('scheduled_date', sevenDaysStr)
        .order('scheduled_date', { ascending: true })

      if (nextWeekError) throw nextWeekError
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const enrichedNextWeekTasks = (nextWeekData || []).map((task: any) => ({
        ...task,
        property_name: task.properties?.name || 'Imóvel Desconhecido',
        property_address: task.properties?.address || '',
      }))
      setNextWeekTasks(enrichedNextWeekTasks)

      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // Handle realtime updates
  const handleTaskUpdate = (updatedTask: CleaningTask) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) => (task.id === updatedTask.id ? updatedTask : task))
    )
    setNextWeekTasks((prevTasks) =>
      prevTasks.map((task) => (task.id === updatedTask.id ? updatedTask : task))
    )
  }

  useSupabaseRealtimeSubscription({
    table: 'cleaning_tasks',
    onUpdate: handleTaskUpdate,
    onInsert: handleTaskUpdate
  })

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const displayTasks = activeTab === 'today' ? tasks : nextWeekTasks
  const displayLabel = activeTab === 'today' ? 'Hoje' : 'Próximas'

  return (
    <div className="min-h-screen bg-white p-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          👋 {cleanerName || 'Olá'}
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          {displayLabel} · {displayTasks.length} tarefas
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab('today')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition ${
            activeTab === 'today'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
          style={{ minHeight: '44px' }}
        >
          Hoje ({tasks.length})
        </button>
        <button
          onClick={() => setActiveTab('next')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition ${
            activeTab === 'next'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
          style={{ minHeight: '44px' }}
        >
          Próximas ({nextWeekTasks.length})
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-600">Carregando tarefas...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700">
          {error}
        </div>
      ) : displayTasks.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">
            {activeTab === 'today'
              ? 'Sem tarefas agendadas para hoje'
              : 'Sem tarefas agendadas para os próximos 7 dias'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayTasks.map((task) => (
            <CleanerTaskCard
              key={task.id}
              task={task}
              onStatusChange={() => fetchTasks()}
            />
          ))}
        </div>
      )}
    </div>
  )
}
