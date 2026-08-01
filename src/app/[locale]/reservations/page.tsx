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
  searchParams: Promise<{ page?: string; month?: string }>
}) {
  const { locale } = await params
  const queryParams = await searchParams
  const page = parsePage(queryParams)
  const { from, to } = getRange(page)

  const monthParam = queryParams.month || new Date().toISOString().slice(0, 7)
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

  // Buscar reservas paginadas + contagens de stats em paralelo
  let dataQuery = supabase
    .from('reservations')
    .select(`
      *,
      property_listings!inner(
        id,
        properties!inner(
          id,
          name,
          city,
          country,
          currency
        ),
        platforms(
          display_name
        )
      ),
      guests(
        id,
        first_name,
        last_name,
        email
      )
    `, { count: 'exact' })
    .lte('check_in', monthEnd)
    .gte('check_out', monthStart)
    .order('check_in', { ascending: true })
    .range(from, to)

  // Queries de contagem HEAD (sem transferir dados) para stats
  let cConf = supabase.from('reservations').select('id, property_listings!inner(property_id)', { count: 'exact', head: true }).eq('status', 'confirmed').lte('check_in', monthEnd).gte('check_out', monthStart)
  let cPend = supabase.from('reservations').select('id, property_listings!inner(property_id)', { count: 'exact', head: true }).eq('status', 'pending').lte('check_in', monthEnd).gte('check_out', monthStart)
  let cCanc = supabase.from('reservations').select('id, property_listings!inner(property_id)', { count: 'exact', head: true }).eq('status', 'cancelled').lte('check_in', monthEnd).gte('check_out', monthStart)

  if (propertyIds) {
    dataQuery = dataQuery.in('property_listings.properties.id', propertyIds)
    cConf = cConf.in('property_listings.property_id', propertyIds)
    cPend = cPend.in('property_listings.property_id', propertyIds)
    cCanc = cCanc.in('property_listings.property_id', propertyIds)
  }

  const [dataResult, confResult, pendResult, cancResult] = await Promise.all([dataQuery, cConf, cPend, cCanc])

  if (dataResult.error) {
    console.error('Erro ao buscar reservas:', dataResult.error)
  }

  const reservations = dataResult.data
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
                <Button asChild variant="action" size="sm">
                  <Link href={`/${locale}/reservations/new`} aria-label="Nova Reserva">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Nova Reserva</span>
                  </Link>
                </Button>
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
        />
      </PremiumPageShell>
    </AuthLayout>
  )
}
