'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Clock, MapPin, FileText, CheckCircle, AlertCircle } from 'lucide-react'
import { CleaningTask } from '@/types/cleaning'

export default function CleanerTaskDetailPage() {
  const params = useParams()
  const router = useRouter()
  const taskId = params.id as string

  const [task, setTask] = useState<CleaningTask | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchTask = async () => {
      try {
        setLoading(true)
        const { data, error: fetchError } = await supabase
          .from('cleaning_tasks')
          .select('*, properties(id, name)')
          .eq('id', taskId)
          .single()

        if (fetchError) throw fetchError

        // Enrich with property name
        const enrichedTask = {
          ...data,
          property_name: data.properties?.name || 'Imóvel Desconhecido',
        }
        setTask(enrichedTask as CleaningTask)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar tarefa')
      } finally {
        setLoading(false)
      }
    }

    fetchTask()
  }, [taskId, supabase])

  const handleStatusChange = async (newStatus: string) => {
    if (!task) return

    try {
      const { error } = await supabase
        .from('cleaning_tasks')
        .update({
          status: newStatus,
          started_at: newStatus === 'in_progress' && !task.started_at ? new Date().toISOString() : undefined,
          completed_at: newStatus === 'done' ? new Date().toISOString() : undefined,
        })
        .eq('id', taskId)

      if (error) throw error

      setTask({
        ...task,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        status: newStatus as any,
        started_at: newStatus === 'in_progress' && !task.started_at ? new Date().toISOString() : task.started_at,
        completed_at: newStatus === 'done' ? new Date().toISOString() : task.completed_at,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar tarefa')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-4 flex items-center justify-center">
        <p className="text-gray-600">Carregando tarefa...</p>
      </div>
    )
  }

  if (error || !task) {
    return (
      <div className="min-h-screen bg-white p-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-lodgra-blue mb-4 hover:underline"
        >
          <ArrowLeft className="h-5 w-5" />
          Voltar
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error || 'Tarefa não encontrada'}
        </div>
      </div>
    )
  }

  const statusColors: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: 'bg-gray-50', text: 'text-gray-700', label: 'Pendente' },
    in_progress: { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'Em Progresso' },
    done: { bg: 'bg-green-50', text: 'text-green-700', label: 'Concluída' },
    issue: { bg: 'bg-red-50', text: 'text-red-700', label: 'Problema' },
  }

  const colors = statusColors[task.status] || statusColors.pending

  const scheduledTime = new Date(task.scheduled_time).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const scheduledDate = new Date(task.scheduled_date + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="min-h-screen bg-white p-4">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-lodgra-blue mb-4 hover:underline font-semibold"
        >
          <ArrowLeft className="h-5 w-5" />
          Voltar
        </button>
        <h1 className="text-3xl font-bold text-gray-900">{task.property_name}</h1>
        <p className="text-sm text-gray-600 mt-1">{scheduledDate}</p>
      </div>

      {/* Status Badge */}
      <div className={`inline-block px-4 py-2 rounded-full font-semibold mb-6 ${colors.bg} ${colors.text}`}>
        {colors.label}
      </div>

      {/* Task Details */}
      <div className="space-y-4 mb-8">
        {/* Date & Time */}
        <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
          <Clock className="h-5 w-5 text-lodgra-blue mt-1" />
          <div>
            <p className="text-sm text-gray-600">Data e Hora Agendada</p>
            <p className="text-lg font-semibold text-gray-900">{scheduledTime} · {scheduledDate}</p>
          </div>
        </div>

        {/* Property */}
        <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
          <MapPin className="h-5 w-5 text-lodgra-blue mt-1" />
          <div>
            <p className="text-sm text-gray-600">Propriedade</p>
            <p className="text-lg font-semibold text-gray-900">{task.property_name}</p>
          </div>
        </div>

        {/* Notes */}
        {task.notes && (
          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
            <FileText className="h-5 w-5 text-lodgra-blue mt-1" />
            <div>
              <p className="text-sm text-gray-600">Observações</p>
              <p className="text-gray-900">{task.notes}</p>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        {task.status === 'pending' && (
          <button
            onClick={() => handleStatusChange('in_progress')}
            className="w-full px-4 py-3 bg-lodgra-blue text-white rounded-lg font-semibold hover:bg-lodgra-blue/90 transition flex items-center justify-center gap-2"
          >
            <CheckCircle className="h-5 w-5" />
            Iniciar Limpeza
          </button>
        )}

        {task.status === 'in_progress' && (
          <>
            <button
              onClick={() => handleStatusChange('done')}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition flex items-center justify-center gap-2"
            >
              <CheckCircle className="h-5 w-5" />
              Marcar Concluída
            </button>
            <button
              onClick={() => handleStatusChange('issue')}
              className="w-full px-4 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition flex items-center justify-center gap-2"
            >
              <AlertCircle className="h-5 w-5" />
              Relatar Problema
            </button>
          </>
        )}

        {task.status === 'done' && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-center font-semibold">
            ✓ Tarefa Concluída
          </div>
        )}

        {task.status === 'issue' && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-center font-semibold">
            ! Problema Reportado
          </div>
        )}
      </div>
    </div>
  )
}
