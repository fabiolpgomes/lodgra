'use client'

import { useState, useMemo, useEffect } from 'react'
import { Filter, Calendar, Plus, ArrowRight } from 'lucide-react'
import { MonthNavigator } from '@/components/common/ui/MonthNavigator'
import Link from 'next/link'
import { Input } from '@/components/common/ui/input'
import { Button } from '@/components/common/ui/button'
import { Badge } from '@/components/common/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/common/ui/select'
import { ReservationRow } from './ReservationRow'
import { ReservationUI } from './types/reservation-ui'
import { formatCurrency, type CurrencyCode } from '@/lib/utils/currency'
import { PaginationNav } from '@/components/common/ui/PaginationNav'
import { getLocalizedPath, useLocale } from '@/lib/i18n/routing'
import { PremiumCard } from '@/components/common/layout/PremiumPage'

interface ReservationsFilterProps {
  reservations: ReservationUI[]
  canCreate: boolean
  pagination?: { page: number; total: number; pageSize: number }
  currentMonth?: string
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
  pending: { label: 'Pendente', className: 'bg-brand-gold/10 text-brand-gold' },
  confirmed: { label: 'Confirmada', className: 'bg-emerald-500/10 text-emerald-600' },
  cancelled: { label: 'Cancelada', className: 'bg-red-500/10 text-red-600' },
  completed: { label: 'Concluída', className: 'bg-brand-bg text-brand-text-medium' },
}

function getReservationData(r: ReservationUI) {
  const guestName = r.guest_name?.trim() || 'Hóspede'
  const rawListing = r.property_listings
  const listing = Array.isArray(rawListing) ? rawListing[0] : rawListing
  const rawProperty = listing?.properties
  const property = Array.isArray(rawProperty) ? rawProperty[0] : rawProperty
  const propertyName = property?.name || '-'
  return { guestName, propertyName }
}

export function ReservationsFilter({ reservations, canCreate, pagination, currentMonth }: ReservationsFilterProps) {
  const locale = useLocale() || 'pt-BR'
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [propertyFilter, setPropertyFilter] = useState<string>(() => {
    if (typeof window === 'undefined') return 'all'
    return localStorage.getItem(getStorageKey('property')) || 'all'
  })

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
    <PremiumCard className="p-12 text-center">
      <Calendar className="h-16 w-16 text-brand-gold mx-auto mb-4" />
      <h3 className="text-xl font-bold text-brand-text-dark mb-2">
        {reservations.length === 0 ? 'Nenhuma reserva cadastrada' : 'Nenhum resultado encontrado'}
      </h3>
      <p className="text-brand-text-medium text-sm mb-6">
        {reservations.length === 0
          ? 'Comece criando sua primeira reserva manual ou aguarde sincronização das plataformas.'
          : 'Tente ajustar os filtros ou o termo de pesquisa.'}
      </p>
      {reservations.length === 0 && canCreate && (
        <Link href={getLocalizedPath('/reservations/new', locale)}>
          <Button variant="premium-primary">
            <Plus className="h-5 w-5" />
            Criar Primeira Reserva
          </Button>
        </Link>
      )}
    </PremiumCard>
  )

  return (
    <>
      {/* Month Navigator */}
      {currentMonth && (
        <div className="flex items-center justify-between mb-4">
          <MonthNavigator currentMonth={currentMonth} />
        </div>
      )}

      {/* Search + Filters */}
      <PremiumCard className="p-4 mb-8 relative z-0">
        <div className="flex flex-col gap-4">
          {/* Row 1: Search and Property Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Input
                placeholder="Procurar hóspede..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="rounded"
              />
            </div>
            <Select value={propertyFilter} onValueChange={setPropertyFilter}>
              <SelectTrigger className="w-full sm:w-52 rounded">
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

          {/* Row 2: Status Filters — pill tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-brand-text-medium shrink-0" />
            {STATUS_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  statusFilter === f.value
                    ? 'bg-brand-blue text-white'
                    : 'bg-brand-bg text-brand-text-medium hover:bg-brand-bg/80'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </PremiumCard>

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
                  href={getLocalizedPath(`/reservations/${r.id}`, locale)}
                  className="block border border-brand-border rounded-lg bg-brand-white p-4 transition-all hover:border-brand-gold/40 hover:shadow-[0_18px_42px_rgba(201,162,39,0.14)]"
                >
                  <div className="flex items-start justify-between mb-2">
                    <Badge className={`${status.className} hover:${status.className} text-xs`}>
                      {status.label}
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-brand-text-medium shrink-0 mt-0.5" />
                  </div>
                  <p className="font-semibold text-brand-text-dark text-sm">{guestName}</p>
                  <p className="text-brand-text-medium text-xs mt-0.5">{propertyName}</p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-brand-border/50">
                    <div className="flex items-center gap-4 text-xs text-brand-text-medium">
                      <span><span className="text-gray-500">In </span>{checkIn}</span>
                      <span><span className="text-gray-500">Out </span>{checkOut}</span>
                    </div>
                    {r.total_amount ? (
                      <span className="text-sm font-semibold text-brand-text-dark">
                        {(() => {
                          const rawL = r.property_listings
                          const listing = Array.isArray(rawL) ? rawL[0] : rawL
                          const rawP = listing?.properties
                          const prop = Array.isArray(rawP) ? rawP[0] : rawP
                          const cur = (prop?.currency || r.currency || 'EUR') as CurrencyCode
                          return formatCurrency(Number(r.total_amount), cur)
                        })()}
                      </span>
                    ) : null}
                  </div>
                </Link>
              )
            })}
            {filtered.length < reservations.length && (
              <p className="text-center text-sm text-brand-text-medium py-2">
                Mostrando {filtered.length} de {reservations.length} reservas
              </p>
            )}
          </div>

          {/* Tablet+: tabela Airbnb */}
          <PremiumCard className="hidden sm:block overflow-x-auto">
            <table className="min-w-full">
              <thead className="relative z-10 bg-brand-white">
                <tr className="border-b border-brand-border">
                  <th className="px-2.5 py-2 text-left text-xs font-semibold text-brand-text-medium uppercase tracking-wider max-w-sm">Propriedade</th>
                  <th className="px-2.5 py-2 text-left text-xs font-semibold text-brand-text-medium uppercase tracking-wider max-w-sm">Hóspede</th>
                  <th className="px-2.5 py-2 text-left text-xs font-semibold text-brand-text-medium uppercase tracking-wider w-20">Check-in</th>
                  <th className="px-2.5 py-2 text-left text-xs font-semibold text-brand-text-medium uppercase tracking-wider w-20">Check-out</th>
                  <th className="px-2.5 py-2 text-left text-xs font-semibold text-brand-text-medium uppercase tracking-wider w-28">Status</th>
                  <th className="px-2.5 py-2 text-left text-xs font-semibold text-brand-text-medium uppercase tracking-wider w-24">Valor</th>
                  <th className="px-2.5 py-2 text-right text-xs font-semibold text-brand-text-medium uppercase tracking-wider w-20">País</th>
                  <th className="px-2.5 py-2 text-right text-xs font-semibold text-brand-text-medium uppercase tracking-wider w-16">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/50">
                {filtered.map(r => (
                  <ReservationRow key={r.id} reservation={r} />
                ))}
              </tbody>
            </table>
            {filtered.length < reservations.length && (
              <div className="px-5 py-3 text-xs text-brand-text-medium border-t border-brand-border/50">
                Mostrando {filtered.length} de {reservations.length} reservas nesta página
              </div>
            )}
            {pagination && <PaginationNav {...pagination} />}
          </PremiumCard>
        </>
      )}
    </>
  )
}
