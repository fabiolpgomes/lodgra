'use client'

import { useState } from 'react'
import { Send, Check, AlertCircle, Loader } from 'lucide-react'

interface SendConfirmationButtonProps {
  reservationId: string
  guestEmail?: string | null
}

export function SendConfirmationButton({ reservationId, guestEmail }: SendConfirmationButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const handleSendConfirmation = async () => {
    if (!guestEmail) {
      setStatus('error')
      setErrorMsg('Email do hóspede não disponível')
      return
    }

    setIsLoading(true)
    setStatus('idle')
    setErrorMsg('')

    try {
      const response = await fetch('/api/email/send-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao enviar email')
      }

      setStatus('success')
      setTimeout(() => setStatus('idle'), 3000)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido'
      setStatus('error')
      setErrorMsg(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleSendConfirmation}
        disabled={isLoading || !guestEmail}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-blue-700 hover:bg-blue-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="flex items-center gap-2">
          {isLoading ? (
            <Loader className="h-4 w-4 animate-spin" />
          ) : status === 'success' ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {isLoading ? 'Enviando...' : 'Envio de confirmação'}
        </span>
        {status === 'success' && (
          <span className="text-xs text-green-600 font-medium">Enviado!</span>
        )}
        {status === 'error' && (
          <AlertCircle className="h-4 w-4 text-red-600" />
        )}
      </button>
      {status === 'error' && (
        <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded">
          {errorMsg}
        </p>
      )}
    </div>
  )
}
