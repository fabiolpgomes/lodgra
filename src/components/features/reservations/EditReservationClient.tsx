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
  const [showPermanentDeleteDialog, setShowPermanentDeleteDialog] = useState(false)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const handleSave = async (data: Partial<ReservationUI>) => {
    try {
      setLoading(true)
      const url = `/api/reservations/${reservation.id}`
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }))
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

  const handlePermanentDelete = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/reservations/${reservation.id}?action=delete-permanent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }))
        throw new Error(error.error || `Falha ao excluir (${response.status})`)
      }

      setToast({ message: 'Reserva excluída permanentemente!', type: 'success' })
      setShowPermanentDeleteDialog(false)
      setTimeout(() => router.push(`/${locale}/reservations`), 1000)
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : 'Erro ao excluir',
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="bg-[#FBFAF6] rounded-[14px] border border-[#E5DFD2] p-6">
        <h2 className="text-base font-semibold text-[#1B2430] mb-4">Ações</h2>
        <div className="space-y-2">
          <Button
            className="w-full bg-[#10203E] hover:bg-[#0c1830] text-white"
            onClick={() => setShowEditForm(true)}
            disabled={loading}
          >
            <Edit className="h-4 w-4 mr-2" />
            Editar Reserva
          </Button>
          <Button
            className="w-full text-[#9f2f1f] hover:text-[#7f2115] hover:bg-[#9f2f1f]/10 border border-[#E5DFD2]"
            variant="outline"
            onClick={() => setShowDeleteDialog(true)}
            disabled={loading}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Cancelar Reserva
          </Button>
          {reservation.status === 'cancelled' && (
            <Button
              className="w-full text-[#7f2115] hover:text-white hover:bg-[#9f2f1f] border border-[#9f2f1f]"
              variant="outline"
              onClick={() => setShowPermanentDeleteDialog(true)}
              disabled={loading}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir Permanentemente
            </Button>
          )}
        </div>
      </div>

      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 p-4 rounded-[8px] text-white shadow-lg ${
            toast.type === 'success' ? 'bg-emerald-600' : 'bg-[#9f2f1f]'
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
        <div className="fixed inset-0 bg-[rgba(12,24,48,0.9)] flex items-center justify-center z-50 p-4">
          <div className="bg-[#FBFAF6] rounded-[14px] max-w-sm w-full p-6">
            <h2 className="text-lg font-semibold text-[#1B2430] mb-2">Cancelar Reserva?</h2>
            <p className="text-sm text-[#4D5566] mb-4">
              Esta ação é reversível. A reserva será marcada como cancelada mas os dados serão preservados para auditoria.
            </p>
            <div className="bg-[#C9A227]/10 border border-[#C9A227]/30 rounded-[8px] p-3 text-sm text-[#C9A227] mb-6">
              ⚠️ Certifique-se de notificar o hóspede antes de cancelar.
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                className="border-[#E5DFD2] text-[#1B2430] hover:bg-[#F7F5EF]"
                onClick={() => setShowDeleteDialog(false)}
                disabled={loading}
              >
                Manter
              </Button>
              <Button
                onClick={handleDelete}
                disabled={loading}
                className="bg-[#9f2f1f] hover:bg-[#7f2115] text-white"
              >
                {loading ? 'Cancelando...' : 'Cancelar Reserva'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Confirmation Dialog */}
      {showPermanentDeleteDialog && (
        <div className="fixed inset-0 bg-[rgba(12,24,48,0.9)] flex items-center justify-center z-50 p-4">
          <div className="bg-[#FBFAF6] rounded-[14px] max-w-sm w-full p-6">
            <h2 className="text-lg font-semibold text-[#1B2430] mb-2">⚠️ Excluir Permanentemente?</h2>
            <p className="text-sm text-[#4D5566] mb-4">
              Esta ação é <strong>IRREVERSÍVEL</strong>. A reserva será removida completamente do banco de dados. Os dados não poderão ser recuperados.
            </p>
            <div className="bg-[#9f2f1f]/10 border border-[#9f2f1f]/30 rounded-[8px] p-3 text-sm text-[#9f2f1f] mb-6">
              🚨 Apenas reservas canceladas podem ser excluídas. Esta operação é auditada para conformidade.
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                className="border-[#E5DFD2] text-[#1B2430] hover:bg-[#F7F5EF]"
                onClick={() => setShowPermanentDeleteDialog(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                onClick={handlePermanentDelete}
                disabled={loading}
                className="bg-[#7f2115] hover:bg-[#5f1910] text-white"
              >
                {loading ? 'Excluindo...' : 'Excluir Permanentemente'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
