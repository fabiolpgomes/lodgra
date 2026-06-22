'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Clock, MapPin, FileText, CheckCircle, AlertCircle, Upload, Image } from 'lucide-react'
import { CleaningTask } from '@/types/cleaning'

export default function CleanerTaskDetailPage() {
  const params = useParams()
  const router = useRouter()
  const taskId = params.id as string

  const [task, setTask] = useState<CleaningTask | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [workDescription, setWorkDescription] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
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

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPhotos(Array.from(e.target.files))
    }
  }

  const handleUploadPhotos = async () => {
    if (photos.length === 0 || !task) return

    setUploading(true)
    try {
      // Upload each photo to Supabase storage
      const uploadedPhotos = []
      for (const photo of photos) {
        const fileName = `${taskId}/${Date.now()}-${photo.name}`
        const { error: uploadError } = await supabase.storage
          .from('cleaning-task-photos')
          .upload(fileName, photo)

        if (uploadError) throw uploadError
        uploadedPhotos.push(fileName)
      }

      // Save photo records to database
      const photoRecords = uploadedPhotos.map(fileName => ({
        task_id: taskId,
        file_path: fileName,
        uploaded_at: new Date().toISOString(),
      }))

      const { error: dbError } = await supabase
        .from('cleaning_photos')
        .insert(photoRecords)

      if (dbError) throw dbError

      // Save work description if provided
      if (workDescription.trim()) {
        const { error: noteError } = await supabase
          .from('cleaning_tasks')
          .update({ notes: workDescription })
          .eq('id', taskId)

        if (noteError) throw noteError
      }

      setPhotos([])
      setWorkDescription('')
      setError(null)
      // Refresh task
      const { data } = await supabase
        .from('cleaning_tasks')
        .select('*, properties(id, name)')
        .eq('id', taskId)
        .single()

      if (data) {
        const enriched = {
          ...data,
          property_name: data.properties?.name || 'Imóvel Desconhecido',
        }
        setTask(enriched as CleaningTask)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar fotos')
    } finally {
      setUploading(false)
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

  // Parse time from HH:MM:SS format (scheduled_time is stored as TIME type, not timestamp)
  const scheduledTime = task.scheduled_time 
    ? task.scheduled_time.slice(0, 5)
    : '00:00'

  // Parse date from YYYY-MM-DD format
  const scheduledDate = task.scheduled_date
    ? new Date(task.scheduled_date + 'T12:00:00').toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Data não disponível'

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

      {/* Work Documentation Section */}
      {task.status === 'in_progress' && (
        <div className="mb-8 space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Documentar Trabalho</h2>

          {/* Work Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              O que foi feito? (opcional)
            </label>
            <textarea
              value={workDescription}
              onChange={(e) => setWorkDescription(e.target.value)}
              placeholder="Descreva o trabalho realizado..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lodgra-blue focus:border-transparent"
            />
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Fotos do Trabalho
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
                id="photo-input"
              />
              <label htmlFor="photo-input" className="cursor-pointer">
                <Image className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Clique para selecionar fotos</p>
                <p className="text-xs text-gray-500 mt-1">(PNG, JPG, máx 10MB)</p>
              </label>
            </div>

            {photos.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">
                  {photos.length} foto(s) selecionada(s):
                </p>
                <ul className="text-sm text-gray-700">
                  {photos.map((photo, idx) => (
                    <li key={idx} className="py-1">• {photo.name}</li>
                  ))}
                </ul>
              </div>
            )}

            {(photos.length > 0 || workDescription.trim()) && (
              <button
                onClick={handleUploadPhotos}
                disabled={uploading}
                className="w-full mt-4 px-4 py-2 bg-lodgra-blue text-white rounded-lg font-semibold hover:bg-lodgra-blue/90 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Upload className="h-4 w-4" />
                {uploading ? 'Enviando...' : 'Enviar Documentação'}
              </button>
            )}
          </div>
        </div>
      )}

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
