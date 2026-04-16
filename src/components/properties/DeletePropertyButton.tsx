'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

export function DeletePropertyButton({ propertyId, propertyName }: {
  propertyId: string
  propertyName: string
}) {
  const router = useRouter()
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/properties/${propertyId}/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao eliminar propriedade')
      }

      toast.success('Propriedade eliminada com sucesso!')
      router.push('/properties')
      router.refresh()
    } catch (err: unknown) {
      console.error('Erro ao excluir propriedade:', err)
      const message = err instanceof Error ? err.message : 'Erro ao eliminar propriedade'
      toast.error(message)
      setError(message)
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        variant="destructive"
        onClick={() => setShowConfirm(true)}
        className="flex items-center gap-2"
      >
        <Trash2 className="h-4 w-4" />
        Excluir
      </Button>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <DialogTitle>Excluir Propriedade</DialogTitle>
                <DialogDescription>Esta ação não pode ser desfeita</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="mb-2">
            <p className="text-gray-700 mb-2">
              Tem certeza que deseja excluir a propriedade:
            </p>
            <p className="font-semibold text-gray-900 bg-gray-50 p-3 rounded-lg">
              {propertyName}
            </p>
            <p className="text-sm text-gray-600 mt-3">
              Todas as reservas, calendários e dados associados também serão removidos.
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading ? 'Excluindo...' : 'Sim, Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
