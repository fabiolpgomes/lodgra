'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/components/common/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/common/ui/dialog'
import { toast } from 'sonner'

export function CleanupReservationsButton() {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingCounts, setLoadingCounts] = useState(false)
  const [counts, setCounts] = useState<{ cancelled: number; phantom: number } | null>(null)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const openModal = async () => {
    setShowModal(true)
    setResult(null)
    setLoadingCounts(true)

    try {
      const response = await fetch('/api/reservations/cleanup')
      const data = await response.json()
      if (response.ok) {
        setCounts(data)
      }
    } catch {
      setCounts(null)
    } finally {
      setLoadingCounts(false)
    }
  }

  const handleCleanup = async (type: 'cancelled' | 'phantom' | 'all') => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/reservations/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })

      const data = await response.json()

      if (response.ok) {
        setResult({
          success: true,
          message: `${data.deleted} reserva(s) eliminada(s) com sucesso.`,
        })
        toast.success('Limpeza concluída com sucesso!')
        // Recarregar contagens
        const countsResponse = await fetch('/api/reservations/cleanup')
        const countsData = await countsResponse.json()
        if (countsResponse.ok) setCounts(countsData)
        // Atualizar a listagem
        router.refresh()
      } else {
        const errorMessage = data.error || 'Erro ao limpar reservas'
        setResult({
          success: false,
          message: errorMessage,
        })
        toast.error(errorMessage)
      }
    } catch {
      const errorMessage = 'Erro ao conectar com o servidor'
      setResult({
        success: false,
        message: errorMessage,
      })
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button variant="outline" onClick={openModal}>
        <Trash2 className="h-5 w-5" />
        Limpar Reservas
      </Button>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <DialogTitle>Limpar Reservas</DialogTitle>
                <DialogDescription>Eliminar reservas em massa</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {loadingCounts ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : counts ? (
            <div className="space-y-3 mb-6">
              <button
                onClick={() => handleCleanup('cancelled')}
                disabled={loading || counts.cancelled === 0}
                className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="text-left">
                  <p className="font-medium text-gray-900">Canceladas</p>
                  <p className="text-sm text-gray-500">Reservas com status cancelado</p>
                </div>
                <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-bold rounded-full">
                  {counts.cancelled}
                </span>
              </button>

              <button
                onClick={() => handleCleanup('phantom')}
                disabled={loading || counts.phantom === 0}
                className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="text-left">
                  <p className="font-medium text-gray-900">Fantasmas</p>
                  <p className="text-sm text-gray-500">Importadas por iCal sem dados reais de hóspede</p>
                </div>
                <span className="px-3 py-1 bg-orange-100 text-orange-800 text-sm font-bold rounded-full">
                  {counts.phantom}
                </span>
              </button>

              <button
                onClick={() => handleCleanup('all')}
                disabled={loading || (counts.cancelled === 0 && counts.phantom === 0)}
                className="w-full flex items-center justify-between p-4 border border-red-200 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="text-left">
                  <p className="font-medium text-red-900">Todas</p>
                  <p className="text-sm text-red-700">Canceladas + Fantasmas</p>
                </div>
                <span className="px-3 py-1 bg-red-200 text-red-900 text-sm font-bold rounded-full">
                  {counts.cancelled + counts.phantom}
                </span>
              </button>
            </div>
          ) : (
            <p className="text-gray-500 py-4">Erro ao carregar contagens</p>
          )}

          {loading && (
            <div className="flex items-center gap-2 text-gray-600 mb-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Eliminando reservas...</span>
            </div>
          )}

          {result && (
            <div
              className={`p-3 rounded-lg mb-4 ${
                result.success
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}
            >
              <p className="text-sm">{result.message}</p>
            </div>
          )}

          <Button
            variant="outline"
            onClick={() => setShowModal(false)}
            disabled={loading}
            className="w-full"
          >
            Fechar
          </Button>
        </DialogContent>
      </Dialog>
    </>
  )
}
