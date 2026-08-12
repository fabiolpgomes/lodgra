import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Calendar, Plus, Clock, CheckCircle, XCircle, Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { CleanupReservationsButton } from '@/components/features/reservations/CleanupReservationsButton'
import { ReservationsFilter } from '@/components/features/reservations/ReservationsFilter'
import { AuthLayout } from '@/components/common/layout/AuthLayout'
import { getUserAccess } from '@/lib/auth/getUserAccess'
import { Button } from '@/components/common/ui/button'
import { ReservationUI } from '@/components/features/reservations/types/reservation-ui'
import { parsePage, getRange, PAGE_SIZE } from '@/lib/utils/pagination'
import { PremiumMetricCard, PremiumPageHeader, PremiumPageShell } from '@/components/common/layout/PremiumPage'

export default async function ReservationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ page?: string; month?: string; property_id?: string }>
}) {
  const { locale } = await params
  const queryParams = await searchParams
  const page = parsePage(queryParams)
  const { from, to } = getRange(page)

  const monthParam = queryParams.month || new Date().toISOString().slice(0, 7)
  const requestedPropertyId = queryParams.property_id || 'all'
  const [mYear, mMonth] = monthParam.split('-').map(Number)
  const monthStart = `${monthParam}-01`
  const monthEnd = `${monthParam}-${String(new Date(mYear, mMonth, 0).getDate()).padStart(2, '0')}`

  const supabase = await createClient()
  const access = await getUserAccess(supabase)

  if (!access) {
    redirect('/login')
  }

  const { profile, propertyIds } = access
  const userRole = profile.role
  const canCreate = userRole === 'admin' || userRole === 'gestor'

  let propertyOptionsQuery = supabase
    .from('reservations')
    .select('property_id')
    .lte('check_in', monthEnd)
    .gte('check_out', monthStart)

  if (propertyIds) {
    propertyOptionsQuery = propertyOptionsQuery.in('property_id', propertyIds)
  }

  const propertyOptionsResult = await propertyOptionsQuery
  const optionPropertyIds = Array.from(new Set(
    (propertyOptionsResult.data || []).map((r: { property_id: string | null }) => r.property_id).filter((id): id is string => Boolean(id))
  ))
  const selectedPropertyId = requestedPropertyId === 'all' || optionPropertyIds.includes(requestedPropertyId)
    ? requestedPropertyId
    : 'all'

  // Reservation data and counters run in parallel after validating the filter.
  let dataQuery = supabase
    .from('reservations')
    .select('*', { count: 'exact' })
    .lte('check_in', monthEnd)
    .gte('check_out', monthStart)
    .order('check_in', { ascending: true })
    .range(from, to)

  let cConf = supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('reservation_status', 'confirmed').lte('check_in', monthEnd).gte('check_out', monthStart)
  let cPend = supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('reservation_status', 'pending').lte('check_in', monthEnd).gte('check_out', monthStart)
  let cCanc = supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('reservation_status', 'cancelled').lte('check_in', monthEnd).gte('check_out', monthStart)
  if (propertyIds) {
    dataQuery = dataQuery.in('property_id', propertyIds)
    cConf = cConf.in('property_id', propertyIds)
    cPend = cPend.in('property_id', propertyIds)
    cCanc = cCanc.in('property_id', propertyIds)
  }

  if (selectedPropertyId !== 'all') {
    dataQuery = dataQuery.eq('property_id', selectedPropertyId)
    cConf = cConf.eq('property_id', selectedPropertyId)
    cPend = cPend.eq('property_id', selectedPropertyId)
    cCanc = cCanc.eq('property_id', selectedPropertyId)
  }

  const [dataResult, confResult, pendResult, cancResult] = await Promise.all([
    dataQuery,
    cConf,
    cPend,
    cCanc,
  ])

  if (dataResult.error) {
    console.error('Erro ao buscar reservas:', dataResult.error)
  }

  // Buscar properties e listings em paralelo
  const reservationData = dataResult.data || []
  const reservationPropertyIds = reservationData.map((r: { property_id?: string }) => r.property_id).filter((id): id is string => Boolean(id))
  const propertyIdsArray = Array.from(new Set([...optionPropertyIds, ...reservationPropertyIds]))

  const [propertiesResult, listingsResult] = await Promise.all([
    propertyIdsArray.length > 0 ? supabase.from('properties').select('*').in('id', propertyIdsArray) : Promise.resolve({ data: [], error: null }),
    propertyIdsArray.length > 0 ? supabase.from('property_listings').select('*').in('property_id', propertyIdsArray) : Promise.resolve({ data: [], error: null }),
  ])

  if (propertiesResult.error) {
    console.error('Properties query failed:', propertiesResult.error)
  }

  const propertiesMap = new Map((propertiesResult.data || []).map((p: any) => [p.id, p]))
  const listingsMap = new Map((listingsResult.data || []).map((l: any) => [l.property_id, l]))
  const propertyOptions = optionPropertyIds
    .map(id => propertiesMap.get(id))
    .filter((property): property is { id: string; name: string } => Boolean(property?.id && property?.name))
    .sort((a, b) => a.name.localeCompare(b.name, locale))

  // Transform reservation_status to status for UI compatibility + attach related data
  const reservations = reservationData.map((r: any) => {
    const property = propertiesMap.get(r.property_id)
    const listing = listingsMap.get(r.property_id)

    return {
      ...r,
      status: r.reservation_status || r.status,
      properties: property || null,
      property_listings: listing || null,
    }
  })
  const stats = {
    total: dataResult.count ?? 0,
    confirmed: confResult.count ?? 0,
    pending: pendResult.count ?? 0,
    cancelled: cancResult.count ?? 0,
  }

  return (
    <AuthLayout profile={profile}>
      <PremiumPageShell>
        <PremiumPageHeader
          title="Reservas"
          description="Gerencie todas as suas reservas"
          badge={monthParam}
          icon={Calendar}
          actions={(
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/${locale}/reservations/export`} aria-label="Exportar">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Exportar</span>
              </Link>
            </Button>
            {canCreate && (
              <>
                <CleanupReservationsButton />
                <Link href={`/${locale}/reservations/new`}>
                  <Button variant="premium-primary" size="sm">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Nova Reserva</span>
                  </Button>
                </Link>
              </>
            )}
          </div>
          )}
        />

        <div className="border-b border-neutral-200/60" />

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <PremiumMetricCard compact icon={Calendar} label="Reservas" value={stats.total} type="Total" description="Reservas no período" />
          <PremiumMetricCard compact icon={CheckCircle} label="Confirmadas" value={stats.confirmed} type="Status" description="Reservas confirmadas" tone="success" />
          <PremiumMetricCard compact icon={Clock} label="Pendentes" value={stats.pending} type="Status" description="Aguardando confirmação" tone="gold" />
          <PremiumMetricCard compact icon={XCircle} label="Canceladas" value={stats.cancelled} type="Status" description="Reservas canceladas" tone="danger" />
        </div>

        {/* Filter + Search + List */}
        <ReservationsFilter
          reservations={(reservations || []) as unknown as ReservationUI[]}
          canCreate={canCreate}
          pagination={{ page, total: stats.total, pageSize: PAGE_SIZE }}
          currentMonth={monthParam}
          properties={propertyOptions}
          selectedPropertyId={selectedPropertyId}
        />
      </PremiumPageShell>
    </AuthLayout>
  )
}
