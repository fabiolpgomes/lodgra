'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Copy, Loader2 } from 'lucide-react'
import { formatCurrency, type CurrencyCode } from '@/lib/utils/currency'

export interface PixCharge {
  reservationId: string
  payload: string
  encodedImage: string
  amount: number
  currency: CurrencyCode
  expiresAt: string
}

interface PixPaymentProps {
  slug: string
  charge: PixCharge
  /** Volta ao passo de pagamento para gerar um novo Pix. */
  onRestart: () => void
}

const POLL_MS = 4000

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function PixPayment({ slug, charge, onRestart }: PixPaymentProps) {
  const router = useRouter()
  const [remainingMs, setRemainingMs] = useState(() => new Date(charge.expiresAt).getTime() - Date.now())
  const [copied, setCopied] = useState(false)
  const [expired, setExpired] = useState(false)
  const confirmedRef = useRef(false)

  const goToConfirmation = useCallback(() => {
    if (confirmedRef.current) return
    confirmedRef.current = true
    router.push(`/p/${slug}/booking-confirmed?reservation_id=${encodeURIComponent(charge.reservationId)}`)
  }, [router, slug, charge.reservationId])

  // Contagem regressiva.
  useEffect(() => {
    const timer = setInterval(() => {
      const left = new Date(charge.expiresAt).getTime() - Date.now()
      setRemainingMs(left)
      if (left <= 0) setExpired(true)
    }, 1000)
    return () => clearInterval(timer)
  }, [charge.expiresAt])

  // Confirmação automática: o webhook do Asaas confirma a reserva e este ecrã deteta.
  useEffect(() => {
    let cancelled = false
    async function check() {
      try {
        const res = await fetch(`/api/public/bookings/${charge.reservationId}/status`, { cache: 'no-store' })
        if (!res.ok || cancelled) return
        const data = (await res.json()) as { status?: string }
        if (data.status === 'confirmed') goToConfirmation()
        else if (data.status === 'expired' || data.status === 'cancelled') setExpired(true)
      } catch {
        // Falha de rede: tenta de novo no próximo ciclo.
      }
    }
    const timer = setInterval(check, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [charge.reservationId, goToConfirmation])

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(charge.payload)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Sem permissão da área de transferência: o código continua visível para copiar à mão.
    }
  }

  if (expired) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-medium">O tempo para pagar este Pix terminou.</p>
          <p className="mt-1">
            Se já pagou, não precisa de fazer mais nada: assim que o pagamento for reconhecido recebe a confirmação por e-mail.
            Caso contrário, gere um novo Pix.
          </p>
        </div>
        <button
          onClick={onRestart}
          className="w-full rounded-full bg-brand-blue px-4 py-3 text-sm font-medium text-white hover:bg-brand-gold transition-colors"
        >
          Gerar novo Pix
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-brand-gold/20 bg-brand-white p-5 text-center space-y-3">
        <p className="text-sm text-brand-text-medium">Pague com Pix no app do seu banco</p>
        <p className="text-2xl font-bold text-brand-text-dark">{formatCurrency(charge.amount, charge.currency)}</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`data:image/png;base64,${charge.encodedImage}`}
          alt="QR Code Pix"
          className="mx-auto h-52 w-52 rounded-lg border border-brand-gold/15"
        />
        <p className="text-xs text-brand-text-medium">
          Abra o app do banco, escolha pagar com Pix e leia o QR Code, ou use o código abaixo.
        </p>
      </div>

      <div className="rounded-2xl border border-brand-gold/20 bg-brand-white p-4 space-y-2">
        <p className="text-sm font-medium text-brand-text-dark">Pix copia e cola</p>
        <p className="break-all rounded-lg bg-brand-bg px-3 py-2 font-mono text-xs text-brand-text-medium select-all">
          {charge.payload}
        </p>
        <button
          onClick={copyCode}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-brand-gold/25 px-4 py-2.5 text-sm font-medium text-brand-blue hover:bg-brand-gold/10 transition-colors"
        >
          {copied ? <><Check className="h-4 w-4" /> Copiado</> : <><Copy className="h-4 w-4" /> Copiar código</>}
        </button>
      </div>

      <div className="flex items-center justify-center gap-2 text-sm text-brand-text-medium" aria-live="polite">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>A aguardar o pagamento · expira em {formatRemaining(remainingMs)}</span>
      </div>
      <p className="text-center text-xs text-brand-text-medium">
        Não feche esta página. A reserva é confirmada automaticamente assim que o pagamento for reconhecido.
      </p>
    </div>
  )
}
