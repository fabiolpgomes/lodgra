'use client'

import { useState } from 'react'
import { useRouter } from '@/lib/i18n/routing'
import { ReservationUI } from './types/reservation-ui'
import { EditReservationForm } from './EditReservationForm'
import { Button } from '@/components/common/ui/button'
import { Trash2, Edit } from 'lucide-react'

interface EditReservationClientProps {
  reservation: ReservationUI
  locale: string
}

export function EditReservationClient({ reservation, locale }: EditReservationClientProps) {
  const router = useRouter()
  const [showEditForm, setShowEditForm] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const handleSave = async (data: Partial<ReservationUI>) => {
    try {
      setLoading(true)
      console.log('Updating reservation:', { id: reservation.id, data })
      const url = `/api/reservations/${reservation.id}`
      console.log('Request URL:', url)
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        console.error('Response status:', response.status)
        const error = await response.json().catch(() => ({ error: response.statusText }))
        console.error('Error response:', error)
        throw new Error(error.error || `Falha ao salvar (${response.status})`)
      }

      setToast({ message: 'Reserva atualizada com sucesso!', type: 'success' })
      setTimeout(() => router.refresh(), 1000)
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : 'Erro ao salvar',
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/reservations/${reservation.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Cancelada pelo usuário' }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || 'Falha ao cancelar')
      }

      setToast({ message: 'Reserva cancelada com sucesso!', type: 'success' })
      setTimeout(() => router.push(`/${locale}/reservations`), 1000)
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : 'Erro ao cancelar',
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Ações</h2>
        <div className="space-y-2">
          <Button
            className="w-full"
            variant="outline"
            onClick={() => setShowEditForm(true)}
            disabled={loading}
          >
            <Edit className="h-4 w-4 mr-2" />
            Editar Reserva
          </Button>
          <Button
            className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
            variant="outline"
            onClick={() => setShowDeleteDialog(true)}
            disabled={loading}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Cancelar Reserva
          </Button>
        </div>
      </div>

      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 p-4 rounded-lg text-white ${
            toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Edit Form Modal */}
      {showEditForm && (
        <EditReservationForm
          reservation={reservation}
          onClose={() => setShowEditForm(false)}
          onSave={handleSave}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-sm w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Cancelar Reserva?</h2>
            <p className="text-sm text-gray-600 mb-4">
              Esta ação é reversível. A reserva será marcada como cancelada mas os dados serão preservados para auditoria.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800 mb-6">
              ⚠️ Certifique-se de notificar o hóspede antes de cancelar.
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
                disabled={loading}
              >
                Manter
              </Button>
              <Button
                onClick={handleDelete}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {loading ? 'Cancelando...' : 'Cancelar Reserva'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
