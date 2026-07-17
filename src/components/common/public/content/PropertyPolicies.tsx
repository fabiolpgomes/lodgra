import { Clock, Sparkles, PawPrint } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency'

interface PropertyPoliciesProps {
  cleaningFee?: number | null
  cleaningFeeType?: string | null
  petFee?: number | null
  petFeeType?: string | null
  checkinFrom?: string | null
  checkinUntil?: string | null
  checkoutUntil?: string | null
  currency: string
}

function feeLabel(type: string | null | undefined) {
  return type === 'per_night' ? 'por noite' : 'por estadia'
}

export function PropertyPolicies({
  cleaningFee,
  cleaningFeeType,
  petFee,
  petFeeType,
  checkinFrom,
  checkinUntil,
  checkoutUntil,
  currency,
}: PropertyPoliciesProps) {
  const hasSchedules = checkinFrom || checkinUntil || checkoutUntil
  const hasFees = (cleaningFee && cleaningFee > 0) || (petFee && petFee > 0)

  if (!hasSchedules && !hasFees) return null

  return (
    <section className="py-6 border-t border-lodgra-border-subtle">
      <h2 className="text-xl font-semibold text-be-text mb-5">Políticas</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Check-in / Checkout */}
        {hasSchedules && (
          <div className="rounded-xl border border-lodgra-border-subtle bg-lodgra-neutral-50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-be-text-600" />
              <span className="text-sm font-semibold text-be-text">Horários</span>
            </div>
            <dl className="space-y-1.5 text-sm">
              {checkinFrom && (
                <div className="flex justify-between">
                  <dt className="text-be-text-muted">Check-in a partir das</dt>
                  <dd className="font-medium text-be-text">{checkinFrom}</dd>
                </div>
              )}
              {checkinUntil && (
                <div className="flex justify-between">
                  <dt className="text-be-text-muted">Check-in até às</dt>
                  <dd className="font-medium text-be-text">{checkinUntil}</dd>
                </div>
              )}
              {checkoutUntil && (
                <div className="flex justify-between">
                  <dt className="text-be-text-muted">Checkout até às</dt>
                  <dd className="font-medium text-be-text">{checkoutUntil}</dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {/* Fees */}
        {hasFees && (
          <div className="rounded-xl border border-lodgra-border-subtle bg-lodgra-neutral-50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-be-text-600" />
              <span className="text-sm font-semibold text-be-text">Taxas adicionais</span>
            </div>
            <dl className="space-y-1.5 text-sm">
              {cleaningFee && cleaningFee > 0 && (
                <div className="flex justify-between">
                  <dt className="flex items-center gap-1.5 text-be-text-muted">
                    Taxa de limpeza
                  </dt>
                  <dd className="font-medium text-be-text">
                    {formatCurrency(cleaningFee, currency as 'EUR' | 'BRL' | 'USD' | 'GBP')}
                    <span className="text-xs text-be-text-muted-500 ml-1">{feeLabel(cleaningFeeType)}</span>
                  </dd>
                </div>
              )}
              {petFee && petFee > 0 && (
                <div className="flex justify-between">
                  <dt className="flex items-center gap-1.5 text-be-text-muted">
                    <PawPrint className="h-3.5 w-3.5" />
                    Animais de estimação
                  </dt>
                  <dd className="font-medium text-be-text">
                    {formatCurrency(petFee, currency as 'EUR' | 'BRL' | 'USD' | 'GBP')}
                    <span className="text-xs text-be-text-muted-500 ml-1">{feeLabel(petFeeType)}</span>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </div>
    </section>
  )
}
