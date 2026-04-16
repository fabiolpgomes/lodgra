'use client'

import { useState, useMemo, useEffect } from 'react'
import { Search, Filter, Calendar, Plus, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ReservationRow } from './ReservationRow'
import { ReservationUI } from '@/types/reservation-ui'
import { formatCurrency, type CurrencyCode } from '@/lib/utils/currency'
import { PaginationNav } from '@/components/ui/PaginationNav'

interface ReservationsFilterProps {
  reservations: ReservationUI[]
  canCreate: boolean
  pagination?: { page: number; total: number; pageSize: number }
}

type StatusFilter = 'all' | 'confirmed' | 'pending' | 'cancelled'

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'confirmed', label: 'Confirmadas' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'cancelled', label: 'Canceladas' },
]

function getStorageKey(key: string): string {
  return `reservations_filter_${key}`
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pendente', className: 'bg-orange-100 text-orange-800' },
  confirmed: { label: 'Confirmada', className: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelada', className: 'bg-red-100 text-red-800' },
  completed: { label: 'Concluída', className: 'bg-gray-100 text-gray-800' },
}

function getReservationData(r: ReservationUI) {
  const rawGuest = r.guests
  const guest = Array.isArray(rawGuest) ? rawGuest[0] : rawGuest
  const guestName = `${guest?.first_name || ''} ${guest?.last_name || ''}`.trim() || 'Hóspede'
  const rawListing = r.property_listings
  const listing = Array.isArray(rawListing) ? rawListing[0] : rawListing
  const rawProperty = listing?.properties
  const property = Array.isArray(rawProperty) ? rawProperty[0] : rawProperty
  const propertyName = property?.name || '-'
  return { guestName, propertyName }
}

export function ReservationsFilter({ reservations, canCreate, pagination }: ReservationsFilterProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [propertyFilter, setPropertyFilter] = useState<string>(() => localStorage.getItem(getStorageKey('property')) || 'all')

  // Save property filter to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(getStorageKey('property'), propertyFilter)
  }, [propertyFilter])

  // Extract unique properties from reservations
  const uniqueProperties = useMemo(() => {
    const props = new Set<string>()
    reservations.forEach(r => {
      const { propertyName } = getReservationData(r)
      if (propertyName && propertyName !== '-') props.add(propertyName)
    })
    return Array.from(props).sort()
  }, [reservations])

  const filtered = useMemo(() => {
    return reservations.filter(r => {
      // Status filter
      if (statusFilter !== 'all' && r.status !== statusFilter) return false

      // Property filter
      if (propertyFilter !== 'all') {
        const { propertyName } = getReservationData(r)
        if (propertyName !== propertyFilter) return false
      }

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase()
        const { guestName, propertyName } = getReservationData(r)
        if (!guestName.toLowerCase().includes(q) && !propertyName.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [reservations, search, statusFilter, propertyFilter])

  const emptyState = (
    <div className="bg-white rounded-lg shadow p-12 text-center">
      <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        {reservations.length === 0 ? 'Nenhuma reserva cadastrada' : 'Nenhum resultado encontrado'}
      </h3>
      <p className="text-gray-600 mb-6">
        {reservations.length === 0
          ? 'Comece criando sua primeira reserva manual ou aguarde sincronização das plataformas.'
          : 'Tente ajustar os filtros ou o termo de pesquisa.'}
      </p>
      {reservations.length === 0 && canCreate && (
        <Button asChild>
          <Link href="/reservations/new">
            <Plus className="h-5 w-5" />
            Criar Primeira Reserva
          </Link>
        </Button>
      )}
    </div>
  )

  return (
    <>
      {/* Search + Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col gap-4">
          {/* Row 1: Search and Property Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Pesquisar por hóspede ou propriedade..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={propertyFilter} onValueChange={setPropertyFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Propriedade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as propriedades</SelectItem>
                {uniqueProperties.map(prop => (
                  <SelectItem key={prop} value={prop}>{prop}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Row 2: Status Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-5 w-5 text-gray-400 shrink-0" />
            {STATUS_FILTERS.map(f => (
              <Button
                key={f.value}
                size="sm"
                variant={statusFilter === f.value ? 'default' : 'ghost'}
                className={statusFilter === f.value ? 'bg-blue-600 text-white hover:bg-blue-700' : 'text-gray-600'}
                onClick={() => setStatusFilter(f.value)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? emptyState : (
        <>
          {/* Mobile: cards */}
          <div className="block sm:hidden space-y-3">
            {filtered.map(r => {
              const { guestName, propertyName } = getReservationData(r)
              const status = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending
              const checkIn = r.check_in ? new Date(r.check_in).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '-'
              const checkOut = r.check_out ? new Date(r.check_out).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '-'
              return (
                <Link
                  key={r.id}
                  href={`/reservations/${r.id}`}
                  className="block bg-white rounded-xl shadow p-4 active:bg-gray-50"
                >
                  <div className="flex items-start justify-between mb-2">
                    <Badge className={`${status.className} hover:${status.className} text-xs`}>
                      {status.label}
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                  </div>
                  <p className="font-semibold text-gray-900 text-sm">{guestName}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{propertyName}</p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-4 text-xs text-gray-600">
                      <span><span className="text-gray-400">In </span>{checkIn}</span>
                      <span><span className="text-gray-400">Out </span>{checkOut}</span>
                    </div>
                    {r.total_amount ? (
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(Number(r.total_amount), (r.currency || 'EUR') as CurrencyCode)}
                      </span>
                    ) : null}
                  </div>
                </Link>
              )
            })}
            {filtered.length < reservations.length && (
              <p className="text-center text-sm text-gray-500 py-2">
                Mostrando {filtered.length} de {reservations.length} reservas
              </p>
            )}
          </div>

          {/* Tablet+: tabela */}
          <div className="hidden sm:block bg-white rounded-lg shadow overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Propriedade</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hóspede</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-in</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-out</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtered.map(r => (
                  <ReservationRow key={r.id} reservation={r} />
                ))}
              </tbody>
            </table>
            {filtered.length < reservations.length && (
              <div className="px-6 py-3 bg-gray-50 text-sm text-gray-500 border-t">
                Mostrando {filtered.length} de {reservations.length} reservas nesta página
              </div>
            )}
            {pagination && <PaginationNav {...pagination} />}
          </div>
        </>
      )}
    </>
  )
}
