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

export function DeleteUserButton({
  userId,
  userName
}: {
  userId: string
  userName?: string
}) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao eliminar utilizador')
      }

      toast.success('Utilizador eliminado com sucesso!')
      router.push('/admin/users')
      router.refresh()
    } catch (err: unknown) {
      console.error('Erro ao eliminar utilizador:', err)
      const message = err instanceof Error ? err.message : 'Erro ao eliminar utilizador'
      toast.error(message)
      setError(message)
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowModal(true)}
        title="Eliminar utilizador"
        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50"
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <DialogTitle>Eliminar Utilizador</DialogTitle>
                <DialogDescription>Esta ação é permanente e irreversível</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="mb-2">
            <p className="text-gray-700 mb-2">
              Tem certeza que deseja eliminar permanentemente este utilizador?
            </p>
            {userName && (
              <p className="font-semibold text-gray-900 bg-gray-50 p-3 rounded-lg mb-4">
                {userName}
              </p>
            )}

            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800 font-medium">
                Ao eliminar:
              </p>
              <ul className="text-sm text-red-700 mt-2 space-y-1 ml-4 list-disc">
                <li>O utilizador será removido permanentemente</li>
                <li>Todas as atribuições de propriedades serão removidas</li>
                <li>O utilizador não poderá mais aceder ao sistema</li>
              </ul>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
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
