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

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const params = await searchParams
  const page = parsePage(params)
  const { from, to } = getRange(page)

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
    .order('check_in', { ascending: true })
    .range(from, to)

  // Queries de contagem HEAD (sem transferir dados) para stats
  let cConf = supabase.from('reservations').select('id, property_listings!inner(property_id)', { count: 'exact', head: true }).eq('status', 'confirmed')
  let cPend = supabase.from('reservations').select('id, property_listings!inner(property_id)', { count: 'exact', head: true }).eq('status', 'pending')
  let cCanc = supabase.from('reservations').select('id, property_listings!inner(property_id)', { count: 'exact', head: true }).eq('status', 'cancelled')

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
    <AuthLayout>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-blue-100 rounded-xl">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Reservas</h2>
            </div>
            <p className="text-gray-500 text-sm ml-14">
              Gerencie todas as suas reservas
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Button variant="outline" asChild>
              <Link href="/reservations/export">
                <Download className="h-4 w-4" />
                Exportar PDF
              </Link>
            </Button>
            {canCreate && (
              <>
                <CleanupReservationsButton />
                <Button asChild>
                  <Link href="/reservations/new">
                    <Plus className="h-4 w-4" />
                    Nova Reserva
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-blue-100 rounded-xl">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total</span>
            </div>
            <p className="text-4xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-sm text-gray-500 mt-1">Reservas</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-green-100 rounded-xl">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Status</span>
            </div>
            <p className="text-4xl font-bold text-green-600">{stats.confirmed}</p>
            <p className="text-sm text-gray-500 mt-1">Confirmadas</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-orange-100 rounded-xl">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Status</span>
            </div>
            <p className="text-4xl font-bold text-orange-600">{stats.pending}</p>
            <p className="text-sm text-gray-500 mt-1">Pendentes</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-red-100 rounded-xl">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Status</span>
            </div>
            <p className="text-4xl font-bold text-red-600">{stats.cancelled}</p>
            <p className="text-sm text-gray-500 mt-1">Canceladas</p>
          </div>
        </div>

        {/* Filter + Search + List */}
        <ReservationsFilter
          reservations={(reservations || []) as unknown as ReservationUI[]}
          canCreate={canCreate}
          pagination={{ page, total: stats.total, pageSize: PAGE_SIZE }}
        />
      </main>
    </AuthLayout>
  )
}
