'use client'

import Link from 'next/link'
import { ExportToExcelButton } from './ExportToExcelButton'
import { formatCurrency, groupByCurrency, type CurrencyCode } from '@/lib/utils/currency'

interface ReservationRow {
  id: string
  check_in: string
  check_out: string
  total_amount: number | string | null
  currency: string | null
  status: string
  guests: { first_name: string; last_name: string } | null
  property_listings: { properties: { name: string; city: string } }
}

interface RevenueTableProps {
  reservations: ReservationRow[]
  startDate: string
  endDate: string
}

export function RevenueTable({ reservations, startDate, endDate }: RevenueTableProps) {
  // Preparar dados para exportação
  const exportData = reservations.map(r => {
    const checkIn = new Date(r.check_in)
    const checkOut = new Date(r.check_out)
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
    const guestName = r.guests ? `${r.guests.first_name} ${r.guests.last_name}` : 'Sem nome'

    return {
      'Check-in': checkIn.toLocaleDateString('pt-BR'),
      'Check-out': checkOut.toLocaleDateString('pt-BR'),
      'Noites': nights,
      'Hóspede': guestName,
      'Propriedade': r.property_listings.properties.name,
      'Cidade': r.property_listings.properties.city,
      'Status': r.status,
      'Moeda': r.currency || 'EUR',
      'Valor Total': r.total_amount ? Number(r.total_amount).toFixed(2) : '0.00',
      'Diária Média': r.total_amount ? (Number(r.total_amount) / nights).toFixed(2) : '0.00',
    }
  })

  // Calcular totais por moeda
  const totalsByCurrency = groupByCurrency(
    reservations.map(r => ({
      currency: (r.currency || 'EUR') as CurrencyCode,
      amount: r.total_amount ? Number(r.total_amount) : 0
    }))
  )

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Receitas Detalhadas</h3>
          <p className="text-sm text-gray-600">
            {reservations.length} reserva(s) no período
          </p>
        </div>
        <ExportToExcelButton
          data={exportData}
          filename={`receitas_${startDate}_${endDate}`}
          sheetName="Receitas"
        />
      </div>

      {reservations.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>Nenhuma reserva confirmada no período selecionado</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check-in
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check-out
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hóspede
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Propriedade
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Noites
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor Total
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Diária Média
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reservations.map((reservation) => {
                const checkIn = new Date(reservation.check_in)
                const checkOut = new Date(reservation.check_out)
                const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
                const total = reservation.total_amount ? Number(reservation.total_amount) : 0
                const avgNightly = nights > 0 ? total / nights : 0
                const currency = (reservation.currency || 'EUR') as CurrencyCode
                const guestName = reservation.guests
                  ? `${reservation.guests.first_name} ${reservation.guests.last_name}`
                  : 'Sem nome'

                return (
                  <tr key={reservation.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {checkIn.toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {checkOut.toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      <Link
                        href={`/reservations/${reservation.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {guestName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {reservation.property_listings.properties.name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                      {nights}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                      {formatCurrency(total, currency)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 text-right">
                      {formatCurrency(avgNightly, currency)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="bg-gray-50 font-semibold">
              {Object.entries(totalsByCurrency).map(([currency, amount]) => (
                <tr key={currency}>
                  <td colSpan={5} className="px-4 py-3 text-sm text-gray-900 text-right">
                    TOTAL ({currency}):
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">
                    {formatCurrency(amount, currency as CurrencyCode)}
                  </td>
                  <td></td>
                </tr>
              ))}
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
