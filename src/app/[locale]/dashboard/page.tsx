import Link from 'next/link'
import { Calendar, TrendingUp, Percent, Users, Home, Euro, Clock, CheckCircle, Wallet } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { LazyOccupancyChart as OccupancyChart, LazyRevenueChart as RevenueChart, LazyStatusChart as StatusChart } from '@/components/common/lazy/LazyCharts'
import { formatCurrency, type CurrencyCode } from '@/lib/utils/currency'
import { AuthLayout } from '@/components/common/layout/AuthLayout'
import { redirect } from 'next/navigation'

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const supabase = await createClient()

  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/')
  }

  // Check if user is admin - only admins can access dashboard
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .maybeSingle()

  if (userProfile?.role !== 'admin') {
    redirect(`/${locale}/calendar`)
  }

  const organizationId = userProfile?.organization_id
  if (!organizationId) {
    redirect('/')
  }

  // Fetch properties for this organization
  const { data: properties } = await supabase
    .from('properties')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('is_active', true)

  const propertyIds = properties?.map(p => p.id) || []

  // Fetch reservations via property_listings junction table
  const { data: reservations } = propertyIds.length > 0
    ? await supabase
        .from('reservations')
        .select(`
          id, 
          status, 
          check_in, 
          check_out, 
          total_amount, 
          currency, 
          created_at,
          guest_name,
          property_listing_id,
          property_listings(
            id,
            property_id,
            properties(id, name)
          )
        `)
        .in('property_listings.property_id', propertyIds)
    : { data: null }

  // Get organization currency
  const { data: org } = await supabase
    .from('organizations')
    .select('currency')
    .eq('id', organizationId)
    .single()

  const reservationList = reservations || []
  const totalProperties = properties?.length || 0
  const totalReservations = reservationList.length

  const confirmedReservations = reservationList.filter(r => r.status === 'confirmed').length
  const pendingReservations = reservationList.filter(r => r.status === 'pending').length
  const cancelledReservations = reservationList.filter(r => r.status === 'cancelled').length

  // Calculate revenue forecast
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]

  const forecastByCurrency = reservationList
    .filter(r => r.status === 'confirmed' && r.total_amount && r.check_in >= todayStr)
    .reduce((acc, r) => {
      const currency = r.currency || org?.currency || 'EUR'
      acc[currency] = (acc[currency] || 0) + Number(r.total_amount)
      return acc
    }, {} as Record<string, number>)

  const futureConfirmedCount = reservationList.filter(
    r => r.status === 'confirmed' && r.check_in >= todayStr
  ).length

  // Calculate current month revenue
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  const monthRevenueByCurrency = reservationList
    .filter(r => {
      const checkIn = new Date(r.check_in)
      return r.status === 'confirmed' &&
             r.total_amount &&
             checkIn >= currentMonthStart &&
             checkIn <= currentMonthEnd
    })
    .reduce((acc, r) => {
      const currency = r.currency || org?.currency || 'EUR'
      acc[currency] = (acc[currency] || 0) + Number(r.total_amount)
      return acc
    }, {} as Record<string, number>)

  // Calculate current month occupancy
  const daysInCurrentMonth = currentMonthEnd.getDate()
  const currentMonthReservations = reservationList.filter(r => {
    const checkIn = new Date(r.check_in)
    const checkOut = new Date(r.check_out)
    return r.status === 'confirmed' && (
      (checkIn >= currentMonthStart && checkIn <= currentMonthEnd) ||
      (checkOut >= currentMonthStart && checkOut <= currentMonthEnd) ||
      (checkIn <= currentMonthStart && checkOut >= currentMonthEnd)
    )
  })

  const currentMonthDaysBooked = currentMonthReservations.reduce((sum, r) => {
    const checkIn = new Date(r.check_in)
    const checkOut = new Date(r.check_out)
    const rangeStart = checkIn < currentMonthStart ? currentMonthStart : checkIn
    const rangeEnd = checkOut > currentMonthEnd ? currentMonthEnd : checkOut
    const days = Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
    return sum + Math.max(0, days)
  }, 0)

  const totalAvailableDaysCurrentMonth = daysInCurrentMonth * totalProperties
  const currentMonthOccupancy = totalAvailableDaysCurrentMonth > 0
    ? Math.min(100, Math.round((currentMonthDaysBooked / totalAvailableDaysCurrentMonth) * 100))
    : 0

  // Calculate occupancy for last 6 months
  const occupancyData = []
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthName = date.toLocaleDateString('pt-BR', { month: 'short' })
    const year = date.getFullYear()
    const month = date.getMonth()

    const monthStart = new Date(year, month, 1)
    const monthEnd = new Date(year, month + 1, 0)
    const daysInMonth = monthEnd.getDate()

    const monthReservations = reservationList.filter(r => {
      const checkIn = new Date(r.check_in)
      const checkOut = new Date(r.check_out)
      return r.status === 'confirmed' && (
        (checkIn >= monthStart && checkIn <= monthEnd) ||
        (checkOut >= monthStart && checkOut <= monthEnd) ||
        (checkIn <= monthStart && checkOut >= monthEnd)
      )
    })

    const totalDaysBooked = monthReservations.reduce((sum, r) => {
      const checkIn = new Date(r.check_in)
      const checkOut = new Date(r.check_out)
      const rangeStart = checkIn < monthStart ? monthStart : checkIn
      const rangeEnd = checkOut > monthEnd ? monthEnd : checkOut
      const days = Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
      return sum + Math.max(0, days)
    }, 0)

    const totalAvailableDays = daysInMonth * totalProperties
    const occupancy = totalAvailableDays > 0
      ? Math.min(100, (totalDaysBooked / totalAvailableDays) * 100)
      : 0

    occupancyData.push({
      month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
      occupancy: Math.round(occupancy)
    })
  }

  // Calculate revenue for last 6 months
  const revenueData = []
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthName = date.toLocaleDateString('pt-BR', { month: 'short' })
    const year = date.getFullYear()
    const month = date.getMonth()

    const monthStart = new Date(year, month, 1)
    const monthEnd = new Date(year, month + 1, 0)

    const monthRevenue = reservationList
      .filter(r => {
        const checkIn = new Date(r.check_in)
        return r.status === 'confirmed' &&
               r.total_amount &&
               checkIn >= monthStart &&
               checkIn <= monthEnd
      })
      .reduce((sum, r) => sum + Number(r.total_amount), 0)

    revenueData.push({
      month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
      revenue: monthRevenue
    })
  }

  // Fetch current month expenses
  const { data: currentMonthExpenses } = propertyIds.length > 0
    ? await supabase
        .from('expenses')
        .select('amount, currency')
        .in('property_id', propertyIds)
        .gte('date', `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`)
        .lte('date', currentMonthEnd.toISOString().slice(0, 10))
    : { data: null }

  const monthExpensesByCurrency = (currentMonthExpenses || []).reduce((acc, e) => {
    const cur = (e.currency || org?.currency || 'EUR') as string
    acc[cur] = (acc[cur] || 0) + Number(e.amount)
    return acc
  }, {} as Record<string, number>)

  // Fetch upcoming check-ins
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const nextWeek = new Date(today)
  nextWeek.setDate(nextWeek.getDate() + 7)

  const { data: upcomingCheckIns } = propertyIds.length > 0
    ? await supabase
        .from('reservations')
        .select(`
          id,
          check_in,
          status,
          guest_name,
          property_listing_id,
          property_listings(
            property_id,
            properties(id, name)
          )
        `)
        .eq('status', 'confirmed')
        .gte('check_in', today.toISOString().split('T')[0])
        .lte('check_in', nextWeek.toISOString().split('T')[0])
        .in('property_listings.property_id', propertyIds)
        .order('check_in', { ascending: true })
        .limit(5)
    : { data: null }

  const currencyCode = org?.currency || 'EUR'

  return (
    <AuthLayout>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Welcome */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-gray-900 mb-1">Dashboard</h2>
          <p className="text-sm sm:text-base text-gray-500">
            Visão geral do seu negócio de aluguel de temporada
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                <Home className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-xs font-medium uppercase tracking-wider text-gray-400">Total</span>
            </div>
            <h3 className="text-4xl font-bold tracking-tight text-gray-900">{totalProperties}</h3>
            <p className="text-sm text-gray-500 mt-1">Propriedades</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
                <Calendar className="h-5 w-5 text-green-600" />
              </div>
              <span className="text-xs font-medium uppercase tracking-wider text-gray-400">Total</span>
            </div>
            <h3 className="text-4xl font-bold tracking-tight text-gray-900">{totalReservations}</h3>
            <p className="text-sm text-gray-500 mt-1">Reservas</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
                <Percent className="h-5 w-5 text-purple-600" />
              </div>
              <span className="text-xs font-medium uppercase tracking-wider text-gray-400">
                {now.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase()}
              </span>
            </div>
            <h3 className="text-4xl font-bold tracking-tight text-gray-900">{currentMonthOccupancy}%</h3>
            <p className="text-sm text-gray-500 mt-1">Taxa de Ocupação</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl">
                <Euro className="h-5 w-5 text-orange-600" />
              </div>
              <span className="text-xs font-medium uppercase tracking-wider text-gray-400">
                {now.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase()}
              </span>
            </div>
            <div className="space-y-0.5">
              {Object.entries(monthRevenueByCurrency).length > 0 ? (
                Object.entries(monthRevenueByCurrency).map(([currency, amount]) => (
                  <h3 key={currency} className="text-3xl font-bold tracking-tight text-gray-900">
                    {formatCurrency(amount, currency as CurrencyCode)}
                  </h3>
                ))
              ) : (
                <h3 className="text-4xl font-bold tracking-tight text-gray-900">—</h3>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">Receita do Mês</p>
          </div>

          {/* Lucro Real */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
                <Wallet className="h-5 w-5 text-green-600" />
              </div>
              <span className="text-xs font-medium uppercase tracking-wider text-gray-400">
                {now.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase()}
              </span>
            </div>
            <div className="space-y-0.5">
              {Object.entries(monthRevenueByCurrency).length > 0 ? (
                Object.entries(monthRevenueByCurrency).map(([cur, rev]) => {
                  const exp = monthExpensesByCurrency[cur] || 0
                  const profit = rev - exp
                  const margin = rev > 0 ? Math.round((profit / rev) * 100) : 0
                  return (
                    <div key={cur}>
                      <h3 className={`text-3xl font-bold tracking-tight ${profit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                        {formatCurrency(profit, cur as CurrencyCode)}
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">Margem: {margin}%</p>
                    </div>
                  )
                })
              ) : (
                <h3 className="text-4xl font-bold tracking-tight text-gray-900">—</h3>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">Lucro Real</p>
          </div>
        </div>

        {/* Previsão de Faturamento */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Previsão de Faturamento</h3>
            </div>
            <span className="text-sm text-gray-500">
              {futureConfirmedCount} reserva{futureConfirmedCount !== 1 ? 's' : ''} confirmada{futureConfirmedCount !== 1 ? 's' : ''} a partir de hoje
            </span>
          </div>

          {Object.keys(forecastByCurrency).length === 0 ? (
            <p className="text-gray-500 text-sm">Nenhuma reserva futura com valor registado.</p>
          ) : (
            <div className="flex flex-wrap gap-6">
              {Object.entries(forecastByCurrency)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([currency, amount]) => (
                  <div key={currency} className="flex flex-col">
                    <span className="text-3xl font-bold text-gray-900">
                      {formatCurrency(amount, currency as CurrencyCode)}
                    </span>
                    <span className="text-sm text-gray-500 mt-1">{currency}</span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Occupancy Chart */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <h3 className="text-base font-semibold text-gray-900">Taxa de Ocupação</h3>
            </div>
            <p className="text-xs text-gray-400 mb-4 ml-7">Últimos 6 meses</p>
            <OccupancyChart data={occupancyData} />
          </div>

          {/* Revenue Chart */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-1">
              <Euro className="h-5 w-5 text-green-600" />
              <h3 className="text-base font-semibold text-gray-900">Receita Mensal</h3>
            </div>
            <p className="text-xs text-gray-400 mb-4 ml-7">Últimos 6 meses</p>
            <RevenueChart data={revenueData} />
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Status Chart */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-5 w-5 text-blue-600" />
              <h3 className="text-base font-semibold text-gray-900">Reservas por Status</h3>
            </div>
            <p className="text-xs text-gray-400 mb-4 ml-7">Distribuição atual</p>
            <StatusChart
              confirmed={confirmedReservations}
              pending={pendingReservations}
              cancelled={cancelledReservations}
            />
          </div>

          {/* Upcoming Check-ins */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-5 w-5 text-blue-600" />
              <h3 className="text-base font-semibold text-gray-900">Próximas Chegadas</h3>
            </div>
            <p className="text-xs text-gray-400 mb-4 ml-7">Próximos 7 dias</p>

            {upcomingCheckIns && upcomingCheckIns.length > 0 ? (
              <div className="space-y-3">
                {upcomingCheckIns.map((reservation) => {
                  const checkInDate = new Date(reservation.check_in)
                  const propertyName = reservation.property_listings?.[0]?.properties?.[0]?.name || 'Propriedade'
                  const guestName = reservation.guest_name || 'Sem nome'

                  return (
                    <Link
                      key={reservation.id}
                      href={`/${locale}/reservations/${reservation.id}`}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 hover:-translate-y-0.5 transition-all duration-150"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{guestName}</p>
                        <p className="text-sm text-gray-600">{propertyName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-blue-600">
                          {checkInDate.toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short'
                          })}
                        </p>
                        <p className="text-xs text-gray-500">
                          {checkInDate.toLocaleDateString('pt-BR', { weekday: 'short' })}
                        </p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p>Nenhuma chegada prevista</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Ações Rápidas</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Link
              href={`/${locale}/properties/new`}
              className="flex items-center gap-3 p-3 sm:p-4 min-h-[48px] border border-gray-100 rounded-xl bg-gradient-to-br from-white to-blue-50/50 hover:border-blue-200 hover:from-blue-50 hover:to-blue-100/50 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-150"
            >
              <div className="p-2.5 bg-blue-100 rounded-lg">
                <Home className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-gray-800">Nova Propriedade</span>
            </Link>

            <Link
              href={`/${locale}/reservations/new`}
              className="flex items-center gap-3 p-3 sm:p-4 min-h-[48px] border border-gray-100 rounded-xl bg-gradient-to-br from-white to-green-50/50 hover:border-green-200 hover:from-green-50 hover:to-green-100/50 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-150"
            >
              <div className="p-2.5 bg-green-100 rounded-lg">
                <Calendar className="h-5 w-5 text-green-600" />
              </div>
              <span className="text-sm font-medium text-gray-800">Nova Reserva</span>
            </Link>

            <Link
              href={`/${locale}/calendar`}
              className="flex items-center gap-3 p-3 sm:p-4 min-h-[48px] border border-gray-100 rounded-xl bg-gradient-to-br from-white to-purple-50/50 hover:border-purple-200 hover:from-purple-50 hover:to-purple-100/50 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-150"
            >
              <div className="p-2.5 bg-purple-100 rounded-lg">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <span className="text-sm font-medium text-gray-800">Ver Calendário</span>
            </Link>

            <Link
              href={`/${locale}/reservations`}
              className="flex items-center gap-3 p-3 sm:p-4 min-h-[48px] border border-gray-100 rounded-xl bg-gradient-to-br from-white to-orange-50/50 hover:border-orange-200 hover:from-orange-50 hover:to-orange-100/50 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-150"
            >
              <div className="p-2.5 bg-orange-100 rounded-lg">
                <Users className="h-5 w-5 text-orange-600" />
              </div>
              <span className="text-sm font-medium text-gray-800">Ver Reservas</span>
            </Link>
          </div>
        </div>
      </main>
    </AuthLayout>
  )
}
