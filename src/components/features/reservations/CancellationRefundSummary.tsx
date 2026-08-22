'use client'

import { CircleDollarSign, BadgeInfo } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/common/ui/alert'

export type CancellationRefundInfo = {
  refund_amount: number
  refund_percentage: number
  stripe_refund_id: string | null
  processed_at: string | null
}

interface CancellationRefundSummaryProps {
  refundInfo?: CancellationRefundInfo
  alreadyCancelled?: boolean
}

export function CancellationRefundSummary({
  refundInfo,
  alreadyCancelled,
}: CancellationRefundSummaryProps) {
  if (refundInfo) {
    return (
      <Alert className="mb-4 border-emerald-200 bg-emerald-50 text-emerald-900">
        <CircleDollarSign className="text-emerald-700" />
        <AlertTitle className="text-emerald-950">Cancelamento processado com reembolso</AlertTitle>
        <AlertDescription className="text-emerald-900">
          <div className="space-y-2 pt-1">
            <p>
              Reembolso: <strong>€{refundInfo.refund_amount.toFixed(2)}</strong>
            </p>
            <p>
              Percentual: <strong>{refundInfo.refund_percentage}%</strong>
            </p>
            <p className="text-xs text-emerald-700">
              Stripe Refund ID: {refundInfo.stripe_refund_id || 'em processamento'}
            </p>
            {refundInfo.processed_at && (
              <p className="text-xs text-emerald-700">
                Processado em {new Date(refundInfo.processed_at).toLocaleString()}
              </p>
            )}
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  if (alreadyCancelled) {
    return (
      <Alert className="mb-4 border-sky-200 bg-sky-50 text-sky-900">
        <BadgeInfo className="text-sky-700" />
        <AlertTitle className="text-sky-950">Reserva já estava cancelada</AlertTitle>
        <AlertDescription className="text-sky-900">
          Não foi necessário processar outra alteração.
        </AlertDescription>
      </Alert>
    )
  }

  return null
}
