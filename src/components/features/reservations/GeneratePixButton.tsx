'use client'

import { useState } from 'react'
import { QrCode, Loader2, ExternalLink, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/common/ui/button'
import { toast } from 'sonner'

interface Props {
  reservationId: string
  initialPaymentLink?: string
  initialStatus?: string
}

export function GeneratePixButton({ reservationId, initialPaymentLink, initialStatus }: Props) {
  const [loading, setLoading] = useState(false)
  const [paymentLink, setPaymentLink] = useState(initialPaymentLink)
  const [status, setStatus] = useState(initialStatus)

  async function generatePix() {
    setLoading(true)
    try {
      const res = await fetch('/api/payments/asaas/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId }),
      })

      const data = await res.json()
      if (data.success) {
        setPaymentLink(data.paymentLink)
        setStatus('PENDING')
        toast.success('Cobrança PIX gerada com sucesso!')
      } else {
        toast.error(data.error || 'Erro ao gerar PIX')
      }
    } catch (err) {
      toast.error('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  if (paymentLink) {
    return (
      <div className="space-y-3">
        <Button 
          variant="outline" 
          className="w-full h-12 rounded-2xl border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 font-bold"
          asChild
        >
          <a href={paymentLink} target="_blank" rel="noopener noreferrer">
            <QrCode className="mr-2 h-4 w-4" />
            Visualizar PIX / Checkout
            <ExternalLink className="ml-2 h-3 w-3 opacity-50" />
          </a>
        </Button>
        <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-600">
          <CheckCircle2 className="h-3 w-3" />
          Link de Pagamento Ativo
        </div>
      </div>
    )
  }

  return (
    <Button 
      onClick={generatePix} 
      disabled={loading}
      className="w-full h-12 rounded-2xl !bg-blue-700 hover:!bg-blue-800 !text-white font-bold shadow-lg shadow-blue-500/10 transition-all active:scale-95"
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <QrCode className="mr-2 h-4 w-4" />
      )}
      Gerar Cobrança PIX (Asaas)
    </Button>
  )
}
