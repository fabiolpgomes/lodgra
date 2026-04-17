'use client'

import { useState } from 'react'
import { Mail } from 'lucide-react'
import { Button } from '@/components/common/ui/button'
import { toast } from 'sonner'

interface ResendWelcomeEmailButtonProps {
  userId: string
  userEmail: string
}

export function ResendWelcomeEmailButton({ userId, userEmail }: ResendWelcomeEmailButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleResend = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/users/resend-welcome-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Falha ao reenviar email')
        return
      }

      toast.success(`Email reenviado para ${userEmail}`)
    } catch (error) {
      console.error('Error resending email:', error)
      toast.error('Erro ao reenviar email')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handleResend}
      disabled={isLoading}
      variant="ghost"
      size="sm"
      className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50"
      title="Reenviar email de boas-vindas"
    >
      <Mail className="h-4 w-4" />
    </Button>
  )
}
