'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/common/ui/button'
import { Alert, AlertDescription } from '@/components/common/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/common/ui/dialog'
import { toast } from 'sonner'

export function DeleteReservationButton({
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

  async function handleDelete() {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/reservations/${reservationId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao eliminar reserva')
      }

      toast.success('Reserva eliminada com sucesso!')
      router.push('/reservations')
    } catch (err: unknown) {
      console.error('Erro ao eliminar reserva:', err)
      const message = err instanceof Error ? err.message : 'Erro ao eliminar reserva'
      toast.error(message)
      setError(message)
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        className="text-destructive border-destructive hover:bg-destructive/10"
        onClick={() => setShowModal(true)}
      >
        <Trash2 className="h-4 w-4" />
        Eliminar
      </Button>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <DialogTitle>Eliminar Reserva</DialogTitle>
                <DialogDescription>
                  Esta ação é permanente e irreversível
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="mb-2">
            <p className="text-gray-700 mb-2">
              Tem certeza que deseja eliminar permanentemente esta reserva?
            </p>
            {confirmationCode && (
              <p className="font-semibold text-gray-900 bg-gray-50 p-3 rounded-lg mb-4">
                Reserva #{confirmationCode}
              </p>
            )}

            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800 font-medium">
                Ao eliminar:
              </p>
              <ul className="text-sm text-red-700 mt-2 space-y-1 ml-4 list-disc">
                <li>A reserva será removida permanentemente</li>
                <li>Os dados não podem ser recuperados</li>
                <li>Se foi importada, o hóspede temporário também será eliminado</li>
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
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading ? 'Eliminando...' : 'Sim, Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
