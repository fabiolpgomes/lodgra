'use client'

import { useState, useMemo, useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
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
  properties: { id: string; name: string }[]
  selectedPropertyId: string
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

  const propertyName = r.properties?.name || r.property_listings?.properties?.name || '-'

  return { guestName, propertyName }
}

export function ReservationsFilter({
  reservations,
  canCreate,
  pagination,
  currentMonth,
  properties,
  selectedPropertyId,
}: ReservationsFilterProps) {
  const locale = useLocale() || 'pt-BR'
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const paginationBasePath = useMemo(() => {
    const params = new URLSearchParams(
      Array.from(searchParams.entries()).filter(([key]) => key !== 'page')
    )
    const query = params.toString()
    return query ? `${pathname}?${query}` : pathname
  }, [pathname, searchParams])

  function clearFilters() {
    setSearch('')
    setStatusFilter('all')
    handlePropertyChange('all')
  }

  // Restore a valid persisted filter when the URL has no explicit selection.
  useEffect(() => {
    if (selectedPropertyId !== 'all' || searchParams.has('property_id')) return

    const storedPropertyId = localStorage.getItem(getStorageKey('property'))
    if (!storedPropertyId || !properties.some(property => property.id === storedPropertyId)) {
      localStorage.removeItem(getStorageKey('property'))
      return
    }

    const params = new URLSearchParams(searchParams.toString())
    params.set('property_id', storedPropertyId)
    params.delete('page')
    router.replace(`${pathname}?${params.toString()}`)
  }, [pathname, properties, router, searchParams, selectedPropertyId])

  function handlePropertyChange(propertyId: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('page')

    if (propertyId === 'all') {
      params.delete('property_id')
      localStorage.removeItem(getStorageKey('property'))
    } else {
      params.set('property_id', propertyId)
      localStorage.setItem(getStorageKey('property'), propertyId)
    }

    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  const filtered = useMemo(() => {
    return reservations.filter(r => {
      // Status filter
      if (statusFilter !== 'all' && r.status !== statusFilter) return false

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase()
        const { guestName, propertyName } = getReservationData(r)
        if (!guestName.toLowerCase().includes(q) && !propertyName.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [reservations, search, statusFilter])

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
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <MonthNavigator currentMonth={currentMonth} />
          <div className="flex items-center gap-2 text-xs text-brand-text-medium sm:hidden">
            <span className="rounded-full bg-brand-bg px-3 py-1 font-semibold">
              Toque num cartão para abrir
            </span>
          </div>
        </div>
      )}

      <div className="mb-4 rounded-2xl border border-brand-border bg-brand-white p-4 shadow-sm sm:hidden">
        <p className="text-[10px] font-black uppercase tracking-[1.5px] text-brand-text-medium">Acesso rápido</p>
        <div className="mt-3 grid grid-cols-1 gap-2">
          {canCreate && (
            <Link href={getLocalizedPath('/reservations/new', locale)}>
              <Button variant="premium-primary" className="h-12 w-full justify-center">
                <Plus className="h-4 w-4" />
                Nova Reserva
              </Button>
            </Link>
          )}
          <Button
            type="button"
            variant="outline"
            className="h-12 w-full justify-center"
            onClick={clearFilters}
          >
            Limpar filtros
          </Button>
        </div>
      </div>

      {/* Search + Filters */}
      <PremiumCard className="p-4 mb-8 relative z-0">
        <div className="flex flex-col gap-4">
          {/* Row 1: Search and Property Filter */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_13rem]">
            <div className="relative flex-1">
              <Input
                placeholder="Procurar hóspede..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="rounded"
              />
            </div>
            <Select value={selectedPropertyId} onValueChange={handlePropertyChange}>
              <SelectTrigger className="w-full rounded">
                <SelectValue placeholder="Propriedade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as propriedades</SelectItem>
                {properties.map(property => (
                  <SelectItem key={property.id} value={property.id}>{property.name}</SelectItem>
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
            <button
              type="button"
              onClick={clearFilters}
              className="ml-auto rounded-full border border-brand-border bg-white px-3 py-1 text-xs font-semibold text-brand-text-medium transition-colors hover:border-brand-gold/40 hover:text-brand-text-dark"
            >
              Limpar
            </button>
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
                          const cur = (
                            r.properties?.currency?.toUpperCase()
                            || r.property_listings?.properties?.currency?.toUpperCase()
                            || r.currency?.toUpperCase()
                            || null
                          ) as CurrencyCode | null
                          return cur
                            ? formatCurrency(Number(r.total_amount), cur)
                            : Number(r.total_amount).toFixed(2)
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
            {pagination && (
              <PaginationNav
                {...pagination}
                basePath={paginationBasePath}
              />
            )}
          </PremiumCard>
        </>
      )}
    </>
  )
}
