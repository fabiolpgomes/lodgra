import { FileText, TrendingUp, TrendingDown, Calendar, DollarSign, BarChart2, Target, BarChart3 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ReportsFilters } from '@/components/features/reports/ReportsFilters'
import { RevenueTable } from '@/components/features/reports/RevenueTable'
import { ExpensesTable } from '@/components/features/reports/ExpensesTable'
import { PropertyAnalysis } from '@/components/features/reports/PropertyAnalysis'
import { MonthlyComparison } from '@/components/features/reports/MonthlyComparison'
import { PLStatement } from '@/components/features/reports/PLStatement'
import { ChannelAnalysis } from '@/components/features/reports/ChannelAnalysis'
import { CashFlowForecast } from '@/components/features/reports/CashFlowForecast'
import { FinancialPdfDownloadButton } from '@/components/features/reports/FinancialPdfDownloadButton'
import { formatCurrency, groupByCurrency, CurrencyCode } from '@/lib/utils/currency'
import { CurrencyStack } from '@/components/common/ui/CurrencyStack'
import { normalizeChannelName } from '@/lib/utils/channels'
import { AuthLayout } from '@/components/common/layout/AuthLayout'
import { getUserPropertyIds } from '@/lib/auth/getUserProperties'
import { calcManagementFee, calcOwnerNet } from '@/lib/financial/calculations'

interface PageProps {
  searchParams: Promise<{
    start_date?: string
    end_date?: string
    property_id?: string
    tab?: string
  }>
}

/**
 * Reports Page - Comprehensive financial analytics dashboard
 *
 * Renders multi-faceted reporting views for property managers:
 * - Revenue analysis (gross, net, by channel, by property, by month)
 * - Expense tracking (operational, taxes, management fees)
 * - P&L statement with margin analysis
 * - Channel performance and dependency tracking
 * - Cash flow forecast (30/60/90 day horizons)
 * - Occupancy rates and RevPAR calculations
 *
 * @component
 * @async
 * @param {PageProps} props - Page props with date/property filters
 * @returns {Promise<ReactElement>} Rendered reports dashboard
 *
 * @example
 * // Filter by date range and property
 * // ?start_date=2024-01-01&end_date=2024-03-31&property_id=abc123&tab=pl
 *
 * Data Flow:
 * 1. Parse URL params (dates, property filter, active tab)
 * 2. Fetch properties and reservations within date range
 * 3. Calculate metrics (revenue, expenses, occupancy, RevPAR, margin)
 * 4. Group data by currency, channel, month, property
 * 5. Render filtered view based on active tab
 *
 * Performance Notes:
 * - Uses Supabase query optimization (single round-trip for properties)
 * - Calculation-heavy: metrics computed server-side
 * - Multi-currency handling: values grouped by currency code
 * - RLS enforced: userPropertyIds scopes all queries
 */
import { LazyFinancialOverviewCharts } from '@/components/common/lazy/LazyCharts'

export default async function ReportsPage({ searchParams }: PageProps) {
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
  const activeTab = params.tab || 'dashboard'

  // Buscar propriedades (filtradas por escopo) com management_percentage e owner
  let propertiesQuery = supabase
    .from('properties')
    .select('id, name, management_percentage, owners(full_name)')
    .eq('is_active', true)
    .order('name')
  if (userPropertyIds) propertiesQuery = propertiesQuery.in('id', userPropertyIds)
  const { data: properties } = await propertiesQuery

  // Mapa rápido para lookup: propertyId → { management_percentage, owner_name }
  const propertyMeta: Record<string, { management_percentage: number; owner_name: string | null }> = {}
  properties?.forEach(p => {
    const owner = p.owners as unknown as { full_name: string } | null
    propertyMeta[p.id] = {
      management_percentage: Number(p.management_percentage ?? 0),
      owner_name: owner?.full_name ?? null,
    }
  })

  // Query base de reservas
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

  // Filtro por propriedade nas reservas
  if (propertyId) {
    reservationsQuery = reservationsQuery.eq('property_listings.property_id', propertyId)
  }
  if (userPropertyIds) {
    reservationsQuery = reservationsQuery.in('property_listings.property_id', userPropertyIds)
  }

  // Query de reservas futuras (a partir de hoje, independente dos filtros de data)
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

  // Query de despesas
  let expensesQuery = supabase
    .from('expenses')
    .select(`
      *,
      properties(
        id,
        name,
        currency
      )
    `)
    .gte('expense_date', startDate)
    .lte('expense_date', endDate)
    .order('expense_date', { ascending: false })

  // Filtro por propriedade nas despesas
  if (propertyId) {
    expensesQuery = expensesQuery.eq('property_id', propertyId)
  }
  if (userPropertyIds) {
    expensesQuery = expensesQuery.in('property_id', userPropertyIds)
  }

  // Executar todas as queries em paralelo
  const [reservationsResult, expensesResult, futureReservationsResult] = await Promise.all([
    reservationsQuery,
    expensesQuery,
    futureReservationsQuery,
  ])

  const reservations = reservationsResult.data
  const expenses = expensesResult.data
  const futureReservations = futureReservationsResult.data || []

  // Helper: use property.currency as primary source (Airbnb imports store 'EUR' in reservation.currency)
  function getResCurrency(r: { currency?: string | null; property_listings?: unknown }): CurrencyCode {
    const listing = r.property_listings
    const lObj = Array.isArray(listing) ? listing[0] : listing
    const prop = (lObj as { properties?: { currency?: string } } | null)?.properties
    const propObj = Array.isArray(prop) ? prop[0] : prop
    return ((propObj?.currency || r.currency || 'EUR') as CurrencyCode)
  }

  // Métricas de ocupação e RevPAR
  const numberOfProperties = propertyId ? 1 : (properties?.length || 1)
  const periodDays = Math.ceil(
    (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
  )
  const totalAvailableNights = periodDays * numberOfProperties

  // Calcular métricas de receita por moeda
  const revenueByCurrency = groupByCurrency(
    reservations?.map(r => ({
      currency: getResCurrency(r),
      amount: r.total_amount ? Number(r.total_amount) : 0
    })) || []
  )

  const totalReservations = reservations?.length || 0

  // Calcular noites e contagem de reservas por moeda para ADR e valor médio
  const nightsByCurrency: Record<string, number> = {}
  const reservationCountByCurrency: Record<string, number> = {}
  reservations?.forEach(r => {
    const currency = getResCurrency(r)
    const checkIn = new Date(r.check_in)
    const checkOut = new Date(r.check_out)
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
    nightsByCurrency[currency] = (nightsByCurrency[currency] || 0) + nights
    reservationCountByCurrency[currency] = (reservationCountByCurrency[currency] || 0) + 1
  })

  const adrByCurrency: Record<string, number> = {}
  const avgBookingByCurrency: Record<string, number> = {}
  Object.keys(revenueByCurrency).forEach(currency => {
    const revenue = revenueByCurrency[currency as CurrencyCode] || 0
    const nights = nightsByCurrency[currency] || 0
    const count = reservationCountByCurrency[currency] || 0
    adrByCurrency[currency] = nights > 0 ? revenue / nights : 0
    avgBookingByCurrency[currency] = count > 0 ? revenue / count : 0
  })

  // Taxas de plataforma e receita líquida
  const platformFeesByCurrency = groupByCurrency(
    reservations?.map(r => ({
      currency: getResCurrency(r),
      amount: r.platform_fee ? Number(r.platform_fee) : 0
    })) || []
  )

  const netRevenueByCurrency = groupByCurrency(
    reservations?.map(r => ({
      currency: getResCurrency(r),
      amount: r.net_amount
        ? Number(r.net_amount)
        : Number(r.total_amount || 0) - (r.platform_fee ? Number(r.platform_fee) : 0)
    })) || []
  )

  // RevPAR por moeda
  const revparByCurrency: Record<string, number> = {}
  Object.keys(revenueByCurrency).forEach(currency => {
    const revenue = revenueByCurrency[currency as CurrencyCode] || 0
    revparByCurrency[currency] = totalAvailableNights > 0 ? revenue / totalAvailableNights : 0
  })

  // Taxa de ocupação global
  const totalNightsBooked = Object.values(nightsByCurrency).reduce((sum, n) => sum + n, 0)
  const occupancyRate = totalAvailableNights > 0
    ? Math.min((totalNightsBooked / totalAvailableNights) * 100, 100)
    : 0

  // Despesas separadas por categoria (operacional vs impostos)
  const operationalExpenses = expenses?.filter(e => e.category !== 'taxes') || []
  const taxExpenses = expenses?.filter(e => e.category === 'taxes') || []

  const operationalByCurrency = groupByCurrency(
    operationalExpenses.map(e => ({
      currency: (e.currency || e.properties?.currency || 'EUR') as CurrencyCode,
      amount: Number(e.amount || 0)
    }))
  )

  const taxByCurrency = groupByCurrency(
    taxExpenses.map(e => ({
      currency: (e.currency || e.properties?.currency || 'EUR') as CurrencyCode,
      amount: Number(e.amount || 0)
    }))
  )

  // Total de despesas (card existente)
  const expensesByCurrency = groupByCurrency(
    expenses?.map(e => ({
      currency: (e.currency || e.properties?.currency || 'EUR') as CurrencyCode,
      amount: e.amount ? Number(e.amount) : 0
    })) || []
  )

  // Lucro líquido corrigido: receita líquida - despesas operacionais - impostos
  const allCurrencies = new Set([
    ...Object.keys(netRevenueByCurrency),
    ...Object.keys(operationalByCurrency),
    ...Object.keys(taxByCurrency),
  ])
  const netProfitByCurrency: Record<string, number> = {}
  allCurrencies.forEach(currency => {
    const netRev = netRevenueByCurrency[currency as CurrencyCode] || 0
    const opEx = operationalByCurrency[currency as CurrencyCode] || 0
    const taxEx = taxByCurrency[currency as CurrencyCode] || 0
    netProfitByCurrency[currency] = netRev - opEx - taxEx
  })

  // Agrupar por propriedade
  const revenueByProperty = reservations?.reduce((acc: Record<string, { id: string; name: string; currency: string; revenue: number; reservations: number; nights: number; availableNights: number }>, r) => {
    const listing = r.property_listings as unknown as { properties: { id: string; name: string } } | null
    const propertyId = listing?.properties?.id
    const propertyName = listing?.properties?.name
    if (!propertyId) return acc

    if (!acc[propertyId]) {
      acc[propertyId] = {
        id: propertyId,
        name: propertyName ?? '',
        currency: getResCurrency(r),
        revenue: 0,
        reservations: 0,
        nights: 0,
        availableNights: periodDays
      }
    }

    acc[propertyId].revenue += r.total_amount ? Number(r.total_amount) : 0
    acc[propertyId].reservations += 1

    const checkIn = new Date(r.check_in)
    const checkOut = new Date(r.check_out)
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
    acc[propertyId].nights += nights

    return acc
  }, {}) || {}

  // Agrupar despesas por propriedade
  const expensesByProperty = expenses?.reduce((acc: Record<string, number>, e) => {
    const propId = e.property_id;
    if (!propId) return acc;
    if (!acc[propId]) acc[propId] = 0;
    acc[propId] += Number(e.amount || 0);
    return acc;
  }, {}) || {};

  // Enriquecer com comissão de gestão e receita líquida do proprietário
  const propertyStats = Object.values(revenueByProperty).map(stat => {
    const meta = propertyMeta[stat.id] ?? { management_percentage: 0, owner_name: null }
    const propertyExpenses = expensesByProperty[stat.id] || 0;
    return {
      ...stat,
      management_percentage: meta.management_percentage,
      management_fee: calcManagementFee(stat.revenue, meta.management_percentage),
      owner_net: calcOwnerNet(stat.revenue, meta.management_percentage) - propertyExpenses,
      owner_name: meta.owner_name,
    }
  })

  // Calcular totais por moeda (para FinancialOverviewCharts)
  const totalsByCurrency: Record<string, { revenue: number; mgmt: number; owner: number }> = {}
  propertyStats.forEach(stat => {
    const currency = stat.currency as CurrencyCode
    if (!totalsByCurrency[currency]) {
      totalsByCurrency[currency] = { revenue: 0, mgmt: 0, owner: 0 }
    }
    totalsByCurrency[currency].revenue += stat.revenue
    totalsByCurrency[currency].mgmt += stat.management_fee
    totalsByCurrency[currency].owner += stat.owner_net
  })

  // Agrupar por mês
  const revenueByMonth = reservations?.reduce((acc: Record<string, { monthKey: string; month: string; currency: string; revenue: number; reservations: number; nights: number; availableNights: number }>, r) => {
    const date = new Date(r.check_in)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const monthName = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()

    if (!acc[monthKey]) {
      acc[monthKey] = {
        monthKey,
        month: monthName,
        currency: getResCurrency(r),
        revenue: 0,
        reservations: 0,
        nights: 0,
        availableNights: daysInMonth * numberOfProperties
      }
    }

    acc[monthKey].revenue += r.total_amount ? Number(r.total_amount) : 0
    acc[monthKey].reservations += 1

    const checkIn = new Date(r.check_in)
    const checkOut = new Date(r.check_out)
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
    acc[monthKey].nights += nights

    return acc
  }, {}) || {}

  const monthlyStats = Object.values(revenueByMonth).sort((a, b) =>
    a.monthKey.localeCompare(b.monthKey)
  )

  // Horizontes de previsão (30/60/90 dias)
  // Business rule: reservations spanning multiple months (Airbnb, Booking, VRBO, etc.)
  // are distributed proportionally — monthly_value = total_amount / (total_days / 30).
  // Each 30-day window receives the share proportional to the days that fall within it.
  const now = new Date()
  const day30 = new Date(now); day30.setDate(now.getDate() + 30)
  const day60 = new Date(now); day60.setDate(now.getDate() + 60)
  const day90 = new Date(now); day90.setDate(now.getDate() + 90)

  function overlapDays(checkIn: Date, checkOut: Date, winStart: Date, winEnd: Date): number {
    const start = checkIn < winStart ? winStart : checkIn
    const end = checkOut > winEnd ? winEnd : checkOut
    if (start >= end) return 0
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  }

  function summarizeHorizon(winStart: Date, winEnd: Date) {
    const revByCurrency: Record<string, number> = {}
    let totalNights = 0
    const ids = new Set<string>()
    futureReservations.forEach(r => {
      const checkIn = new Date(r.check_in)
      const checkOut = new Date(r.check_out)
      const totalDays = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
      if (totalDays <= 0) return
      const overlap = overlapDays(checkIn, checkOut, winStart, winEnd)
      if (overlap <= 0) return
      const cur = getResCurrency(r)
      const amount = r.total_amount ? Number(r.total_amount) : 0
      // Proportional share: total_amount × (overlap_days / total_days)
      // Equivalent to: (total_amount / (total_days/30)) per 30-day window
      revByCurrency[cur] = (revByCurrency[cur] || 0) + amount * (overlap / totalDays)
      totalNights += overlap
      ids.add(r.id)
    })
    return { revenueByCurrency: revByCurrency, reservations: ids.size, nights: totalNights }
  }

  const futureHorizon30 = summarizeHorizon(now, day30)
  const futureHorizon60 = summarizeHorizon(day30, day60)
  const futureHorizon90 = summarizeHorizon(day60, day90)

  // Agrupar reservas futuras por mês — reservas longas aparecem em cada mês que abrangem
  // com o valor proporcional (total_amount / coef, coef = total_days/30)
  const futureByMonth = futureReservations.reduce(
    (acc: Record<string, { month: string; reservations: typeof futureReservations }>, r) => {
      const checkIn = new Date(r.check_in)
      const checkOut = new Date(r.check_out)
      const totalDays = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
      // Iterate over each calendar month the reservation covers
      const cursor = new Date(checkIn.getFullYear(), checkIn.getMonth(), 1)
      while (cursor <= checkOut) {
        const monthStart = new Date(cursor)
        const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59)
        const overlap = overlapDays(checkIn, checkOut, monthStart, monthEnd)
        if (overlap > 0) {
          const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`
          const label = cursor.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
          if (!acc[key]) acc[key] = { month: label, reservations: [] }
          const proportionalAmount = totalDays > 0
            ? (r.total_amount ? Number(r.total_amount) : 0) * (overlap / totalDays)
            : 0
          acc[key].reservations.push({ ...r, total_amount: proportionalAmount })
        }
        cursor.setMonth(cursor.getMonth() + 1)
      }
      return acc
    },
    {}
  )

  // Agrupar por canal (source)
  interface ChannelStat {
    name: string
    revenue: number
    reservations: number
    nights: number
    currency: string
  }
  const revenueByChannel = reservations?.reduce((acc: Record<string, ChannelStat>, r) => {
    const rawChannel = (r.source as string | null) || 'direct'
    const channelName = normalizeChannelName(rawChannel)

    if (!acc[channelName]) {
      acc[channelName] = {
        name: channelName,
        revenue: 0,
        reservations: 0,
        nights: 0,
        currency: getResCurrency(r),
      }
    }

    acc[channelName].revenue += r.total_amount ? Number(r.total_amount) : 0
    acc[channelName].reservations += 1

    const checkIn = new Date(r.check_in)
    const checkOut = new Date(r.check_out)
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
    acc[channelName].nights += nights

    return acc
  }, {}) || {}

  const channelStats = Object.values(revenueByChannel).sort((a, b) => b.revenue - a.revenue)
  const totalRevenueAllChannels = channelStats.reduce((sum, c) => sum + c.revenue, 0)

  return (
    <AuthLayout>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-xl">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Relatórios Financeiros</h2>
            </div>
            <p className="text-gray-500 text-sm ml-14">
              Análise detalhada de receitas, despesas e performance das propriedades
            </p>
          </div>
          <FinancialPdfDownloadButton
            startDate={startDate}
            endDate={endDate}
            propertyId={propertyId}
          />
        </div>

        {/* Filtros com Abas */}
        <ReportsFilters
          properties={properties || []}
          startDate={startDate}
          endDate={endDate}
          propertyId={propertyId}
          activeTab={activeTab}
        />

        {/* Métricas Principais — Row 1: financials */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-4">
          <div className="border border-lodgra-blue/10 p-5 rounded-none shadow-none" style={{ backgroundColor: '#FFFFFF' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 rounded-none">
                <TrendingUp className="h-5 w-5" style={{ color: '#1E3A8A' }} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest font-display" style={{ color: '#1E3A8A' }}>Receita</span>
            </div>
            <div style={{ color: '#1E3A8A' }}>
              <CurrencyStack totals={revenueByCurrency} size="md" showEmpty={true} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-wider mt-2" style={{ color: '#1E3A8A' }}>Receita bruta no período</p>
          </div>

          <div className="bg-white border border-lodgra-blue/10 p-5 rounded-none">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-red-50 rounded-none">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-lodgra-navy/30 font-display">Despesas</span>
            </div>
            <div className="text-red-600">
              <CurrencyStack totals={expensesByCurrency} size="md" showEmpty={true} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-wider text-lodgra-navy/20 mt-2">Total despesas no período</p>
          </div>

          <div className="bg-white border border-lodgra-blue/10 p-5 rounded-none">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-lodgra-blue/5 rounded-none">
                <BarChart3 className="h-5 w-5 text-lodgra-blue" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-lodgra-navy/30 font-display">Lucro</span>
            </div>
            <div className="space-y-1.5">
              {Object.entries(netProfitByCurrency).length > 0 ? (
                Object.entries(netProfitByCurrency).map(([currency, amount]) => (
                  <div key={currency} className="flex items-center gap-2">
                    <span className={`inline-flex items-center justify-center min-w-[2.5rem] h-5 px-1.5 text-[10px] font-black uppercase tracking-widest rounded-none ring-1 shrink-0 ${
                      currency === 'EUR' ? 'bg-lodgra-blue/5 text-lodgra-blue ring-lodgra-blue/20' :
                      currency === 'BRL' ? 'bg-green-50 text-green-700 ring-green-200' :
                      currency === 'USD' ? 'bg-yellow-50 text-yellow-700 ring-yellow-200' :
                      'bg-purple-50 text-purple-700 ring-purple-200'
                    }`}>{currency}</span>
                    <span className={`text-xl font-black tabular-nums font-display ${amount >= 0 ? 'text-lodgra-blue' : 'text-red-600'}`}>
                      {formatCurrency(amount, currency as CurrencyCode)}
                    </span>
                  </div>
                ))
              ) : (
                <span className="text-xl font-black text-gray-200 font-display">—</span>
              )}
            </div>
            <p className="text-[10px] font-black uppercase tracking-wider text-lodgra-navy/20 mt-2">Lucro líquido no período</p>
          </div>
        </div>

        {/* Métricas Principais — Row 2: KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <div className="bg-white border border-lodgra-blue/10 p-5 rounded-none">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-lodgra-blue/5 rounded-none">
                <Calendar className="h-4 w-4 text-lodgra-blue" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-lodgra-navy/30 font-display">Reservas</span>
            </div>
            <p className="text-4xl font-black text-lodgra-blue font-display tracking-tighter">{totalReservations}</p>
            <p className="text-[10px] font-black uppercase tracking-wider text-lodgra-navy/20 mt-1">Confirmadas</p>
          </div>

          <div className="bg-white border border-lodgra-blue/10 p-5 rounded-none">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-lodgra-gold/5 rounded-none">
                <BarChart2 className="h-4 w-4 text-lodgra-gold" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-lodgra-navy/30 font-display">ADR</span>
            </div>
            <CurrencyStack totals={adrByCurrency} size="sm" showEmpty={true} />
            <p className="text-[10px] font-black uppercase tracking-wider text-lodgra-navy/20 mt-2">Diária média</p>
          </div>

          <div className="bg-white border border-lodgra-blue/10 p-5 rounded-none">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-lodgra-gold/5 rounded-none">
                <DollarSign className="h-4 w-4 text-lodgra-gold" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-lodgra-navy/30 font-display">RevPAR</span>
            </div>
            <div className="text-lodgra-gold">
              <CurrencyStack totals={revparByCurrency} size="sm" showEmpty={true} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-wider text-lodgra-navy/20 mt-2">Receita/noite disp.</p>
          </div>

          <div className="bg-white border border-lodgra-blue/10 p-5 rounded-none">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-teal-50 rounded-none">
                <Target className="h-4 w-4 text-teal-600" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-lodgra-navy/30 font-display">Ocupação</span>
            </div>
            <p className={`text-4xl font-black font-display tracking-tighter ${occupancyRate >= 70 ? 'text-green-600' : occupancyRate >= 40 ? 'text-yellow-600' : occupancyRate > 0 ? 'text-red-600' : 'text-gray-200'}`}>
              {totalAvailableNights > 0 ? `${occupancyRate.toFixed(1)}%` : '—'}
            </p>
            <p className="text-[10px] font-black uppercase tracking-wider text-lodgra-navy/20 mt-1">Taxa de ocupação</p>
          </div>
        </div>

        {/* Conteúdo da Aba Ativa */}
        {activeTab === 'dashboard' ? (
          <LazyFinancialOverviewCharts
            monthlyStats={monthlyStats}
            propertyStats={propertyStats}
            totalsByCurrency={totalsByCurrency}
          />
        ) : activeTab === 'receitas' ? (
          <>
            {/* Tabela de Receitas */}
            <RevenueTable
              reservations={(reservations || []) as unknown as Parameters<typeof RevenueTable>[0]['reservations']}
              startDate={startDate}
              endDate={endDate}
            />

            {/* Análises */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
              <PropertyAnalysis propertyStats={propertyStats} />
              <MonthlyComparison monthlyStats={monthlyStats} />
            </div>
          </>
        ) : activeTab === 'pl' ? (
          <PLStatement
            grossRevenue={revenueByCurrency}
            platformFees={platformFeesByCurrency}
            netRevenue={netRevenueByCurrency}
            operationalExpenses={operationalByCurrency}
            taxExpenses={taxByCurrency}
            netProfit={netProfitByCurrency}
            startDate={startDate}
            endDate={endDate}
          />
        ) : activeTab === 'canais' ? (
          <ChannelAnalysis
            channelStats={channelStats}
            totalRevenue={totalRevenueAllChannels}
            startDate={startDate}
            endDate={endDate}
          />
        ) : activeTab === 'previsao' ? (
          <CashFlowForecast
            horizon30={futureHorizon30}
            horizon60={futureHorizon60}
            horizon90={futureHorizon90}
            futureByMonth={futureByMonth as unknown as Parameters<typeof CashFlowForecast>[0]['futureByMonth']}
          />
        ) : (
          /* Tabela de Despesas */
          <ExpensesTable
            expenses={expenses || []}
            startDate={startDate}
            endDate={endDate}
          />
        )}
      </main>
    </AuthLayout>
  )
}
