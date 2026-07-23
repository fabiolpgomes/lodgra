import Link from 'next/link'
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle,
  Clock,
  DollarSign,
  FileSpreadsheet,
  Menu,
  Home,
  Percent,
  RefreshCw,
  Search,
  TrendingUp,
  Wallet,
  Bell,
  XCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/requireRole'
import { LazyOccupancyChart as OccupancyChart, LazyStatusChart as StatusChart } from '@/components/common/lazy/LazyCharts'
import { formatCurrency, type CurrencyCode } from '@/lib/utils/currency'
import { RevenueChartWrapper } from '@/components/features/dashboard/RevenueChartWrapper'
import { PropertyFilterDropdown } from '@/components/features/dashboard/PropertyFilterDropdown'
import { AuthLayout } from '@/components/common/layout/AuthLayout'
import { LocaleSelector } from '@/components/common/header/LocaleSelector'
import { ThemeToggle } from '@/components/common/header/ThemeToggle'
import { redirect } from 'next/navigation'
import { calculateRevenueForReservation } from '@/lib/financial/revenue-calculator'

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams?: Promise<{ propertyId?: string }>
}) {
  const { locale } = await params
  const { propertyId: requestedPropertyId } = (await searchParams) || {}

  const auth = await requireRole(['admin', 'gestor'])
  if (!auth.authorized) {
    redirect(`/${locale}/onboarding/pendente`)
  }

  const organizationId = auth.organizationId
  if (!organizationId) {
    redirect(`/${locale}/onboarding`)
  }

  const supabase = await createClient()

  // Fetch properties for this organization
  const { data: allProperties } = await supabase
    .from('properties')
    .select('id, name, currency')
    .eq('organization_id', organizationId)
    .eq('is_active', true)

  const selectedProperty = (allProperties || []).find(property => property.id === requestedPropertyId)
  const selectedPropertyId = selectedProperty?.id
  const properties = selectedPropertyId
    ? (allProperties || []).filter(property => property.id === selectedPropertyId)
    : (allProperties || [])
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
          property_listings!inner(
            id,
            property_id,
            properties(id, name, currency)
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

  // Build propertyId → currency map for correct multi-currency grouping
  const propertyCurrencyMap = (properties || []).reduce((acc, p) => {
    if (p.currency) acc[p.id] = p.currency
    return acc
  }, {} as Record<string, string>)

  function getReservationCurrency(r: { currency?: string | null; property_listings?: unknown }): string {
    const listing = r.property_listings
    const lObj = Array.isArray(listing) ? listing[0] : listing
    const propId = (lObj as { property_id?: string } | null)?.property_id
    const propCur = propId ? propertyCurrencyMap[propId] : undefined
    return propCur || r.currency || org?.currency || 'EUR'
  }

  const reservationList = reservations || []
  const totalProperties = properties?.length || 0
  const totalOrganizationProperties = allProperties?.length || 0
  const totalReservations = reservationList.length

  const confirmedReservations = reservationList.filter(r => r.status === 'confirmed').length
  const pendingReservations = reservationList.filter(r => r.status === 'pending').length
  const cancelledReservations = reservationList.filter(r => r.status === 'cancelled').length

  // Calculate revenue forecast (pending/predicted revenue not yet received in current month)
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const forecastByCurrency = reservationList
    .filter(r => r.status === 'confirmed' && r.total_amount)
    .reduce((acc, r) => {
      // Calculate revenue breakdown using proportional distribution
      // IMPORTANT: Convert date strings to UTC to avoid timezone issues
      const checkInStr = typeof r.check_in === 'string' ? r.check_in : new Date(r.check_in).toISOString().split('T')[0]
      const checkOutStr = typeof r.check_out === 'string' ? r.check_out : new Date(r.check_out).toISOString().split('T')[0]

      const revenueBreakdown = calculateRevenueForReservation({
        id: r.id,
        totalAmount: Number(r.total_amount),
        checkIn: checkInStr,
        checkOut: checkOutStr,
        currency: getReservationCurrency(r),
        status: 'confirmed'
      })

      // Find how much is allocated to the current month (already in "Receita do Mês")
      const currentMonthValue = revenueBreakdown.monthlyBreakdown
        .find(m => m.month === currentMonthKey)
        ?.value || 0

      // Forecast = Total - Current Month = Pending/Predicted revenue
      const forecastValue = revenueBreakdown.totalAmount - currentMonthValue

      if (forecastValue > 0) {
        const currency = getReservationCurrency(r)
        acc[currency] = (acc[currency] || 0) + forecastValue
      }

      return acc
    }, {} as Record<string, number>)

  const futureConfirmedCount = reservationList.filter(
    r => r.status === 'confirmed' && r.check_in >= todayStr
  ).length

  // Calculate current month revenue using proportional distribution for >30 day reservations
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  const monthRevenueByCurrency = reservationList
    .filter(r => r.status === 'confirmed' && r.total_amount)
    .reduce((acc, r) => {
      // Use proportional distribution calculation for all reservations
      // IMPORTANT: Convert date strings to UTC to avoid timezone issues
      const checkInStr = typeof r.check_in === 'string' ? r.check_in : new Date(r.check_in).toISOString().split('T')[0]
      const checkOutStr = typeof r.check_out === 'string' ? r.check_out : new Date(r.check_out).toISOString().split('T')[0]

      const revenueBreakdown = calculateRevenueForReservation({
        id: r.id,
        totalAmount: Number(r.total_amount),
        checkIn: checkInStr,
        checkOut: checkOutStr,
        currency: getReservationCurrency(r),
        status: 'confirmed'
      })

      // Sum only the revenue allocated to the current month
      const monthlyValue = revenueBreakdown.monthlyBreakdown
        .find(m => m.month === currentMonthKey)
        ?.value || 0

      if (monthlyValue > 0) {
        const currency = getReservationCurrency(r)
        acc[currency] = (acc[currency] || 0) + monthlyValue
      }

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

  // Calculate revenue for last 6 months grouped by currency (using proportional distribution)
  const revenueDataByCurrency: Record<string, { month: string; revenue: number }[]> = {}
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthLabel = (date.toLocaleDateString('pt-BR', { month: 'short' }).charAt(0).toUpperCase() +
      date.toLocaleDateString('pt-BR', { month: 'short' }).slice(1))
    const year = date.getFullYear()
    const month = date.getMonth()
    const _monthStart = new Date(year, month, 1)
    const _monthEnd = new Date(year, month + 1, 0)
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`

    const byCur: Record<string, number> = {}
    reservationList
      .filter(r => r.status === 'confirmed' && r.total_amount)
      .forEach(r => {
        // Use proportional distribution for all reservations
        const checkInStr = typeof r.check_in === 'string' ? r.check_in : r.check_in.toISOString().split('T')[0]
        const checkOutStr = typeof r.check_out === 'string' ? r.check_out : r.check_out.toISOString().split('T')[0]
        const revenueBreakdown = calculateRevenueForReservation({
          id: r.id,
          totalAmount: Number(r.total_amount),
          checkIn: checkInStr,
          checkOut: checkOutStr,
          currency: getReservationCurrency(r),
          status: 'confirmed'
        })

        // Sum only the revenue allocated to this month
        const monthlyValue = revenueBreakdown.monthlyBreakdown
          .find(m => m.month === monthKey)
          ?.value || 0

        if (monthlyValue > 0) {
          const cur = getReservationCurrency(r)
          byCur[cur] = (byCur[cur] || 0) + monthlyValue
        }
      })

    Object.entries(byCur).forEach(([cur, revenue]) => {
      if (!revenueDataByCurrency[cur]) revenueDataByCurrency[cur] = []
      revenueDataByCurrency[cur].push({ month: monthLabel, revenue })
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
    acc[cur] = (acc[cur] || 0) + Number(e.amount || 0)
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
          check_out,
          status,
          guest_name,
          total_amount,
          currency,
          property_listing_id,
          property_listings!inner(
            property_id,
            properties(id, name),
            platforms(display_name)
          ),
          guests(
            first_name,
            last_name,
            email
          )
        `)
        .eq('status', 'confirmed')
        .gte('check_in', today.toISOString().split('T')[0])
        .lte('check_in', nextWeek.toISOString().split('T')[0])
        .in('property_listings.property_id', propertyIds)
        .order('check_in', { ascending: true })
        .limit(5)
    : { data: null }

  // Story 39.5: indicador de status de sincronização (última entrada de sync_logs da organização)
  const { data: syncLogRows } = propertyIds.length > 0
    ? await supabase
        .from('sync_logs')
        .select(`
          status,
          error_message,
          synced_at,
          property_listings!inner(property_id)
        `)
        .in('property_listings.property_id', propertyIds)
        .order('synced_at', { ascending: false })
        .limit(1)
    : { data: null }

  const lastSyncLog = syncLogRows?.[0] as
    | { status: string; error_message: string | null; synced_at: string }
    | undefined

  function formatSyncTimestamp(iso: string): string {
    const d = new Date(iso)
    const datePart = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    const timePart = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    return `${datePart} ${timePart}`
  }

  const monthShort = now.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase()
  const monthLong = now.toLocaleDateString('pt-BR', { month: 'long' })
  const monthLabel = monthLong.charAt(0).toUpperCase() + monthLong.slice(1)
  const revenueEntries = Object.entries(monthRevenueByCurrency).sort(([a], [b]) => a.localeCompare(b))
  const forecastEntries = Object.entries(forecastByCurrency).sort(([a], [b]) => a.localeCompare(b))
  const financeCurrencies = Array.from(
    new Set([
      ...Object.keys(monthRevenueByCurrency),
      ...Object.keys(monthExpensesByCurrency),
    ])
  ).sort((a, b) => a.localeCompare(b))

  const currencyBadgeClass = (_currency: string) =>
    'border-brand-blue/20 bg-brand-bg text-brand-blue shadow-[inset_0_0_0_1px_rgba(16,32,62,0.04)]'
  const propertyFilterLabel = selectedProperty
    ? selectedProperty.name
    : `Todas as propriedades (${totalOrganizationProperties})`

  return (
    <AuthLayout hideTopBar>
      <div className="dashboard-readable">
      <div className="sticky top-0 z-[80] hidden h-20 items-center justify-between border-b border-neutral-200/60 bg-brand-white px-4 shadow-xs md:flex lg:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <button
            className="flex h-10 w-10 items-center justify-center rounded-xl text-brand-text-medium transition-colors hover:bg-brand-bg hover:text-brand-text-dark"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-[280px]">
            <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-brand-text-medium">
              Filtro de Propriedade
            </p>
            <PropertyFilterDropdown
              label={propertyFilterLabel}
              properties={allProperties || []}
              selectedPropertyId={selectedPropertyId}
              totalProperties={totalOrganizationProperties}
              fallbackCurrency={org?.currency || 'EUR'}
            />
          </div>
        </div>

        <div className="mx-6 flex h-12 w-full max-w-md items-center rounded-full border border-neutral-200/60 bg-brand-white px-2 py-1.5 shadow-xs transition-all hover:shadow-md">
          <button className="min-w-0 flex-1 border-r border-neutral-200/60 px-4 text-left">
            <p className="text-[9px] font-bold uppercase leading-none tracking-wider text-brand-text-dark">
              Pesquisar
            </p>
            <span className="mt-0.5 block truncate text-xs font-medium text-brand-text-medium/60">
              Qualquer propriedade
            </span>
          </button>
          <Link
            href={`/${locale}/reservations/new`}
            className="ml-1 flex shrink-0 items-center gap-1.5 rounded-full bg-brand-blue px-4 py-2.5 text-[11px] font-bold text-white shadow-sm transition-all hover:bg-brand-blue/90"
          >
            <Search className="h-3.5 w-3.5 stroke-[3]" />
            NOVA RESERVA
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <LocaleSelector />
          <button
            className="relative flex h-11 w-11 items-center justify-center rounded-full border border-neutral-200/60 bg-brand-bg text-brand-text-dark shadow-2xs transition-all hover:bg-brand-bg/85"
            aria-label="Notificações"
          >
            <Bell className="h-4.5 w-4.5" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand-gold ring-2 ring-brand-white" />
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-7xl space-y-7 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold tracking-tight text-brand-text-dark">
              DASHBOARD
              <span className="rounded-full bg-brand-blue/10 px-2.5 py-0.5 text-[10px] font-bold text-brand-blue">
                Painel Geral
              </span>
            </h1>
            <p className="mt-1 text-xs font-semibold text-brand-text-medium">
              Visão geral do seu negócio de aluguel de temporada
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/${locale}/reservations/new`}
              className="flex items-center gap-1.5 rounded-full bg-brand-blue px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-brand-blue/90"
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Nova Reserva
            </Link>
            <div className="flex flex-col items-center gap-1">
              <Link
                href={`/${locale}/sync`}
                className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-brand-white px-4 py-2 text-xs font-semibold text-brand-text-dark transition-all hover:bg-brand-bg"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Sincronizar
              </Link>
              {lastSyncLog && (
                <p
                  className={`flex items-center gap-1 whitespace-nowrap text-[10px] font-semibold ${
                    lastSyncLog.status === 'success' ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {lastSyncLog.status === 'success' ? (
                    <CheckCircle className="h-3 w-3" />
                  ) : (
                    <XCircle className="h-3 w-3" />
                  )}
                  {lastSyncLog.status === 'success'
                    ? `Sincronizado às ${formatSyncTimestamp(lastSyncLog.synced_at)}`
                    : `Falha na sincronização às ${formatSyncTimestamp(lastSyncLog.synced_at)}`}
                </p>
              )}
            </div>
            <Link
              href={`/${locale}/reports/financeiro`}
              className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-brand-white px-4 py-2 text-xs font-semibold text-brand-text-dark transition-all hover:bg-brand-bg"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Exportar
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {[
            {
              label: 'Propriedades',
              value: totalProperties,
              type: 'TOTAL',
              icon: Home,
              iconClass: 'text-brand-blue',
              badgeClass: 'border-brand-blue/10 bg-brand-bg',
              description: 'Casas e apartamentos gerenciados',
              href: `/${locale}/properties`,
            },
            {
              label: 'Reservas',
              value: totalReservations,
              type: 'TOTAL',
              icon: CalendarDays,
              iconClass: 'text-brand-gold',
              badgeClass: 'border-brand-gold/20 bg-brand-bg',
              description: 'Estadias agendadas e concluídas',
              href: `/${locale}/reservations`,
            },
            {
              label: 'Taxa de Ocupação',
              value: `${currentMonthOccupancy}%`,
              type: monthShort,
              icon: Percent,
              iconClass: 'text-brand-blue',
              badgeClass: 'border-brand-blue/10 bg-brand-bg',
              description: 'Média de noites reservadas este mês',
              href: `/${locale}/calendar`,
            },
          ].map((card) => {
            const Icon = card.icon
            return (
              <Link
                key={card.label}
              href={card.href}
                className="group relative flex flex-col rounded-2xl border border-neutral-200/60 bg-brand-white p-6 text-left shadow-2xs transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-gold/45 hover:shadow-[0_18px_42px_rgba(201,162,39,0.14)]"
              >
                <div className="mb-4 flex w-full items-center justify-between">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all group-hover:scale-105 group-hover:border-brand-gold/40 group-hover:bg-brand-gold/10 ${card.badgeClass}`}>
                    <Icon className={`h-5 w-5 transition-colors group-hover:text-brand-gold ${card.iconClass}`} />
                  </div>
                  <span className="text-[10px] font-bold tracking-wider text-brand-text-medium transition-colors group-hover:text-brand-gold">
                    {card.type}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="dashboard-metric-value text-3xl font-bold leading-none tracking-tight text-brand-text-dark transition-colors group-hover:text-brand-gold">
                    {card.value}
                  </h3>
                  <p className="mt-2 text-xs font-semibold text-brand-text-medium">
                    {card.label}
                  </p>
                </div>
                <div className="mt-4 w-full border-t border-brand-bg pt-3">
                  <p className="text-[10px] font-medium text-brand-text-medium">
                    {card.description}
                  </p>
                </div>
                <div className="absolute inset-x-0 bottom-0 h-1 rounded-b-2xl bg-gradient-to-r from-transparent via-brand-gold/0 to-transparent transition-all duration-500 group-hover:via-brand-gold" />
              </Link>
            )
          })}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Link
            href={`/${locale}/financial`}
            className="group flex flex-col justify-between rounded-2xl border border-neutral-200/60 bg-brand-white p-6 text-left shadow-2xs transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-gold/45 hover:shadow-[0_18px_42px_rgba(201,162,39,0.14)]"
          >
            <div>
              <div className="mb-5 flex items-center gap-3.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200/60 bg-brand-bg text-brand-text-dark transition-all group-hover:border-brand-gold/40 group-hover:bg-brand-gold/10 group-hover:text-brand-gold">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-brand-text-dark transition-colors group-hover:text-brand-gold">Receita do Mês</h3>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-brand-text-medium transition-colors group-hover:text-brand-gold">{monthLabel}</p>
                </div>
              </div>

              {revenueEntries.length === 0 ? (
                <p className="text-3xl font-bold text-brand-text-medium">-</p>
              ) : (
                <div className="space-y-4">
                  {revenueEntries.map(([cur, amount], idx) => (
                    <div
                      key={cur}
                      className={idx < revenueEntries.length - 1 ? 'flex items-center justify-between border-b border-dashed border-neutral-200/50 pb-3.5' : 'flex items-center justify-between'}
                    >
                      <span className={`rounded-md border px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-wide ${currencyBadgeClass(cur)}`}>
                        {cur}
                      </span>
                      <span className="text-right text-2xl font-bold tracking-tight text-brand-text-dark">
                        {formatCurrency(amount, cur as CurrencyCode)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-5 flex w-full items-center justify-between border-t border-brand-bg pt-3.5 text-[10px] font-semibold text-brand-text-medium">
              <span>Faturamento bruto deste mês</span>
              <span className="font-bold text-brand-blue transition-colors group-hover:text-brand-gold group-hover:underline">Ver faturas &rarr;</span>
            </div>
          </Link>

          <Link
            href={`/${locale}/financial`}
            className="group flex flex-col justify-between rounded-2xl border border-neutral-200/60 bg-brand-white p-6 text-left shadow-2xs transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-gold/45 hover:shadow-[0_18px_42px_rgba(201,162,39,0.14)]"
          >
            <div>
              <div className="mb-5 flex items-center gap-3.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200/60 bg-brand-bg text-brand-text-dark transition-all group-hover:border-brand-gold/40 group-hover:bg-brand-gold/10 group-hover:text-brand-gold">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-brand-text-dark transition-colors group-hover:text-brand-gold">Lucro Real</h3>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-brand-text-medium transition-colors group-hover:text-brand-gold">{monthLabel}</p>
                </div>
              </div>

              {financeCurrencies.length === 0 ? (
                <p className="text-3xl font-bold text-brand-text-medium">-</p>
              ) : (
                <div className="space-y-4">
                  {financeCurrencies.map((cur, idx) => {
                    const revenue = monthRevenueByCurrency[cur] || 0
                    const expenses = monthExpensesByCurrency[cur] || 0
                    const profit = revenue - expenses
                    const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0
                    return (
                      <div
                        key={cur}
                        className={idx < financeCurrencies.length - 1 ? 'flex items-center justify-between border-b border-dashed border-neutral-200/50 pb-3.5' : 'flex items-center justify-between'}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`rounded-md border px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-wide ${currencyBadgeClass(cur)}`}>
                            {cur}
                          </span>
                          <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                            margin >= 50 ? 'bg-emerald-500/10 text-emerald-600'
                            : margin >= 20 ? 'bg-brand-gold/15 text-brand-gold'
                            : 'bg-red-500/10 text-red-600'
                          }`}>
                            {margin}%
                          </span>
                        </div>
                        <span className={`text-right text-2xl font-bold tracking-tight ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {formatCurrency(profit, cur as CurrencyCode)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="mt-5 flex w-full items-center justify-between border-t border-brand-bg pt-3.5 text-[10px] font-semibold text-brand-text-medium">
              <span>Receita líquida deduzindo custos</span>
              <span className="font-bold text-brand-blue transition-colors group-hover:text-brand-gold group-hover:underline">Ver fluxo de caixa &rarr;</span>
            </div>
          </Link>
        </div>

        <Link
          href={`/${locale}/reservations`}
          className="group flex w-full flex-col justify-between gap-6 rounded-2xl border border-neutral-200/60 bg-brand-white p-6 text-left shadow-2xs transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-gold/45 hover:shadow-[0_18px_42px_rgba(201,162,39,0.14)] md:flex-row md:items-center"
        >
          <div className="flex items-start gap-4">
            <div className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-brand-blue/10 bg-brand-blue/5 text-brand-blue transition-all group-hover:border-brand-gold/40 group-hover:bg-brand-gold/10 group-hover:text-brand-gold">
              <TrendingUp className="h-6 w-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold uppercase tracking-wide text-brand-text-dark transition-colors group-hover:text-brand-gold">
                  Previsão de Faturamento
                </h3>
                <span className="rounded-full bg-brand-blue/10 px-2 py-0.5 text-[10px] font-bold text-brand-blue">
                  {futureConfirmedCount} reserva{futureConfirmedCount !== 1 ? 's' : ''}
                </span>
              </div>
              <p className="mt-1 text-xs text-brand-text-medium">
                Reservas confirmadas a partir de hoje
              </p>
              <div className="mt-3 flex items-center gap-1 text-[10px] font-semibold text-brand-text-medium">
                <CalendarDays className="h-3 w-3" />
                Próximas receitas distribuídas por moeda
              </div>
            </div>
          </div>

          {forecastEntries.length === 0 ? (
            <p className="border-t border-neutral-100 pt-4 text-sm font-semibold text-brand-text-medium md:border-t-0 md:pt-0">
              Nenhuma reserva futura com valor registado.
            </p>
          ) : (
            <div className="flex shrink-0 flex-col gap-4 border-t border-neutral-100 pt-4 sm:flex-row sm:items-center sm:gap-6 md:border-t-0 md:pt-0">
              {forecastEntries.map(([currency, amount], idx) => (
                <div key={currency} className="px-1">
                  <span className={`mb-1 block w-fit rounded-md border px-2 py-0.5 font-mono text-[9px] font-bold tracking-wide ${currencyBadgeClass(currency)}`}>
                    {currency}
                  </span>
                  <p className="text-2xl font-bold leading-none tracking-tight text-brand-text-dark">
                    {formatCurrency(amount, currency as CurrencyCode)}
                  </p>
                  {idx < forecastEntries.length - 1 && <span className="hidden" />}
                </div>
              ))}
              <div className="hidden h-8 w-8 items-center justify-center rounded-full bg-brand-bg text-brand-text-medium transition-colors group-hover:bg-brand-gold group-hover:text-white md:flex">
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </div>
          )}
        </Link>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="group flex flex-col rounded-2xl border border-neutral-200/60 bg-brand-white p-6 shadow-2xs transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-gold/45 hover:shadow-[0_18px_42px_rgba(201,162,39,0.14)]">
            <div className="mb-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text-dark transition-colors group-hover:text-brand-gold">Taxa de Ocupação</h3>
              <p className="mt-1 text-[11px] font-semibold text-brand-text-medium">
                Últimos 6 meses - {monthLabel}: {currentMonthOccupancy}%
              </p>
            </div>
            <OccupancyChart data={occupancyData} />
          </div>

          <div className="group flex flex-col rounded-2xl border border-neutral-200/60 bg-brand-white p-6 shadow-2xs transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-gold/45 hover:shadow-[0_18px_42px_rgba(201,162,39,0.14)]">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text-dark transition-colors group-hover:text-brand-gold">Receita Mensal</h3>
                <p className="mt-1 text-[11px] font-semibold text-brand-text-medium">Faturamento consolidado por moeda</p>
              </div>
            </div>
            <RevenueChartWrapper revenueDataByCurrency={revenueDataByCurrency} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="group rounded-2xl border border-neutral-200/60 bg-brand-white p-6 shadow-2xs transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-gold/45 hover:shadow-[0_18px_42px_rgba(201,162,39,0.14)]">
            <div className="mb-6">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-text-dark transition-colors group-hover:text-brand-gold">
                <CheckCircle className="h-4 w-4 text-brand-blue transition-colors group-hover:text-brand-gold" />
                Reservas por Status
              </h3>
              <p className="mt-1 text-[11px] font-semibold text-brand-text-medium">Distribuição atual</p>
            </div>
            <StatusChart
              confirmed={confirmedReservations}
              pending={pendingReservations}
              cancelled={cancelledReservations}
            />
          </div>

          <div className="group rounded-2xl border border-neutral-200/60 bg-brand-white p-6 shadow-2xs transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-gold/45 hover:shadow-[0_18px_42px_rgba(201,162,39,0.14)]">
            <div className="mb-6">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-text-dark transition-colors group-hover:text-brand-gold">
                <Clock className="h-4 w-4 text-brand-blue transition-colors group-hover:text-brand-gold" />
                Próximas Chegadas
              </h3>
              <p className="mt-1 text-[11px] font-semibold text-brand-text-medium">Próximos 7 dias</p>
            </div>

            {upcomingCheckIns && upcomingCheckIns.length > 0 ? (
              <div className="space-y-3">
                {upcomingCheckIns.map((reservation) => {
                  const checkInDate = new Date(reservation.check_in)
                  const checkOutDate = new Date(reservation.check_out)
                  const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))

                  const rawListing = reservation.property_listings
                  const listing = Array.isArray(rawListing) ? rawListing[0] : rawListing
                  const rawProperty = listing?.properties
                  const property = Array.isArray(rawProperty) ? rawProperty[0] : rawProperty
                  const propertyName = property?.name || 'Propriedade'
                  const platformName = (listing?.platforms as { display_name?: string } | null)?.display_name

                  const rawGuest = reservation.guests
                  const guest = Array.isArray(rawGuest) ? rawGuest[0] : rawGuest
                  const guestName = guest
                    ? `${guest.first_name || ''} ${guest.last_name || ''}`.trim()
                    : reservation.guest_name || 'Hóspede Importado'

                  return (
                    <Link
                      key={reservation.id}
                      href={`/${locale}/reservations/${reservation.id}`}
                      className="flex items-center justify-between rounded-xl bg-brand-bg p-3 transition-all duration-150 hover:-translate-y-0.5 hover:bg-brand-blue/5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-brand-text-dark">{guestName}</p>
                        <p className="truncate text-sm text-brand-text-medium">{propertyName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {platformName && (
                            <span className="rounded bg-brand-blue/10 px-1.5 py-0.5 text-xs font-medium text-brand-blue">
                              {platformName}
                            </span>
                          )}
                          <span className="text-xs text-brand-text-medium">{nights} noite{nights !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      <div className="text-right ml-3 shrink-0">
                        <p className="text-sm font-semibold text-brand-blue">
                          {checkInDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </p>
                        <p className="text-xs text-brand-text-medium">
                          até {checkOutDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="rounded-xl bg-brand-bg py-8 text-center text-brand-text-medium">
                <Clock className="mx-auto mb-2 h-12 w-12 text-brand-text-medium" />
                <p className="text-sm font-semibold">Nenhuma chegada prevista</p>
              </div>
            )}
          </div>
        </div>

        <div className="group rounded-2xl border border-neutral-200/60 bg-brand-white p-6 shadow-2xs transition-all duration-300 hover:border-brand-gold/45 hover:shadow-[0_18px_42px_rgba(201,162,39,0.14)]">
          <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-brand-text-dark transition-colors group-hover:text-brand-gold">Ações Rápidas</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              href={`/${locale}/properties/new`}
              className="flex min-h-[48px] items-center gap-3 rounded-xl border border-neutral-200/60 bg-brand-bg p-3 transition-all duration-150 hover:-translate-y-0.5 hover:border-brand-blue/25 hover:bg-brand-blue/5 hover:shadow-sm sm:p-4"
            >
              <div className="rounded-lg bg-brand-blue/10 p-2.5">
                <Home className="h-5 w-5 text-brand-blue" />
              </div>
              <span className="text-sm font-semibold text-brand-text-dark">Nova Propriedade</span>
            </Link>

            <Link
              href={`/${locale}/reservations/new`}
              className="flex min-h-[48px] items-center gap-3 rounded-xl border border-neutral-200/60 bg-brand-bg p-3 transition-all duration-150 hover:-translate-y-0.5 hover:border-brand-gold/35 hover:bg-brand-gold/10 hover:shadow-sm sm:p-4"
            >
              <div className="rounded-lg bg-brand-gold/15 p-2.5">
                <CalendarDays className="h-5 w-5 text-brand-gold" />
              </div>
              <span className="text-sm font-semibold text-brand-text-dark">Nova Reserva</span>
            </Link>

            <Link
              href={`/${locale}/calendar`}
              className="flex min-h-[48px] items-center gap-3 rounded-xl border border-neutral-200/60 bg-brand-bg p-3 transition-all duration-150 hover:-translate-y-0.5 hover:border-brand-blue/25 hover:bg-brand-blue/5 hover:shadow-sm sm:p-4"
            >
              <div className="rounded-lg bg-brand-blue/10 p-2.5">
                <CalendarDays className="h-5 w-5 text-brand-blue" />
              </div>
              <span className="text-sm font-semibold text-brand-text-dark">Ver Calendário</span>
            </Link>

            <Link
              href={`/${locale}/reservations`}
              className="flex min-h-[48px] items-center gap-3 rounded-xl border border-neutral-200/60 bg-brand-bg p-3 transition-all duration-150 hover:-translate-y-0.5 hover:border-brand-gold/35 hover:bg-brand-gold/10 hover:shadow-sm sm:p-4"
            >
              <div className="rounded-lg bg-brand-gold/15 p-2.5">
                <FileSpreadsheet className="h-5 w-5 text-brand-gold" />
              </div>
              <span className="text-sm font-semibold text-brand-text-dark">Ver Reservas</span>
            </Link>
          </div>
        </div>
      </main>
      </div>
    </AuthLayout>
  )
}
