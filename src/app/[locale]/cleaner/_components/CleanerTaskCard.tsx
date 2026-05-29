'use client'

import { CleaningTask } from '@/types/cleaning'
import { useState } from 'react'

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Pendente' },
  in_progress: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Em Progresso' },
  done: { bg: 'bg-green-100', text: 'text-green-700', label: 'Concluída' },
  issue: { bg: 'bg-red-100', text: 'text-red-700', label: 'Problema' }
}

interface CleanerTaskCardProps {
  task: CleaningTask
  onStatusChange: (taskId: string, newStatus: string) => void
}

export default function CleanerTaskCard({ task, onStatusChange }: CleanerTaskCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const colors = statusColors[task.status] || statusColors.pending

  const handleStartCleaning = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/cleaner/tasks/${task.id}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      if (response.ok) {
        onStatusChange(task.id, 'in_progress')
      }
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

  return (
    <div className={`p-4 rounded-lg border mb-3 ${colors.bg}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="text-sm font-semibold text-gray-600">⏰ {scheduledTime}</div>
          <div className="text-base font-bold text-gray-900 mt-1">{task.property_name}</div>
          <div className="text-sm text-gray-600 mt-1">
            Reserva #{task.booking_id} · {task.guest_name}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3">
        <span className={`text-xs font-semibold px-2 py-1 rounded ${colors.text} ${colors.bg}`}>
          {task.status === 'done' && completionTime ? `✅ ${completionTime}` : colors.label}
        </span>

        {task.status === 'pending' && (
          <button
            onClick={handleStartCleaning}
            disabled={isLoading}
            className="px-3 py-1 bg-brand-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50 touch-min"
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            {isLoading ? '...' : '● Iniciar'}
          </button>
        )}

        {task.status === 'in_progress' && (
          <span className="text-sm font-medium text-yellow-700">✓ Em Progresso</span>
        )}
      </div>

      {task.notes && task.status === 'issue' && (
        <div className="mt-2 text-sm text-red-700 bg-red-50 p-2 rounded">
          {task.notes}
        </div>
      )}
    </div>
  )
}
