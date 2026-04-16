import { differenceInDays, format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar, Users, MapPin } from 'lucide-react'

interface BookingSummaryProps {
  propertyName: string
  city?: string | null
  checkin: string   // YYYY-MM-DD
  checkout: string  // YYYY-MM-DD
  guests: number
  pricePerNight?: number
  totalPrice: number  // Final price respecting pricing rules
  compact?: boolean
}

export function BookingSummary({
  propertyName,
  city,
  checkin,
  checkout,
  guests,
  pricePerNight = 0,
  totalPrice,
  compact = false,
}: BookingSummaryProps) {
  const checkinDate = parseISO(checkin)
  const checkoutDate = parseISO(checkout)
  const nights = differenceInDays(checkoutDate, checkinDate)
  const total = totalPrice

  const fmtDate = (d: Date) =>
    format(d, "d 'de' MMMM yyyy", { locale: ptBR })

  if (compact) {
    return (
      <div className="rounded-lg bg-gray-50 p-4 space-y-1 text-sm">
        <p className="font-medium text-gray-900">{propertyName}</p>
        <p className="text-gray-500">
          {format(checkinDate, 'dd/MM/yyyy')} → {format(checkoutDate, 'dd/MM/yyyy')} · {nights} noite{nights !== 1 ? 's' : ''}
        </p>
        <p className="font-semibold text-gray-900">{total.toFixed(2)} €</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 p-5 space-y-4">
      <div>
        <h3 className="font-semibold text-gray-900 text-base">{propertyName}</h3>
        {city && (
          <p className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
            <MapPin className="h-3.5 w-3.5" />
            {city}
          </p>
        )}
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-start gap-2 text-gray-700">
          <Calendar className="h-4 w-4 mt-0.5 text-gray-400 shrink-0" />
          <div>
            <p>{fmtDate(checkinDate)}</p>
            <p className="text-gray-400 text-xs">→ {fmtDate(checkoutDate)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-gray-700">
          <Users className="h-4 w-4 text-gray-400 shrink-0" />
          <span>{guests} hóspede{guests !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-3 space-y-1 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>{(nights > 0 ? (total / nights).toFixed(2) : '0.00')} € × {nights} noite{nights !== 1 ? 's' : ''}</span>
          <span>{total.toFixed(2)} €</span>
        </div>
        <div className="flex justify-between font-semibold text-gray-900 text-base pt-1">
          <span>Total</span>
          <span>{total.toFixed(2)} €</span>
        </div>
        <p className="text-xs text-gray-400">Impostos incluídos</p>
      </div>
    </div>
  )
}
