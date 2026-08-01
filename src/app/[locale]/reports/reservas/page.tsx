import { Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ReservationsFilters } from '@/components/features/reports/ReservationsFilters'
import { ReservationsDashboard } from '@/components/features/reports/ReservationsDashboard'
import { AuthLayout } from '@/components/common/layout/AuthLayout'
import { PremiumPageHeader, PremiumPageShell } from '@/components/common/layout/PremiumPage'
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

  // Datas padrão: sempre começar do dia de hoje
  const nowUTC = new Date()
  const todayStr = `${nowUTC.getUTCFullYear()}-${String(nowUTC.getUTCMonth() + 1).padStart(2, '0')}-${String(nowUTC.getUTCDate()).padStart(2, '0')}`

  const startDate = params.start_date || todayStr
  const endDate = params.end_date || todayStr
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

  // Query de reservas futuras (a partir de hoje em UTC)
  const today = todayStr

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
      <PremiumPageShell>
        <PremiumPageHeader
          title="Dashboard de Reservas"
          description="Visualize todas as suas reservas passadas e futuras"
          badge={propertyId ? 'Filtrado' : 'Todas'}
          icon={Calendar}
        />

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
      </PremiumPageShell>
    </AuthLayout>
  )
}
