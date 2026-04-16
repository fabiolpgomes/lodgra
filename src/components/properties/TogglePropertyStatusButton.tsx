'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Power, AlertTriangle, CheckCircle } from 'lucide-react'
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

export function TogglePropertyStatusButton({
  propertyId,
  propertyName,
  isActive,
}: {
  propertyId: string
  propertyName: string
  isActive: boolean
}) {
  const router = useRouter()
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleToggle() {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/properties/${propertyId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao alterar status')
      }

      const newStatus = data.is_active
      toast.success(
        newStatus
          ? 'Propriedade ativada com sucesso!'
          : 'Propriedade desativada com sucesso!'
      )
      router.refresh()
      setShowConfirm(false)
    } catch (err: unknown) {
      console.error('Erro ao alterar status:', err)
      const message = err instanceof Error ? err.message : 'Erro ao alterar status'
      toast.error(message)
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const buttonVariant = isActive ? 'destructive' : 'outline'
  const buttonLabel = isActive ? 'Desativar' : 'Ativar'
  const Icon = isActive ? Power : CheckCircle

  return (
    <>
      <Button
        variant={buttonVariant}
        onClick={() => setShowConfirm(true)}
        className="flex items-center gap-2"
      >
        <Icon className="h-4 w-4" />
        {buttonLabel}
      </Button>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div
                className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                  isActive
                    ? 'bg-orange-100'
                    : 'bg-green-100'
                }`}
              >
                {isActive ? (
                  <Power className="h-6 w-6 text-orange-600" />
                ) : (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                )}
              </div>
              <div>
                <DialogTitle>
                  {isActive ? 'Desativar Propriedade' : 'Ativar Propriedade'}
                </DialogTitle>
                <DialogDescription>
                  {isActive
                    ? 'Esta ação não afeta os dados'
                    : 'A propriedade voltará a aparecer nas listas'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="mb-2">
            <p className="text-gray-700 mb-2">
              {isActive
                ? 'Tem a certeza que deseja desativar a propriedade:'
                : 'Tem a certeza que deseja ativar a propriedade:'}
            </p>
            <p className="font-semibold text-gray-900 bg-gray-50 p-3 rounded-lg">
              {propertyName}
            </p>
            {isActive && (
              <p className="text-sm text-gray-600 mt-3">
                A propriedade deixará de aparecer nas listas, mas todos os dados,
                reservas e histórico serão mantidos. Pode reativá-la a qualquer
                momento quando voltar a trabalhar com o cliente.
              </p>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirm(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              variant={isActive ? 'destructive' : 'default'}
              onClick={handleToggle}
              disabled={loading}
            >
              {loading
                ? isActive
                  ? 'Desativando...'
                  : 'Ativando...'
                : isActive
                  ? 'Sim, Desativar'
                  : 'Sim, Ativar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
