'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { XCircle, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

export function CancelReservationButton({
  reservationId,
  confirmationCode
}: {
  reservationId: string
  confirmationCode?: string
}) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cancellationReason, setCancellationReason] = useState('')

  async function handleCancel() {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      const { error: updateError } = await supabase
        .from('reservations')
        .update({
          status: 'cancelled',
          cancellation_reason: cancellationReason || null,
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', reservationId)

      if (updateError) throw updateError

      // Notificar proprietário (fire-and-forget)
      fetch('/api/notifications/owner-reservation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservation_id: reservationId, type: 'cancellation' }),
      }).catch(err => console.error('Erro ao notificar proprietário sobre cancelamento:', err))

      toast.success('Reserva cancelada com sucesso!')
      router.refresh()
      setShowModal(false)
    } catch (err: unknown) {
      console.error('Erro ao cancelar reserva:', err)
      const message = err instanceof Error ? err.message : 'Erro ao cancelar reserva'
      toast.error(message)
      setError(message)
      setLoading(false)
    }
  }

  return (
    <>
      <Button variant="destructive" onClick={() => setShowModal(true)}>
        <XCircle className="h-4 w-4" />
        Cancelar
      </Button>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <DialogTitle>Cancelar Reserva</DialogTitle>
                <DialogDescription>
                  Esta ação não pode ser desfeita
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="mb-2">
            <p className="text-gray-700 mb-2">
              Tem certeza que deseja cancelar esta reserva?
            </p>
            {confirmationCode && (
              <p className="font-semibold text-gray-900 bg-gray-50 p-3 rounded-lg mb-4">
                Reserva #{confirmationCode}
              </p>
            )}

            {/* Motivo do cancelamento */}
            <div className="mt-4">
              <Label htmlFor="cancellation_reason" className="mb-2">
                Motivo do cancelamento (opcional)
              </Label>
              <Textarea
                id="cancellation_reason"
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                rows={3}
                placeholder="Ex: Cancelado pelo hóspede, mudança de planos, etc."
                className="resize-none"
              />
            </div>

            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                ⚠️ Após o cancelamento:
              </p>
              <ul className="text-sm text-yellow-700 mt-2 space-y-1 ml-4 list-disc">
                <li>O status mudará para &ldquo;Cancelada&rdquo;</li>
                <li>As datas ficarão disponíveis no calendário</li>
                <li>Esta ação não pode ser revertida</li>
              </ul>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)} disabled={loading}>
              Não, Voltar
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={loading}>
              {loading ? 'Cancelando...' : 'Sim, Cancelar Reserva'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
