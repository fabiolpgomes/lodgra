import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Calendar, Plus, Clock, CheckCircle, XCircle, Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { CleanupReservationsButton } from '@/components/reservations/CleanupReservationsButton'
import { ReservationsFilter } from '@/components/reservations/ReservationsFilter'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { getUserAccess } from '@/lib/auth/getUserAccess'
import { Button } from '@/components/ui/button'
import { ReservationUI } from '@/types/reservation-ui'
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
          country
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Reservas</h2>
            <p className="text-gray-600 mt-1">
              Gerencie todas as suas reservas
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Button variant="outline" asChild>
              <Link href="/reservations/export">
                <Download className="h-5 w-5" />
                Exportar PDF
              </Link>
            </Button>
            {canCreate && (
              <>
                <CleanupReservationsButton />
                <Button asChild>
                  <Link href="/reservations/new">
                    <Plus className="h-5 w-5" />
                    Nova Reserva
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Confirmadas</p>
                <p className="text-2xl font-bold text-green-600">{stats.confirmed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pendentes</p>
                <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Canceladas</p>
                <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
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
