'use client'

import { useState } from 'react'
import { Copy, Check, RefreshCw, Link2 } from 'lucide-react'
import { Button } from '@/components/common/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/common/ui/dialog'
import { Alert, AlertDescription } from '@/components/common/ui/alert'
import { toast } from 'sonner'

interface AccessLinkModalProps {
  isOpen: boolean
  onClose: () => void
  taskId: string
  initialLink?: string
}

export function AccessLinkModal({
  isOpen,
  onClose,
  taskId,
  initialLink,
}: AccessLinkModalProps) {
  const [accessLink, setAccessLink] = useState(initialLink || '')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRegenerateLink() {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/cleaning/tasks/${taskId}/regenerate-access-link`,
        {
          method: 'POST',
          credentials: 'include',
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao regenerar link')
      }

      setAccessLink(data.accessLink)
      toast.success('Link regenerado com sucesso!')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao regenerar link'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async () => {
    try {
      const fullLink = `${window.location.origin}${accessLink}`
      await navigator.clipboard.writeText(fullLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success('Link copiado para clipboard!')
    } catch {
      toast.error('Erro ao copiar link')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-brand-600" />
            <DialogTitle>Link de Acesso do Limpador</DialogTitle>
          </div>
          <DialogDescription>
            Compartilhe este link com o limpador para acessar as tarefas
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {accessLink && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600 font-medium">Link:</span>
                <code className="flex-1 text-xs text-gray-900 break-all font-mono">
                  {accessLink}
                </code>
              </div>

              <Button
                onClick={copyToClipboard}
                variant="outline"
                size="sm"
                className="w-full"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar Link
                  </>
                )}
              </Button>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-900">
              📋 O link expira em 7 dias. Se expirar, pode regenerar um novo aqui.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Fechar
          </Button>
          <Button onClick={handleRegenerateLink} disabled={loading}>
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Regenerando...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerar Link
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
