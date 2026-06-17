'use client'

import { CleaningTask } from '@/types/cleaning'
import { useState } from 'react'
import Link from 'next/link'

const statusColors: Record<string, { bg: string; text: string; label: string; border: string }> = {
  pending: { bg: 'bg-gray-50', text: 'text-gray-700', label: 'Pendente', border: 'border-gray-200' },
  in_progress: { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'Em Progresso', border: 'border-yellow-200' },
  done: { bg: 'bg-green-50', text: 'text-green-700', label: 'Concluída', border: 'border-green-200' },
  issue: { bg: 'bg-red-50', text: 'text-red-700', label: 'Problema', border: 'border-red-200' }
}

interface CleanerTaskCardProps {
  task: CleaningTask
  onStatusChange?: (taskId: string, newStatus: string) => void
}

export default function CleanerTaskCard({ task, onStatusChange }: CleanerTaskCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const colors = statusColors[task.status] || statusColors.pending

  const handleStartCleaning = async (): Promise<void> => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/cleaner/tasks/${task.id}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      if (response.ok) {
        onStatusChange?.(task.id, 'in_progress')
      } else {
        alert('Erro ao iniciar tarefa')
      }
    } catch (error) {
      console.error('Error starting task:', error)
      alert('Erro ao iniciar tarefa')
    } finally {
      setIsLoading(false)
    }
  }

  const scheduledTime = new Date(task.scheduled_time).toLocaleTimeString('pt-PT', {
    hour: '2-digit',
    minute: '2-digit'
  })

  const completionTime = task.completed_at
    ? new Date(task.completed_at).toLocaleTimeString('pt-PT', {
        hour: '2-digit',
        minute: '2-digit'
      })
    : null

  const progressText = task.checklist_completion
    ? `${task.checklist_completion}% completo`
    : ''

  const completionPercent = task.checklist_completion ?? 0

  return (
    <Link href={`/pt-BR/cleaner/tasks/${task.id}`}>
      <div className={`p-4 rounded-lg border mb-3 cursor-pointer transition hover:shadow-md ${colors.bg} ${colors.border}`}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="text-sm font-semibold text-gray-600">⏰ {scheduledTime}</div>
            <div className="text-base font-bold text-gray-900 mt-1">{task.property_name}</div>
            <div className="text-xs text-gray-600 mt-1">
              Reserva #{task.booking_id} · {task.guest_name}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {task.status !== 'done' && completionPercent > 0 && (
          <div className="mb-3">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-brand-600 h-2 rounded-full transition-all"
                style={{ width: `${completionPercent}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-600 mt-1">{progressText}</p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${colors.text} ${colors.bg} border ${colors.border}`}>
            {task.status === 'done' && completionTime ? `✅ ${completionTime}` : colors.label}
          </span>

          <div className="flex items-center gap-2 text-xs text-gray-600">
            {(task.photo_count ?? 0) > 0 ? (
              <span>📸 {task.photo_count}</span>
            ) : null}
            <span>→</span>
          </div>
        </div>

        {task.notes && (task.status === 'issue' || task.status === 'in_progress') && (
          <div className="mt-2 text-xs text-gray-700 bg-white p-2 rounded border border-gray-200">
            📝 {task.notes}
          </div>
        )}
      </div>
    </Link>
  )
}
