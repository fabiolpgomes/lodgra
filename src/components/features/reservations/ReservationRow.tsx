'use client'

import { useRouter } from '@/lib/i18n/routing'
import { Building2, Users } from 'lucide-react'
import { formatCurrency, CurrencyCode } from '@/lib/utils/currency'
import { ReservationUI } from './types/reservation-ui'
import { Badge } from '@/components/common/ui/badge'

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

  // Supabase retorna objeto (inner join) ou array dependendo da relação
  const rawListing = reservation.property_listings
  const listing = Array.isArray(rawListing) ? rawListing[0] : rawListing
  const rawProperty = listing?.properties
  const property = Array.isArray(rawProperty) ? rawProperty[0] : rawProperty
  const platformName = listing?.platforms?.display_name
  const rawGuest = reservation.guests
  const guest = Array.isArray(rawGuest) ? rawGuest[0] : rawGuest

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
    pending: { label: 'Pendente', className: 'bg-orange-100 text-orange-800 hover:bg-orange-100' },
    confirmed: { label: 'Confirmada', className: 'bg-green-100 text-green-800 hover:bg-green-100' },
    cancelled: { label: 'Cancelada', className: 'bg-red-100 text-red-800 hover:bg-red-100' },
    completed: { label: 'Concluída', className: 'bg-gray-100 text-gray-800 hover:bg-gray-100' },
  }

  const status = statusConfig[reservation.status] || statusConfig.pending

  const handleClick = () => {
    router.push(`/reservations/${reservation.id}`)
  }

  return (
    <tr
      className="hover:bg-gray-50 cursor-pointer transition-colors"
      onClick={handleClick}
    >
      <td className="px-4 py-3">
        <div className="flex items-start gap-2">
          <div className="shrink-0 mt-0.5">
            <Building2 className="h-4 w-4 text-gray-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-gray-900 line-clamp-1">
              {truncateName(property?.name)}
            </div>
            <div className="text-xs text-gray-500">
              {property?.city}
              {platformName && (
                <span className="ml-1 px-1 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 rounded">
                  {platformName}
                </span>
              )}
            </div>
          </div>
        </div>
      </td>

      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-gray-400 shrink-0" />
          <div className="min-w-0">
            <div className="text-xs font-medium text-gray-900 truncate">
              {guest ? `${guest.first_name} ${guest.last_name}` : 'Hóspede não cadastrado'}
            </div>
            <div className="text-xs text-gray-500 truncate" title={guest?.email}>{truncateEmail(guest?.email)}</div>
          </div>
        </div>
      </td>

      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900">
        {new Date(reservation.check_in).toLocaleDateString('pt-BR')}
      </td>

      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900">
        {new Date(reservation.check_out).toLocaleDateString('pt-BR')}
      </td>

      <td className="px-4 py-3 whitespace-nowrap">
        <Badge className={`${status.className} text-xs`}>
          {status.label}
        </Badge>
      </td>

      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900">
        {formatCurrency(reservation.total_amount, ((property as { currency?: string } | null)?.currency || reservation.currency || 'EUR') as CurrencyCode)}
      </td>

      <td className="px-4 py-3 whitespace-nowrap text-right">
        <div className="flex items-center justify-end gap-1.5">
          <span className="text-lg">{countryFlag}</span>
          <span className="text-xs font-medium text-[#1E3A8A] hover:text-[#D4AF37] transition-colors cursor-pointer">
            {property?.country || '-'}
          </span>
        </div>
      </td>

      <td className="px-4 py-3 whitespace-nowrap text-right">
        <span className="text-xs font-medium text-blue-600 hover:text-blue-900">
          Ver →
        </span>
      </td>
    </tr>
  )
}
