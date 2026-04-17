'use client'

import { useRouter } from 'next/navigation'
import { Building2, Users } from 'lucide-react'
import { formatCurrency, CurrencyCode } from '@/lib/utils/currency'
import { ReservationUI } from './types/reservation-ui'
import { Badge } from '@/components/common/ui/badge'

interface ReservationRowProps {
  reservation: ReservationUI
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
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <Building2 className="h-5 w-5 text-gray-400 mr-2" />
          <div>
            <div className="text-sm font-medium text-gray-900">
              {property?.name || 'Propriedade não encontrada'}
            </div>
            <div className="text-sm text-gray-500">
              {property?.city}, {property?.country}
              {platformName && (
                <span className="ml-2 px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                  {platformName}
                </span>
              )}
            </div>
          </div>
        </div>
      </td>

      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <Users className="h-5 w-5 text-gray-400 mr-2" />
          <div>
            <div className="text-sm font-medium text-gray-900">
              {guest ? `${guest.first_name} ${guest.last_name}` : 'Hóspede não cadastrado'}
            </div>
            <div className="text-sm text-gray-500">{guest?.email || '-'}</div>
          </div>
        </div>
      </td>

      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {new Date(reservation.check_in).toLocaleDateString('pt-BR')}
      </td>

      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {new Date(reservation.check_out).toLocaleDateString('pt-BR')}
      </td>

      <td className="px-6 py-4 whitespace-nowrap">
        <Badge className={status.className}>
          {status.label}
        </Badge>
      </td>

      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {formatCurrency(reservation.total_amount, (reservation.currency as CurrencyCode) || 'EUR')}
      </td>

      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <span className="text-blue-600 hover:text-blue-900 font-medium">
          Ver detalhes →
        </span>
      </td>
    </tr>
  )
}
