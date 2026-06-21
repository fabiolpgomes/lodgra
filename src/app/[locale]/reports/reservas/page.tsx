import { Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ReservationsFilters } from '@/components/features/reports/ReservationsFilters'
import { ReservationsDashboard } from '@/components/features/reports/ReservationsDashboard'
import { AuthLayout } from '@/components/common/layout/AuthLayout'
import { getUserPropertyIds } from '@/lib/auth/getUserProperties'

interface PageProps {
  searchParams: Promise<{
    start_date?: string
    end_date?: string
    property_id?: string
  }>
}

export default async function ReservasPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()
  const userPropertyIds = await getUserPropertyIds(supabase)

  // Datas padrão: últimos 3 meses
  const defaultEndDate = new Date()
  const defaultStartDate = new Date()
  defaultStartDate.setMonth(defaultStartDate.getMonth() - 3)

  const startDate = params.start_date || defaultStartDate.toISOString().split('T')[0]
  const endDate = params.end_date || defaultEndDate.toISOString().split('T')[0]
  const propertyId = params.property_id

  // Buscar propriedades
  let propertiesQuery = supabase
    .from('properties')
    .select('id, name, management_percentage, owners(full_name)')
    .eq('is_active', true)
    .order('name')
  if (userPropertyIds) propertiesQuery = propertiesQuery.in('id', userPropertyIds)
  const { data: properties } = await propertiesQuery

  // Query base de reservas (histórico)
  let reservationsQuery = supabase
    .from('reservations')
    .select(`
      id,
      check_in,
      check_out,
      status,
      total_amount,
      platform_fee,
      net_amount,
      currency,
      source,
      number_of_guests,
      created_at,
      property_listings!inner(
        id,
        property_id,
        properties!inner(
          id,
          name,
          city,
          currency
        )
      ),
      guests(
        first_name,
        last_name
      )
    `)
    .lte('check_in', endDate)
    .gte('check_out', startDate)
    .eq('status', 'confirmed')
    .order('check_in', { ascending: false })

  if (propertyId) {
    reservationsQuery = reservationsQuery.eq('property_listings.property_id', propertyId)
  }
  if (userPropertyIds) {
    reservationsQuery = reservationsQuery.in('property_listings.property_id', userPropertyIds)
  }

  // Query de reservas futuras (a partir de hoje)
  const today = new Date().toISOString().split('T')[0]

  let futureReservationsQuery = supabase
    .from('reservations')
    .select(`
      id,
      check_in,
      check_out,
      total_amount,
      currency,
      source,
      status,
      property_listings!inner(
        property_id,
        properties!inner(
          id,
          name,
          currency
        )
      ),
      guests(
        first_name,
        last_name
      )
    `)
    .gte('check_out', today)
    .eq('status', 'confirmed')
    .order('check_in', { ascending: true })

  if (propertyId) {
    futureReservationsQuery = futureReservationsQuery.eq('property_listings.property_id', propertyId)
  }
  if (userPropertyIds) {
    futureReservationsQuery = futureReservationsQuery.in('property_listings.property_id', userPropertyIds)
  }

  // Executar queries
  const [reservationsResult, futureReservationsResult] = await Promise.all([
    reservationsQuery,
    futureReservationsQuery,
  ])

  const reservations = reservationsResult.data
  const futureReservations = futureReservationsResult.data || []

  return (
    <AuthLayout>
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-xl">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Dashboard de Reservas</h2>
          </div>
          <p className="text-gray-600 text-sm ml-14">
            Visualize todas as suas reservas passadas e futuras
          </p>
        </div>

        {/* Filtros */}
        <ReservationsFilters
          properties={properties || []}
          startDate={startDate}
          endDate={endDate}
          propertyId={propertyId}
        />

        {/* Reservations Dashboard */}
        <ReservationsDashboard
          _reservations={reservations || []}
          futureReservations={futureReservations || []}
          properties={properties || []}
          _startDate={startDate}
          _endDate={endDate}
          propertyId={propertyId}
        />
      </main>
    </AuthLayout>
  )
}
