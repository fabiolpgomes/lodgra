'use client'

import { useRouter } from '@/lib/i18n/routing'
import { useLocale } from '@/lib/i18n/routing'
import { Building2, Users } from 'lucide-react'
import { formatCurrency, CurrencyCode } from '@/lib/utils/currency'
import { ReservationUI } from './types/reservation-ui'
import { Badge } from '@/components/common/ui/badge'
import { getReservationPlatformLabel } from '@/lib/reservations/platform'

interface ReservationRowProps {
  reservation: ReservationUI
}

const COUNTRY_FLAGS: Record<string, string> = {
  Portugal: '🇵🇹',
  Brasil: '🇧🇷',
  Spain: '🇪🇸',
  France: '🇫🇷',
  UK: '🇬🇧',
  Germany: '🇩🇪',
  Italy: '🇮🇹',
}

export function ReservationRow({ reservation }: ReservationRowProps) {
  const router = useRouter()
  const locale = useLocale()
  const reservationNotes = reservation.notes || ''
  const minimumOverrideMatch = reservationNotes.match(
    /Exceção aprovada para mínimo de noites:\s*(\d+)\s*noites?/i
  )
  const hasApprovedMinimumOverride = Boolean(minimumOverrideMatch)

  // Get property from direct relationship or nested listing
  const rawProperty = reservation.properties || (reservation.property_listings as any)?.[0]?.properties
  const property = Array.isArray(rawProperty) ? rawProperty[0] : rawProperty
  const listing = Array.isArray(reservation.property_listings) ? reservation.property_listings[0] : reservation.property_listings
  const platformName = getReservationPlatformLabel(
    reservation.booking_source || reservation.source || listing?.platforms?.display_name
  )

  // Parse guest_name into first_name and last_name
  const guestNameParts = reservation.guest_name?.trim().split(/\s+/) || []
  const guest = guestNameParts.length > 0 ? {
    first_name: guestNameParts[0],
    last_name: guestNameParts.slice(1).join(' '),
    email: reservation.guest_email
  } : null

  const truncateName = (name: string | undefined, maxChars: number = 40): string => {
    if (!name) return 'Propriedade não encontrada'
    return name.length > maxChars ? `${name.substring(0, maxChars)}...` : name
  }

  const truncateEmail = (email: string | undefined, maxChars: number = 40): string => {
    if (!email) return '-'
    return email.length > maxChars ? `${email.substring(0, maxChars)}...` : email
  }

  const countryFlag = property?.country ? COUNTRY_FLAGS[property.country] || '🌍' : ''

  const statusConfig = {
    pending: { label: 'Pendente', className: 'bg-brand-gold/10 text-brand-gold hover:bg-brand-gold/10' },
    confirmed: { label: 'Confirmada', className: 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10' },
    cancelled: { label: 'Cancelada', className: 'bg-red-500/10 text-red-600 hover:bg-red-500/10' },
    completed: { label: 'Concluída', className: 'bg-brand-bg text-brand-text-medium hover:bg-brand-bg' },
  }

  const status = statusConfig[reservation.status] || statusConfig.pending

  const handleClick = () => {
    const prefix = locale ? `/${locale}` : ''
    router.push(`${prefix}/reservations/${reservation.id}`)
  }

  return (
    <tr
      className="hover:bg-brand-bg/50 cursor-pointer transition-colors"
      onClick={handleClick}
    >
      <td className="px-2.5 py-2.5 max-w-sm">
        <div className="flex items-start gap-2">
          <div className="shrink-0 mt-0.5">
            <Building2 className="h-4 w-4 text-brand-text-medium" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-brand-text-dark line-clamp-1">
              {truncateName(property?.name)}
            </div>
            <div className="text-xs text-brand-text-medium line-clamp-1">
              {property?.city}
              {platformName && (
                <span className="ml-1 px-1 py-0.5 text-[10px] font-medium bg-brand-blue/10 text-brand-blue rounded inline-block">
                  {platformName}
                </span>
              )}
            </div>
          </div>
        </div>
      </td>

      <td className="px-2.5 py-2.5 max-w-sm">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-brand-text-medium shrink-0" />
          <div className="min-w-0">
            <div className="text-xs font-medium text-brand-text-dark truncate">
              {guest ? `${guest.first_name} ${guest.last_name}` : 'Hóspede não cadastrado'}
            </div>
            <div className="text-xs text-brand-text-medium truncate" title={guest?.email}>{truncateEmail(guest?.email)}</div>
          </div>
        </div>
      </td>

      <td className="px-2.5 py-2.5 whitespace-nowrap text-xs text-brand-text-dark w-20">
        {new Date(reservation.check_in).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
      </td>

      <td className="px-2.5 py-2.5 whitespace-nowrap text-xs text-brand-text-dark w-20">
        {new Date(reservation.check_out).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
      </td>

      <td className="px-2.5 py-2.5 whitespace-nowrap w-28">
        <div className="flex flex-col gap-1">
          <Badge className={`${status.className} text-xs w-fit`}>
            {status.label}
          </Badge>
          {hasApprovedMinimumOverride && (
            <Badge className="w-fit text-[10px] font-semibold bg-amber-100 text-amber-800 hover:bg-amber-100">
              Mín. {minimumOverrideMatch?.[1] || '-'} noites aprovado
            </Badge>
          )}
        </div>
      </td>

      <td className="px-2.5 py-2.5 whitespace-nowrap text-xs text-brand-text-dark w-24">
        {(() => {
          const amount = reservation.total_price || reservation.total_amount || 0
          const currency = (property as { currency?: string } | null)?.currency?.toUpperCase()
            || reservation.currency?.toUpperCase()
            || null

          return currency
            ? formatCurrency(amount, currency as CurrencyCode)
            : Number(amount).toFixed(2)
        })()}
      </td>

      <td className="px-2.5 py-2.5 whitespace-nowrap text-right w-20">
        <div className="flex items-center justify-end gap-1">
          <span className="text-base">{countryFlag}</span>
          <span className="text-xs font-medium text-brand-blue hover:text-brand-blue transition-colors cursor-pointer truncate">
            {property?.country || '-'}
          </span>
        </div>
      </td>

      <td className="px-2.5 py-2.5 whitespace-nowrap text-right w-16">
        <span className="text-xs font-medium text-brand-blue hover:text-brand-blue transition-colors">
          Ver →
        </span>
      </td>
    </tr>
  )
}
