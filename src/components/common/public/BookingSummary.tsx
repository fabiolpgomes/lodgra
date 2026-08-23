import { differenceInDays, format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar, Users, MapPin } from 'lucide-react'
import { formatCurrency, type CurrencyCode } from '@/lib/utils/currency'

interface CancellationPolicy {
  id?: string
  policy_type: string
  full_refund_days: number
  partial_refund_days?: number | null
  partial_refund_percent?: number | null
}

interface BookingSummaryProps {
  propertyName: string
  city?: string | null
  checkin: string   // YYYY-MM-DD
  checkout: string  // YYYY-MM-DD
  guests: number
  pricePerNight?: number
  totalPrice: number  // Final price respecting pricing rules
  accommodationTotal?: number
  fees?: { label: string; amount: number }[]
  currency?: CurrencyCode
  compact?: boolean
  cancellationPolicy?: CancellationPolicy | null
}

function getCancellationPolicyLabel(policyType: string): string {
  const labels: Record<string, string> = {
    flexible: 'Flexível',
    moderate: 'Moderada',
    limited: 'Limitada',
    firm: 'Firme',
    rigid: 'Rígida',
  }
  return labels[policyType] || policyType
}

function formatDaysLabel(days: number): string {
  return `${days} ${days === 1 ? 'dia' : 'dias'}`
}

export function BookingSummary({
  propertyName,
  city,
  checkin,
  checkout,
  guests,
  pricePerNight: _pricePerNight = 0,
  totalPrice,
  accommodationTotal,
  fees,
  currency = 'EUR',
  compact = false,
  cancellationPolicy,
}: BookingSummaryProps) {
  const checkinDate = parseISO(checkin)
  const checkoutDate = parseISO(checkout)
  const nights = differenceInDays(checkoutDate, checkinDate)
  const total = totalPrice

  const fmtDate = (d: Date) =>
    format(d, "d 'de' MMMM yyyy", { locale: ptBR })

  const cancellationPolicyText = cancellationPolicy
    ? `Política: ${getCancellationPolicyLabel(cancellationPolicy.policy_type)} · reembolso integral até ${formatDaysLabel(cancellationPolicy.full_refund_days)} antes do check-in${
        cancellationPolicy.partial_refund_days != null && cancellationPolicy.partial_refund_percent != null
          ? ` · ${cancellationPolicy.partial_refund_percent}% até ${formatDaysLabel(cancellationPolicy.partial_refund_days)} antes`
          : ''
      }`
    : null

  if (compact) {
    return (
      <div className="rounded-2xl border border-brand-gold/15 bg-brand-white p-4 space-y-1 text-sm shadow-sm">
        <p className="font-medium text-brand-text-dark">{propertyName}</p>
        <p className="text-brand-text-medium">
          {format(checkinDate, 'dd/MM/yyyy')} → {format(checkoutDate, 'dd/MM/yyyy')} · {nights} noite{nights !== 1 ? 's' : ''}
        </p>
        <p className="font-semibold text-brand-blue">{formatCurrency(total, currency)}</p>
        {cancellationPolicyText && (
          <p className="text-xs text-brand-text-medium pt-1">{cancellationPolicyText}</p>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-brand-gold/15 bg-brand-white p-5 space-y-4 shadow-sm transition-all hover:border-brand-gold/45 hover:shadow-[0_18px_42px_rgba(201,162,39,0.14)]">
      <div>
        <h3 className="font-semibold text-brand-text-dark text-base">{propertyName}</h3>
        {city && (
          <p className="flex items-center gap-1 text-sm text-brand-text-medium mt-0.5">
            <MapPin className="h-3.5 w-3.5 text-brand-gold" />
            {city}
          </p>
        )}
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-start gap-2 text-brand-text-medium">
          <Calendar className="h-4 w-4 mt-0.5 text-brand-gold shrink-0" />
          <div>
            <p>{fmtDate(checkinDate)}</p>
            <p className="text-brand-text-medium text-xs">→ {fmtDate(checkoutDate)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-brand-text-medium">
          <Users className="h-4 w-4 text-brand-gold shrink-0" />
          <span>{guests} hóspede{guests !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <div className="border-t border-brand-gold/15 pt-3 space-y-1 text-sm">
        <div className="flex justify-between text-brand-text-medium">
          <span>{formatCurrency(nights > 0 ? (accommodationTotal ?? total) / nights : 0, currency)} × {nights} noite{nights !== 1 ? 's' : ''}</span>
          <span>{formatCurrency(accommodationTotal ?? total, currency)}</span>
        </div>
        {fees?.map((fee, i) => (
          <div key={i} className="flex justify-between text-brand-text-medium">
            <span>{fee.label}</span>
            <span>{formatCurrency(fee.amount, currency)}</span>
          </div>
        ))}
        <div className="flex justify-between font-semibold text-brand-text-dark text-base pt-1">
          <span>Total</span>
          <span className="text-brand-blue">{formatCurrency(total, currency)}</span>
        </div>
        <p className="text-xs text-brand-text-medium">Impostos incluídos</p>
        {cancellationPolicyText && (
          <p className="text-xs text-brand-text-medium pt-1 border-t border-brand-gold/10">
            {cancellationPolicyText}
          </p>
        )}
      </div>
    </div>
  )
}
