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
  PieChart,
  Receipt,
  RefreshCw,
  Search,
  TrendingUp,
  TrendingDown,
  Wallet,
  Award,
  AlertTriangle,
  XCircle,
  Gauge,
  LogIn,
  LogOut,
  Sparkles,
  ShieldAlert,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/requireRole'
import { LazyOccupancyChart as OccupancyChart } from '@/components/common/lazy/LazyCharts'
import { formatCurrency, type CurrencyCode } from '@/lib/utils/currency'
import { RevenueChartWrapper } from '@/components/features/dashboard/RevenueChartWrapper'
import { PropertyFilterDropdown } from '@/components/features/dashboard/PropertyFilterDropdown'
import { MetricVarianceBadge } from '@/components/features/dashboard/MetricVarianceBadge'
import { InfoTooltip } from '@/components/common/ui/info-tooltip'
import { AuthLayout } from '@/components/common/layout/AuthLayout'
import { LocaleSelector } from '@/components/common/header/LocaleSelector'
import { ThemeToggle } from '@/components/common/header/ThemeToggle'
import { NotificationBell, type NotificationBellAlert } from '@/components/common/header/NotificationBell'
import { redirect } from 'next/navigation'
import { calculateRevenueForReservation } from '@/lib/financial/revenue-calculator'
// Story 39.4 — Ranking de Propriedades (ADR/RevPAR por propriedade)
import { buildPropertyRanking } from '@/lib/dashboard/propertyRanking'
import { sumCompanyExpensesForYear, type CompanyExpenseRow } from '@/lib/financial/company-expenses'
import {
  calculateADR,
  calculateRevPAR,
  calculateVariationPercent,
  monthKeyFromDate,
  countPropertiesByMonthEnd,
  filterRowsByMonth,
  filterRowsByProperties,
  aggregateMonthlyMetricsByCurrency,
  aggregateMonthlyMetricsTotal,
  aggregateManagementFeeByCurrency,
  type MonthlyPropertyMetricRow,
} from '@/lib/dashboard/metrics'
// Story 39.3 — Receita por Canal (% receita/reservas e comissão real por booking_source)
import { buildChannelRevenue, CHANNEL_CONCENTRATION_THRESHOLD, type ChannelReservationInput } from '@/lib/dashboard/channelRevenue'
// Story 39.6 — Painel de Alertas: concentração por propriedade (independente do threshold de canal acima)
import { buildPropertyConcentrationAlert, PROPERTY_CONCENTRATION_THRESHOLD } from '@/lib/dashboard/propertyConcentration'
// Story 39.6 — Sino de Notificações: 4 gatilhos, global da organização (nunca filtrado por propriedade)
import {
  buildPlaceholderGuestAlerts,
  buildSyncFailureAlert,
  buildPendingPaymentAlerts,
  calculateProspectiveOccupancy,
  buildLowOccupancyAlerts,
  LOW_OCCUPANCY_WINDOW_DAYS,
} from '@/lib/dashboard/notificationAlerts'

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
    .select('id, name, currency, management_percentage, created_at')
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
          booking_source,
          commission_amount,
          property_listing_id,
          property_listings!inner(
            id,
            property_id,
            properties(id, name, currency),
            platforms(display_name)
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

  // Story 39.3 — nome amigável de plataforma via property_listings.platform_id → platforms,
  // usado como fallback preferencial para o rótulo do canal (ver channelRevenue.ts).
  function getReservationPlatformName(r: { property_listings?: unknown }): string | null {
    const listing = r.property_listings
    const lObj = Array.isArray(listing) ? listing[0] : listing
    const platforms = (lObj as { platforms?: unknown } | null)?.platforms
    const platform = Array.isArray(platforms) ? platforms[0] : platforms
    return (platform as { display_name?: string | null } | null)?.display_name || null
  }

  const reservationList = reservations || []
  const totalProperties = properties?.length || 0
  const totalOrganizationProperties = allProperties?.length || 0
  const totalReservations = reservationList.length


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

  // Story 39.3 — Receita por Canal: usa a mesma população de "reservas do mês
  // corrente" (confirmadas, com estadia sobreposta ao mês) já usada pela
  // ocupação acima. Diferente do card "Receita do Mês", que distribui
  // reservas multi-mês proporcionalmente — aqui somamos o total_amount bruto
  // por canal, conforme a Description da story ("SUM(total_amount) por
  // booking_source / SUM(total_amount) total"). Decisão documentada nos Dev
  // Notes da Story 39.3.
  const channelReservationsByCurrency = currentMonthReservations.reduce((acc, r) => {
    const cur = getReservationCurrency(r)
    const row: ChannelReservationInput = {
      bookingSource: r.booking_source,
      totalAmount: r.total_amount != null ? Number(r.total_amount) : null,
      commissionAmount: r.commission_amount != null ? Number(r.commission_amount) : null,
      platformDisplayName: getReservationPlatformName(r),
    }
    if (!acc[cur]) acc[cur] = []
    acc[cur].push(row)
    return acc
  }, {} as Record<string, ChannelReservationInput[]>)

  const channelRevenueEntries = Object.entries(channelReservationsByCurrency)
    .map(([cur, rows]) => [cur, buildChannelRevenue(rows)] as const)
    .filter(([, result]) => result.totalReservations > 0 || result.excludedCount > 0)
    .sort(([a], [b]) => a.localeCompare(b))

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

  // ─── Story 39.2: Badges MoM/YoY + ADR/RevPAR + Lucro Real (via monthly_property_metrics) ───
  // Fonte: materialized view `monthly_property_metrics` (Story 39.1, Done). Ver
  // docs/stories/39.2-adr-revpar-badges-lucro-real.md para o detalhamento das fórmulas.
  const orgCurrency = org?.currency || 'EUR'
  const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const yoyMonthDate = new Date(now.getFullYear() - 1, now.getMonth(), 1)
  const currentMonthKeyView = monthKeyFromDate(now)
  const previousMonthKeyView = monthKeyFromDate(previousMonthDate)
  const yoyMonthKeyView = monthKeyFromDate(yoyMonthDate)

  // Query única org-wide (organization_id apenas) — o filtro de propriedade do topo
  // é aplicado em memória depois, porque o Lucro Real precisa da versão SEM filtro
  // (comissão de gestão e despesas da empresa não são filtráveis por propriedade).
  const { data: monthlyMetricsRows } = await supabase
    .from('monthly_property_metrics')
    .select('property_id, property_name, metric_month, gross_revenue, nights_sold, available_nights, booking_count, cancelled_count, incomplete_data_count')
    .eq('organization_id', organizationId)
    .in('metric_month', [currentMonthKeyView, previousMonthKeyView, yoyMonthKeyView])

  const allMetricRows = (monthlyMetricsRows || []) as MonthlyPropertyMetricRow[]

  // Recortado pelo filtro de propriedade ativo (afeta KPIs/ADR-RevPAR/Receita do Mês)
  const filteredMetricRows = filterRowsByProperties(allMetricRows, propertyIds)
  const currentFilteredRows = filterRowsByMonth(filteredMetricRows, currentMonthKeyView)
  const previousFilteredRows = filterRowsByMonth(filteredMetricRows, previousMonthKeyView)
  const yoyFilteredRows = filterRowsByMonth(filteredMetricRows, yoyMonthKeyView)

  const currentFilteredTotal = aggregateMonthlyMetricsTotal(currentFilteredRows)
  const previousFilteredTotal = aggregateMonthlyMetricsTotal(previousFilteredRows)
  const yoyFilteredTotal = aggregateMonthlyMetricsTotal(yoyFilteredRows)

  // Badge "Propriedades": tamanho real do portfólio até o fim de cada mês
  // (created_at), não "propriedades com reserva no mês" — ver
  // countPropertiesByMonthEnd em src/lib/dashboard/metrics.ts para o porquê
  // dessa mudança (confirmado com Fabio em 2026-07-23). Usa `properties`
  // (já recortado pelo filtro de propriedade do topo), mesma base do número
  // principal do card (`totalProperties`).
  const propertiesCountCurrent = countPropertiesByMonthEnd(properties || [], currentMonthKeyView)
  const propertiesCountPrevious = countPropertiesByMonthEnd(properties || [], previousMonthKeyView)
  const propertiesCountYoy = countPropertiesByMonthEnd(properties || [], yoyMonthKeyView)

  const propertiesVarianceMoM = calculateVariationPercent(
    propertiesCountCurrent, true,
    propertiesCountPrevious, true
  )
  const propertiesVarianceYoY = calculateVariationPercent(
    propertiesCountCurrent, true,
    propertiesCountYoy, true
  )
  const reservationsVarianceMoM = calculateVariationPercent(
    currentFilteredTotal.bookingCount, currentFilteredRows.length > 0,
    previousFilteredTotal.bookingCount, previousFilteredRows.length > 0
  )
  const reservationsVarianceYoY = calculateVariationPercent(
    currentFilteredTotal.bookingCount, currentFilteredRows.length > 0,
    yoyFilteredTotal.bookingCount, yoyFilteredRows.length > 0
  )

  // Ocupação (view) só para as badges — o valor principal do card "Taxa de Ocupação"
  // continua vindo de `currentMonthOccupancy` (calculado abaixo, a partir das reservas),
  // sem alterar o método já usado hoje na página.
  const occupancyFromTotal = (agg: typeof currentFilteredTotal) =>
    agg.availableNights > 0 ? (agg.nightsSold / agg.availableNights) * 100 : 0
  const occupancyPreviousView = occupancyFromTotal(previousFilteredTotal)
  const occupancyYoyView = occupancyFromTotal(yoyFilteredTotal)

  // Receita do Mês — badges por moeda (o valor principal do card segue usando
  // `monthRevenueByCurrency`, com distribuição proporcional já calculada acima).
  const currentByCurrency = aggregateMonthlyMetricsByCurrency(currentFilteredRows, propertyCurrencyMap, orgCurrency)
  const previousByCurrency = aggregateMonthlyMetricsByCurrency(previousFilteredRows, propertyCurrencyMap, orgCurrency)
  const yoyByCurrency = aggregateMonthlyMetricsByCurrency(yoyFilteredRows, propertyCurrencyMap, orgCurrency)

  function revenueVarianceForCurrency(cur: string, compareByCurrency: Record<string, ReturnType<typeof aggregateMonthlyMetricsByCurrency>[string]>) {
    const currentAgg = currentByCurrency[cur]
    const compareAgg = compareByCurrency[cur]
    return calculateVariationPercent(
      currentAgg?.grossRevenue || 0, Boolean(currentAgg),
      compareAgg?.grossRevenue || 0, Boolean(compareAgg)
    )
  }

  // ADR/RevPAR combinado, por moeda
  const adrCurrencyKeys = Array.from(new Set([
    ...Object.keys(currentByCurrency),
    ...Object.keys(previousByCurrency),
    ...Object.keys(yoyByCurrency),
  ])).sort((a, b) => a.localeCompare(b))

  const adrRevParEntries = adrCurrencyKeys.map((cur) => {
    const curAgg = currentByCurrency[cur]
    const prevAgg = previousByCurrency[cur]
    const yoyAgg = yoyByCurrency[cur]

    const adrCurrent = curAgg ? calculateADR(curAgg.grossRevenue, curAgg.nightsSold) : 0
    const adrPrevious = prevAgg ? calculateADR(prevAgg.grossRevenue, prevAgg.nightsSold) : 0
    const adrYoy = yoyAgg ? calculateADR(yoyAgg.grossRevenue, yoyAgg.nightsSold) : 0

    // Valor principal exibido: reaproveita `currentMonthOccupancy` (já calculado na página),
    // conforme decisão da story. Para as badges MoM/YoY usamos ocupação vinda da própria
    // view em todos os períodos, para uma comparação internamente consistente.
    const revparCurrentDisplay = calculateRevPAR(adrCurrent, currentMonthOccupancy)
    const occCurrentView = curAgg && curAgg.availableNights > 0 ? (curAgg.nightsSold / curAgg.availableNights) * 100 : 0
    const occPreviousViewCur = prevAgg && prevAgg.availableNights > 0 ? (prevAgg.nightsSold / prevAgg.availableNights) * 100 : 0
    const occYoyViewCur = yoyAgg && yoyAgg.availableNights > 0 ? (yoyAgg.nightsSold / yoyAgg.availableNights) * 100 : 0
    const revparCurrentView = calculateRevPAR(adrCurrent, occCurrentView)
    const revparPreviousView = calculateRevPAR(adrPrevious, occPreviousViewCur)
    const revparYoyView = calculateRevPAR(adrYoy, occYoyViewCur)

    return {
      currency: cur,
      adrCurrent,
      revparCurrent: revparCurrentDisplay,
      adrVarianceMoM: calculateVariationPercent(adrCurrent, Boolean(curAgg), adrPrevious, Boolean(prevAgg)),
      adrVarianceYoY: calculateVariationPercent(adrCurrent, Boolean(curAgg), adrYoy, Boolean(yoyAgg)),
      revparVarianceMoM: calculateVariationPercent(revparCurrentView, Boolean(curAgg), revparPreviousView, Boolean(prevAgg)),
      revparVarianceYoY: calculateVariationPercent(revparCurrentView, Boolean(curAgg), revparYoyView, Boolean(yoyAgg)),
    }
  })

  // ─── Lucro Real (nível 4 do modelo de receita) — sempre org-wide, nunca filtrado ───
  // por propriedade: comissão de gestão e despesas da empresa não são recortáveis por
  // imóvel individual (AC da Story 39.2).
  const allPropertyMeta = (allProperties || []).reduce((acc, p) => {
    acc[p.id] = {
      currency: p.currency || orgCurrency,
      managementPercentage: Number((p as { management_percentage?: number | null }).management_percentage || 0),
    }
    return acc
  }, {} as Record<string, { currency: string; managementPercentage: number }>)

  const orgCurrentRows = filterRowsByMonth(allMetricRows, currentMonthKeyView)
  const orgPreviousRows = filterRowsByMonth(allMetricRows, previousMonthKeyView)
  const orgYoyRows = filterRowsByMonth(allMetricRows, yoyMonthKeyView)

  const commissionCurrent = aggregateManagementFeeByCurrency(orgCurrentRows, allPropertyMeta, orgCurrency)
  const commissionPrevious = aggregateManagementFeeByCurrency(orgPreviousRows, allPropertyMeta, orgCurrency)
  const commissionYoy = aggregateManagementFeeByCurrency(orgYoyRows, allPropertyMeta, orgCurrency)

  // Despesas da empresa (`company_expenses`, org-wide) — mesmo padrão de query/agregação
  // de `src/app/[locale]/dashboard/empresa/page.tsx` (reaproveitado, não reinventado).
  const currentYear = now.getFullYear()
  const previousMonthYear = previousMonthDate.getFullYear()
  const yoyYear = currentYear - 1
  const earliestYearNeeded = Math.min(currentYear, previousMonthYear, yoyYear)

  const { data: companyExpensesRows, error: companyExpensesError } = await supabase
    .from('company_expenses')
    .select('id, description, amount, currency, category, expense_date, recurrence_type, recurrence_end_date, status, notes')
    .eq('organization_id', organizationId)
    .neq('status', 'cancelled')
    .lte('expense_date', currentMonthEnd.toISOString().slice(0, 10))
    .or(`recurrence_end_date.is.null,recurrence_end_date.gte.${earliestYearNeeded}-01-01`)

  if (companyExpensesError) {
    console.error('[dashboard] Erro ao buscar company_expenses para Lucro Real:', companyExpensesError)
  }

  const companyExpensesList = (companyExpensesRows || []) as CompanyExpenseRow[]

  const expensesByCurrentYear = sumCompanyExpensesForYear(companyExpensesList, currentYear)
  const expensesByPreviousYear = previousMonthYear === currentYear
    ? expensesByCurrentYear
    : sumCompanyExpensesForYear(companyExpensesList, previousMonthYear)
  const expensesByYoyYear = sumCompanyExpensesForYear(companyExpensesList, yoyYear)

  const companyExpensesCurrentMonth = expensesByCurrentYear.monthly[now.getMonth()]
  const companyExpensesPreviousMonth = expensesByPreviousYear.monthly[previousMonthDate.getMonth()]
  const companyExpensesYoyMonth = expensesByYoyYear.monthly[now.getMonth()]

  const profitCurrencies = Array.from(new Set([
    ...Object.keys(commissionCurrent),
    ...Object.keys(companyExpensesCurrentMonth),
  ])).sort((a, b) => a.localeCompare(b))

  const profitEntries = profitCurrencies.map((cur) => {
    const commission = commissionCurrent[cur]?.commission || 0
    const expenses = companyExpensesCurrentMonth[cur] || 0
    const profit = commission - expenses
    const margin = commission > 0 ? Math.round((profit / commission) * 100) : 0
    // "sem despesas lançadas este mês": nenhuma linha de company_expenses paga/recorrente
    // ativa nessa moeda no mês corrente — nunca comunicar isso como 100% de margem positiva.
    const hasCompanyExpensesThisMonth = Boolean(companyExpensesCurrentMonth[cur])

    const commissionPrev = commissionPrevious[cur]?.commission || 0
    const expensesPrev = companyExpensesPreviousMonth[cur] || 0
    const profitPrev = commissionPrev - expensesPrev

    const commissionYoyVal = commissionYoy[cur]?.commission || 0
    const expensesYoyVal = companyExpensesYoyMonth[cur] || 0
    const profitYoyVal = commissionYoyVal - expensesYoyVal

    return {
      currency: cur,
      commission,
      expenses,
      profit,
      margin,
      hasCompanyExpensesThisMonth,
      varianceMoM: calculateVariationPercent(profit, orgCurrentRows.length > 0, profitPrev, orgPreviousRows.length > 0),
      varianceYoY: calculateVariationPercent(profit, orgCurrentRows.length > 0, profitYoyVal, orgYoyRows.length > 0),
    }
  })

  // ─── Story 39.7: Card "Despesas do Mês" (despesas por propriedade, tabela `expenses`) ───
  // NÃO confundir com `company_expenses` (despesas da empresa, usadas no Lucro Real
  // acima) — são conceitos diferentes, não somar/misturar. Filtrada pelo mês corrente
  // e pelo filtro de propriedade ativo (`propertyIds`), espelhando "Receita do Mês".
  const { data: monthExpensesRows, error: monthExpensesError } = propertyIds.length > 0
    ? await supabase
        .from('expenses')
        .select('amount, currency, property_id, expense_date')
        .eq('organization_id', organizationId)
        .in('property_id', propertyIds)
        .gte('expense_date', currentMonthStart.toISOString().slice(0, 10))
        .lte('expense_date', currentMonthEnd.toISOString().slice(0, 10))
    : { data: null, error: null }

  if (monthExpensesError) {
    console.error('[dashboard] Erro ao buscar expenses (despesas por propriedade) para o card Despesas do Mês:', monthExpensesError)
  }

  const monthPropertyExpensesByCurrency = (monthExpensesRows || []).reduce((acc, expense) => {
    const propCur = expense.property_id ? propertyCurrencyMap[expense.property_id] : undefined
    const currency = propCur || expense.currency || orgCurrency
    const amount = Number(expense.amount) || 0
    acc[currency] = (acc[currency] || 0) + amount
    return acc
  }, {} as Record<string, number>)

  const propertyExpensesEntries = Object.entries(monthPropertyExpensesByCurrency).sort(([a], [b]) => a.localeCompare(b))

  // Story 39.4 — Ranking de Propriedades: buscar monthly_property_metrics do mês
  // corrente para todas as propriedades da organização (não filtrado por
  // propertyIds — quando há filtro de 1 propriedade específica, o ranking não
  // faz sentido e o card mostra uma mensagem em vez de quebrar, ver render).
  const currentMetricMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const { data: monthlyPropertyMetricsRows } = !selectedPropertyId && totalOrganizationProperties > 0
    ? await supabase
        .from('monthly_property_metrics')
        .select('property_id, property_name, gross_revenue, nights_sold, available_nights, booking_count')
        .eq('organization_id', organizationId)
        .eq('metric_month', currentMetricMonth)
    : { data: null }

  const propertyRanking = !selectedPropertyId
    ? buildPropertyRanking(
        monthlyPropertyMetricsRows || [],
        (allProperties || []).map(p => ({ id: p.id, name: p.name }))
      )
    : null

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

  // "Próximas Saídas" — mesma janela/padrão de "Próximas Chegadas", mas por check_out.
  // Todo check-out requer limpeza (contexto do Fabio) — junta com cleaning_tasks pelo
  // reservation_id para mostrar se já há limpeza agendada/concluída/com problema, ou se
  // ainda não foi agendada (o gap de visibilidade que motivou este card).
  const { data: upcomingCheckOuts } = propertyIds.length > 0
    ? await supabase
        .from('reservations')
        .select(`
          id,
          check_in,
          check_out,
          status,
          guest_name,
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
        .gte('check_out', today.toISOString().split('T')[0])
        .lte('check_out', nextWeek.toISOString().split('T')[0])
        .in('property_listings.property_id', propertyIds)
        .order('check_out', { ascending: true })
        .limit(5)
    : { data: null }

  const checkoutReservationIds = (upcomingCheckOuts || []).map((r) => r.id)
  const { data: checkoutCleaningRows } = checkoutReservationIds.length > 0
    ? await supabase
        .from('cleaning_tasks')
        .select('reservation_id, status')
        .in('reservation_id', checkoutReservationIds)
    : { data: null }

  const cleaningStatusByReservationId = new Map(
    (checkoutCleaningRows || [])
      .filter((c) => c.reservation_id)
      .map((c) => [c.reservation_id as string, c.status as string])
  )

  const CLEANING_STATUS_LABEL: Record<string, { label: string; className: string }> = {
    done: { label: 'Limpeza concluída', className: 'bg-emerald-500/10 text-emerald-600' },
    in_progress: { label: 'Limpeza em andamento', className: 'bg-brand-blue/10 text-brand-blue' },
    pending: { label: 'Limpeza agendada', className: 'bg-brand-gold/15 text-brand-gold' },
    issue: { label: 'Problema reportado', className: 'bg-red-500/10 text-red-600' },
  }

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

  // ─── Story 39.6 — Card "Hoje": check-ins, check-outs e limpezas do dia corrente ───
  // Check-ins/check-outs reaproveitam `reservationList` (já buscado acima, sem filtro de
  // data) — evita nova query. "Mensagens" foi avaliado e omitido: não há fonte de dado real
  // para isso no schema atual (Description da Story 39.6, item A — não inventar).
  function getReservationPropertyName(r: { property_listings?: unknown }): string {
    const listing = r.property_listings
    const lObj = Array.isArray(listing) ? listing[0] : listing
    const rawProperty = (lObj as { properties?: unknown } | null)?.properties
    const property = Array.isArray(rawProperty) ? rawProperty[0] : rawProperty
    return (property as { name?: string } | null)?.name || 'Propriedade'
  }

  const todayCheckIns = reservationList.filter(r => r.status === 'confirmed' && r.check_in === todayStr)
  const todayCheckOuts = reservationList.filter(r => r.status === 'confirmed' && r.check_out === todayStr)

  const { data: todayCleaningRows } = propertyIds.length > 0
    ? await supabase
        .from('cleaning_tasks')
        .select(`
          id,
          status,
          scheduled_time,
          reservation_id,
          property_id,
          properties(name)
        `)
        .eq('organization_id', organizationId)
        .in('property_id', propertyIds)
        .eq('scheduled_date', todayStr)
        .order('scheduled_time', { ascending: true })
    : { data: null }

  // `cleaning_tasks.reservation_id` é nullable (ON DELETE SET NULL) — limpezas avulsas sem
  // reserva associada ainda aparecem aqui, só sem link de reserva (Technical Notes da Story 39.6).
  const todayCleanings = (todayCleaningRows || []).map(c => {
    const rawProperty = c.properties
    const property = Array.isArray(rawProperty) ? rawProperty[0] : rawProperty
    return {
      id: c.id,
      status: c.status,
      scheduledTime: c.scheduled_time as string | null,
      reservationId: c.reservation_id as string | null,
      propertyName: (property as { name?: string } | null)?.name || 'Propriedade',
    }
  })

  // ─── Story 39.6 — Painel de Alertas: Concentração por Propriedade (>40% da receita do mês) ───
  // Usa `currentFilteredRows` (já filtrado pelo filtro de propriedade do topo, Story 39.2).
  // Quando 1 única propriedade está selecionada, concentração não faz sentido (mesmo
  // tratamento do Ranking de Propriedades, Story 39.4) — ver render mais abaixo.
  const propertyConcentrationAlert = !selectedPropertyId
    ? buildPropertyConcentrationAlert(
        currentFilteredRows.map(row => ({
          propertyId: row.property_id,
          propertyName: row.property_name,
          grossRevenue: Number(row.gross_revenue || 0),
        }))
      )
    : null

  // ─── Story 39.6 — Sino de Notificações: dados globais da organização ───
  // AC: o sino NÃO é recortado pelo filtro de propriedade do topo — usa `allPropertyIds`
  // (todas as propriedades ativas da organização), nunca `propertyIds` (filtrado).
  const allPropertyIds = (allProperties || []).map(p => p.id)

  // Gatilho 1: hóspede com nome placeholder (`guests.first_name === 'Hóspede'`, valor real
  // do código — ver `notificationAlerts.ts`). Escopo: reservas não canceladas cujo período
  // ainda não terminou (evita crescer sem limite sobre todo o histórico).
  const { data: placeholderGuestRows } = allPropertyIds.length > 0
    ? await supabase
        .from('reservations')
        .select(`
          id,
          check_in,
          status,
          property_listings!inner(
            property_id,
            properties(name)
          ),
          guests(first_name)
        `)
        .neq('status', 'cancelled')
        .gte('check_out', todayStr)
        .in('property_listings.property_id', allPropertyIds)
        .limit(200)
    : { data: null }

  const placeholderGuestAlerts = buildPlaceholderGuestAlerts(
    (placeholderGuestRows || []).map(r => {
      const listing = Array.isArray(r.property_listings) ? r.property_listings[0] : r.property_listings
      const rawProperty = (listing as { properties?: unknown } | null)?.properties
      const property = Array.isArray(rawProperty) ? rawProperty[0] : rawProperty
      const rawGuest = r.guests
      const guest = Array.isArray(rawGuest) ? rawGuest[0] : rawGuest
      return {
        reservationId: r.id,
        guestFirstName: (guest as { first_name?: string | null } | null)?.first_name,
        propertyName: (property as { name?: string } | null)?.name,
        checkIn: r.check_in,
      }
    })
  )

  // Gatilho 2: falha de sync — reaproveita a mesma leitura de `sync_logs` da Story 39.5, mas
  // org-wide: o indicador visual abaixo do botão "Sincronizar" (acima) é recortado por
  // `propertyIds` filtrado; o sino precisa da versão global (AC da Story 39.6).
  const { data: orgSyncLogRows } = allPropertyIds.length > 0
    ? await supabase
        .from('sync_logs')
        .select(`
          status,
          error_message,
          synced_at,
          property_listings!inner(property_id)
        `)
        .in('property_listings.property_id', allPropertyIds)
        .order('synced_at', { ascending: false })
        .limit(1)
    : { data: null }

  const orgLastSyncLog = orgSyncLogRows?.[0] as
    | { status: string; error_message: string | null; synced_at: string }
    | undefined

  const syncFailureAlert = buildSyncFailureAlert(
    orgLastSyncLog
      ? {
          status: orgLastSyncLog.status,
          errorMessage: orgLastSyncLog.error_message,
          syncedAtFormatted: formatSyncTimestamp(orgLastSyncLog.synced_at),
        }
      : null
  )

  // Gatilho 3: pagamento pendente (`status = 'pending_payment'`). Prazo (`PENDING_PAYMENT_ALERT_HOURS`)
  // é um placeholder documentado em `notificationAlerts.ts` — pendente de confirmação com Fabio
  // (ver Dev Notes da Story 39.6, não é um número definitivo).
  const { data: pendingPaymentRows } = allPropertyIds.length > 0
    ? await supabase
        .from('reservations')
        .select(`
          id,
          created_at,
          total_amount,
          currency,
          property_listings!inner(
            property_id,
            properties(name)
          )
        `)
        .eq('status', 'pending_payment')
        .in('property_listings.property_id', allPropertyIds)
        .limit(200)
    : { data: null }

  const pendingPaymentAlerts = buildPendingPaymentAlerts(
    (pendingPaymentRows || []).map(r => {
      const listing = Array.isArray(r.property_listings) ? r.property_listings[0] : r.property_listings
      const rawProperty = (listing as { properties?: unknown } | null)?.properties
      const property = Array.isArray(rawProperty) ? rawProperty[0] : rawProperty
      return {
        reservationId: r.id,
        propertyName: (property as { name?: string } | null)?.name,
        createdAt: r.created_at,
        totalAmount: r.total_amount != null ? Number(r.total_amount) : null,
        currency: r.currency,
      }
    }),
    now
  )

  // Gatilho 4: ocupação baixa por propriedade (<30% nos próximos 30 dias) — query prospectiva
  // nova sobre `reservations`, diferente de `monthly_property_metrics` (histórica). Ver
  // Technical Notes da Story 39.6.
  const occupancyWindowEnd = new Date(today)
  occupancyWindowEnd.setDate(occupancyWindowEnd.getDate() + LOW_OCCUPANCY_WINDOW_DAYS)

  const { data: prospectiveReservationRows } = allPropertyIds.length > 0
    ? await supabase
        .from('reservations')
        .select(`
          check_in,
          check_out,
          status,
          property_listings!inner(property_id)
        `)
        .eq('status', 'confirmed')
        .lt('check_in', occupancyWindowEnd.toISOString().split('T')[0])
        .gt('check_out', today.toISOString().split('T')[0])
        .in('property_listings.property_id', allPropertyIds)
        .limit(1000)
    : { data: null }

  const prospectiveOccupancyForecast = calculateProspectiveOccupancy(
    (prospectiveReservationRows || [])
      .map(r => {
        const listing = Array.isArray(r.property_listings) ? r.property_listings[0] : r.property_listings
        return {
          propertyId: (listing as { property_id?: string } | null)?.property_id || '',
          checkIn: r.check_in,
          checkOut: r.check_out,
        }
      })
      .filter(r => r.propertyId),
    (allProperties || []).map(p => ({ id: p.id, name: p.name })),
    today,
    LOW_OCCUPANCY_WINDOW_DAYS
  )

  const lowOccupancyAlerts = buildLowOccupancyAlerts(prospectiveOccupancyForecast)

  // Monta a lista final do sino, com hrefs já resolvidos (locale) — ordem: hóspede
  // placeholder, falha de sync, pagamento pendente, ocupação baixa.
  const bellAlerts: NotificationBellAlert[] = [
    ...placeholderGuestAlerts.map(a => ({
      ...a,
      href: a.reservationId ? `/${locale}/reservations/${a.reservationId}` : undefined,
    })),
    ...(syncFailureAlert ? [{ ...syncFailureAlert, href: `/${locale}/sync` }] : []),
    ...pendingPaymentAlerts.map(a => ({
      ...a,
      href: a.reservationId ? `/${locale}/reservations/${a.reservationId}` : undefined,
    })),
    ...lowOccupancyAlerts,
  ]

  const monthShort = now.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase()
  const monthLong = now.toLocaleDateString('pt-BR', { month: 'long' })
  const monthLabel = monthLong.charAt(0).toUpperCase() + monthLong.slice(1)
  const revenueEntries = Object.entries(monthRevenueByCurrency).sort(([a], [b]) => a.localeCompare(b))
  const forecastEntries = Object.entries(forecastByCurrency).sort(([a], [b]) => a.localeCompare(b))

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
          {/* Story 39.6: sino funcional (era decorativo) — pendências globais da organização */}
          <NotificationBell alerts={bellAlerts} />
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
              variance: { mom: propertiesVarianceMoM, yoy: propertiesVarianceYoY },
              infoDescription: 'Total de imóveis ativos na sua conta. A variação compara com o número de imóveis que você tinha no fim do mês anterior/mesmo mês do ano passado.',
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
              variance: { mom: reservationsVarianceMoM, yoy: reservationsVarianceYoY },
              infoDescription: 'Total de reservas no período. A variação compara com o número de reservas do mês anterior/mesmo mês do ano passado.',
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
              variance: {
                mom: calculateVariationPercent(currentMonthOccupancy, currentFilteredRows.length > 0, occupancyPreviousView, previousFilteredRows.length > 0),
                yoy: calculateVariationPercent(currentMonthOccupancy, currentFilteredRows.length > 0, occupancyYoyView, yoyFilteredRows.length > 0),
              },
              infoDescription: 'Percentual de noites reservadas em relação às noites disponíveis no mês, somando todas as propriedades.',
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
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold tracking-wider text-brand-text-medium transition-colors group-hover:text-brand-gold">
                      {card.type}
                    </span>
                    <InfoTooltip description={card.infoDescription} label={`O que é ${card.label}`} />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="dashboard-metric-value text-3xl font-bold leading-none tracking-tight text-brand-text-dark transition-colors group-hover:text-brand-gold">
                    {card.value}
                  </h3>
                  <p className="mt-2 text-xs font-semibold text-brand-text-medium">
                    {card.label}
                  </p>
                  <div className="mt-2 flex items-center gap-1.5">
                    <MetricVarianceBadge value={card.variance.mom} label="MoM" />
                    <MetricVarianceBadge value={card.variance.yoy} label="YoY" />
                  </div>
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

        {/* Story 39.2: card ADR/RevPAR combinado — posicionado logo abaixo da Taxa de
            Ocupação (linha própria, para não alterar o grid de 3 colunas acima). */}
        <div className="grid grid-cols-1 gap-6">
          <div className="group rounded-2xl border border-neutral-200/60 bg-brand-white p-6 shadow-2xs transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-gold/45 hover:shadow-[0_18px_42px_rgba(201,162,39,0.14)]">
            <div className="mb-5 flex items-center gap-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200/60 bg-brand-bg text-brand-text-dark transition-all group-hover:border-brand-gold/40 group-hover:bg-brand-gold/10 group-hover:text-brand-gold">
                <Gauge className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-brand-text-dark transition-colors group-hover:text-brand-gold">ADR / RevPAR</h3>
                  <InfoTooltip
                    label="O que é ADR/RevPAR"
                    description="ADR (Average Daily Rate): receita média por noite vendida. RevPAR (Revenue per Available Room): receita média por noite disponível — já considera a ocupação. RevPAR = ADR × Ocupação."
                  />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-brand-text-medium transition-colors group-hover:text-brand-gold">{monthLabel}</p>
              </div>
            </div>

            {adrRevParEntries.length === 0 ? (
              <p className="text-3xl font-bold text-brand-text-medium">-</p>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {adrRevParEntries.map((entry) => (
                  <div key={entry.currency} className="rounded-xl bg-brand-bg p-4">
                    <span className={`rounded-md border px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-wide ${currencyBadgeClass(entry.currency)}`}>
                      {entry.currency}
                    </span>
                    <div className="mt-3 flex items-end justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-brand-text-medium">ADR</p>
                        <p className="text-2xl font-bold leading-none tracking-tight text-brand-text-dark">
                          {formatCurrency(entry.adrCurrent, entry.currency as CurrencyCode)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MetricVarianceBadge value={entry.adrVarianceMoM} label="MoM" />
                        <MetricVarianceBadge value={entry.adrVarianceYoY} label="YoY" />
                      </div>
                    </div>
                    <div className="mt-3 flex items-end justify-between gap-2 border-t border-dashed border-neutral-200/60 pt-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-brand-text-medium">RevPAR</p>
                        <p className="text-base font-bold leading-none tracking-tight text-brand-text-medium">
                          {formatCurrency(entry.revparCurrent, entry.currency as CurrencyCode)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MetricVarianceBadge value={entry.revparVarianceMoM} label="MoM" />
                        <MetricVarianceBadge value={entry.revparVarianceYoY} label="YoY" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 flex w-full items-center justify-between border-t border-brand-bg pt-3.5 text-[10px] font-semibold text-brand-text-medium">
              <span>ADR = Receita Bruta / Noites Vendidas · RevPAR = ADR × Ocupação</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
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
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-brand-text-dark transition-colors group-hover:text-brand-gold">Receita do Mês</h3>
                    <InfoTooltip
                      label="O que é Receita do Mês"
                      description="Receita bruta de todas as reservas do mês corrente, sem descontar comissão, taxas ou despesas."
                    />
                  </div>
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
                      <div className="flex items-center gap-2">
                        <span className={`rounded-md border px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-wide ${currencyBadgeClass(cur)}`}>
                          {cur}
                        </span>
                        <MetricVarianceBadge value={revenueVarianceForCurrency(cur, previousByCurrency)} label="MoM" />
                        <MetricVarianceBadge value={revenueVarianceForCurrency(cur, yoyByCurrency)} label="YoY" />
                      </div>
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
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-brand-text-dark transition-colors group-hover:text-brand-gold">Lucro Real</h3>
                    <InfoTooltip
                      label="O que é Lucro Real"
                      description="Comissão de gestão (calculada sobre a receita bruta de cada propriedade) menos as despesas operacionais da Algarve Home Stay no mês. A margem é sobre a comissão, não sobre a receita bruta das reservas — a maior parte dela pertence aos proprietários dos imóveis."
                    />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-brand-text-medium transition-colors group-hover:text-brand-gold">{monthLabel}</p>
                </div>
              </div>

              {profitEntries.length === 0 ? (
                <p className="text-3xl font-bold text-brand-text-medium">-</p>
              ) : (
                <div className="space-y-4">
                  {profitEntries.map((entry, idx) => (
                    <div
                      key={entry.currency}
                      className={idx < profitEntries.length - 1 ? 'flex items-center justify-between border-b border-dashed border-neutral-200/50 pb-3.5' : 'flex items-center justify-between'}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-md border px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-wide ${currencyBadgeClass(entry.currency)}`}>
                          {entry.currency}
                        </span>
                        {/* Story 39.2: nunca comunicar 100% de margem como resultado positivo
                            quando o dado real é ausência de despesa lançada no mês. */}
                        {entry.hasCompanyExpensesThisMonth ? (
                          <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                            entry.margin >= 50 ? 'bg-emerald-500/10 text-emerald-600'
                            : entry.margin >= 20 ? 'bg-brand-gold/15 text-brand-gold'
                            : 'bg-red-500/10 text-red-600'
                          }`}>
                            {entry.margin}%
                          </span>
                        ) : (
                          <span
                            className="rounded px-1.5 py-0.5 text-[9px] font-bold bg-neutral-200/50 text-brand-text-medium"
                            title="Nenhuma despesa da empresa lançada para este mês ainda"
                          >
                            sem despesas lançadas
                          </span>
                        )}
                        <MetricVarianceBadge value={entry.varianceMoM} label="MoM" />
                        <MetricVarianceBadge value={entry.varianceYoY} label="YoY" />
                      </div>
                      <span className={`text-right text-2xl font-bold tracking-tight ${entry.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {formatCurrency(entry.profit, entry.currency as CurrencyCode)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-5 flex w-full items-center justify-between border-t border-brand-bg pt-3.5 text-[10px] font-semibold text-brand-text-medium">
              <span>Comissão de gestão menos despesas da empresa</span>
              <span className="font-bold text-brand-blue transition-colors group-hover:text-brand-gold group-hover:underline">Ver fluxo de caixa &rarr;</span>
            </div>
          </Link>

          {/* Story 39.7 — Card "Despesas do Mês": despesas por propriedade (tabela `expenses`),
              distinto de `company_expenses` (despesas da empresa, usadas acima em "Lucro Real").
              Espelha visualmente o card "Receita do Mês". */}
          <Link
            href={`/${locale}/expenses`}
            className="group flex flex-col justify-between rounded-2xl border border-neutral-200/60 bg-brand-white p-6 text-left shadow-2xs transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-gold/45 hover:shadow-[0_18px_42px_rgba(201,162,39,0.14)]"
          >
            <div>
              <div className="mb-5 flex items-center gap-3.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200/60 bg-brand-bg text-brand-text-dark transition-all group-hover:border-brand-gold/40 group-hover:bg-brand-gold/10 group-hover:text-brand-gold">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-brand-text-dark transition-colors group-hover:text-brand-gold">Despesas do Mês</h3>
                    <InfoTooltip
                      label="O que é Despesas do Mês"
                      description="Despesas lançadas por propriedade (limpeza, manutenção, etc.) no mês corrente. Diferente das despesas da empresa usadas no cálculo do Lucro Real."
                    />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-brand-text-medium transition-colors group-hover:text-brand-gold">{monthLabel}</p>
                </div>
              </div>

              {propertyExpensesEntries.length === 0 ? (
                <p className="text-3xl font-bold text-brand-text-medium">-</p>
              ) : (
                <div className="space-y-4">
                  {propertyExpensesEntries.map(([cur, amount], idx) => (
                    <div
                      key={cur}
                      className={idx < propertyExpensesEntries.length - 1 ? 'flex items-center justify-between border-b border-dashed border-neutral-200/50 pb-3.5' : 'flex items-center justify-between'}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`rounded-md border px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-wide ${currencyBadgeClass(cur)}`}>
                          {cur}
                        </span>
                      </div>
                      <span className="text-right text-2xl font-bold tracking-tight text-brand-text-dark">
                        {formatCurrency(amount, cur as CurrencyCode)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-5 flex w-full items-center justify-between border-t border-brand-bg pt-3.5 text-[10px] font-semibold text-brand-text-medium">
              <span>Despesas por propriedade lançadas este mês</span>
              <span className="font-bold text-brand-blue transition-colors group-hover:text-brand-gold group-hover:underline">Ver despesas &rarr;</span>
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
                <InfoTooltip
                  label="O que é Previsão de Faturamento"
                  description="Soma da receita de reservas já confirmadas com check-in a partir de hoje — o que já está garantido de entrar."
                />
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
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text-dark transition-colors group-hover:text-brand-gold">Taxa de Ocupação</h3>
                <InfoTooltip
                  label="O que é Taxa de Ocupação"
                  description="Evolução da taxa de ocupação nos últimos 6 meses."
                />
              </div>
              <p className="mt-1 text-[11px] font-semibold text-brand-text-medium">
                Últimos 6 meses - {monthLabel}: {currentMonthOccupancy}%
              </p>
            </div>
            <OccupancyChart data={occupancyData} />
          </div>

          <div className="group flex flex-col rounded-2xl border border-neutral-200/60 bg-brand-white p-6 shadow-2xs transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-gold/45 hover:shadow-[0_18px_42px_rgba(201,162,39,0.14)]">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text-dark transition-colors group-hover:text-brand-gold">Receita Mensal</h3>
                  <InfoTooltip
                    label="O que é Receita Mensal"
                    description="Evolução da receita bruta mês a mês, por moeda."
                  />
                </div>
                <p className="mt-1 text-[11px] font-semibold text-brand-text-medium">Faturamento consolidado por moeda</p>
              </div>
            </div>
            <RevenueChartWrapper revenueDataByCurrency={revenueDataByCurrency} />
          </div>
        </div>

        {/* Story 39.3 — Card Receita por Canal (% de receita/reservas e comissão real por booking_source, abaixo de Receita Mensal) */}
        {channelRevenueEntries.length > 0 && (
          <div className="group rounded-2xl border border-neutral-200/60 bg-brand-white p-6 shadow-2xs transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-gold/45 hover:shadow-[0_18px_42px_rgba(201,162,39,0.14)]">
            <div className="mb-6">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-text-dark transition-colors group-hover:text-brand-gold">
                <PieChart className="h-4 w-4 text-brand-blue transition-colors group-hover:text-brand-gold" />
                Receita por Canal
                <InfoTooltip
                  label="O que é Receita por Canal"
                  description="Receita, número de reservas e comissão por canal de venda (Airbnb, Booking.com, direto, etc.). Alerta quando um único canal passa de 60% da receita do mês — sinal de dependência excessiva de uma plataforma."
                />
              </h3>
              <p className="mt-1 text-[11px] font-semibold text-brand-text-medium">
                % de receita e reservas por canal de distribuição — {monthLabel}
              </p>
            </div>

            <div className="space-y-6">
              {channelRevenueEntries.map(([cur, result]) => (
                <div key={cur} className="border-t border-brand-bg pt-5 first:border-t-0 first:pt-0">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <span className={`rounded-md border px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-wide ${currencyBadgeClass(cur)}`}>
                      {cur}
                    </span>
                    {result.concentrationAlert && (
                      <span className="flex items-center gap-1.5 rounded-full bg-brand-gold/15 px-2.5 py-1 text-[10px] font-bold text-brand-gold">
                        <AlertTriangle className="h-3 w-3" />
                        Concentração por Canal: {result.concentrationAlert.label} representa {Math.round(result.concentrationAlert.revenuePercent)}% da receita
                      </span>
                    )}
                  </div>

                  {result.channels.length === 0 ? (
                    <p className="text-xs font-medium text-brand-text-medium">Nenhuma reserva com canal identificado neste mês.</p>
                  ) : (
                    <ul className="space-y-2.5">
                      {result.channels.map((channel) => (
                        <li key={channel.channel} className="rounded-xl bg-brand-bg px-3.5 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <span className="truncate text-sm font-semibold text-brand-text-dark">{channel.label}</span>
                            <span className="shrink-0 text-sm font-bold text-brand-text-dark">
                              {formatCurrency(channel.revenueAmount, cur as CurrencyCode)}
                            </span>
                          </div>
                          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200/50">
                            <div
                              className={`h-full rounded-full ${
                                channel.revenuePercent > CHANNEL_CONCENTRATION_THRESHOLD ? 'bg-brand-gold' : 'bg-brand-blue'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(0, Math.round(channel.revenuePercent)))}%` }}
                            />
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-[10px] font-semibold text-brand-text-medium">
                            <span>
                              {Math.round(channel.revenuePercent)}% da receita &middot; {channel.reservationCount} reserva{channel.reservationCount !== 1 ? 's' : ''} ({Math.round(channel.reservationPercent)}%)
                            </span>
                            <span>Comissão: {formatCurrency(channel.commissionAmount, cur as CurrencyCode)}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  {result.excludedCount > 0 && (
                    <p className="mt-3 text-[10px] font-semibold text-brand-text-medium">
                      {result.excludedCount} reserva{result.excludedCount !== 1 ? 's' : ''} sem canal identificado ou valor registado (excluída{result.excludedCount !== 1 ? 's' : ''} deste cálculo)
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Story 39.4 — Card Ranking de Propriedades (top 3 / bottom 3 por RevPAR do mês corrente) */}
        {selectedPropertyId ? (
          <div className="rounded-2xl border border-neutral-200/60 bg-brand-white p-6 shadow-2xs">
            <div className="mb-2 flex items-center gap-2">
              <Award className="h-4 w-4 text-brand-blue" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text-dark">Ranking de Propriedades</h3>
            </div>
            <p className="text-xs font-medium text-brand-text-medium">
              O ranking compara várias propriedades por RevPAR — selecione &ldquo;Todas as propriedades&rdquo; no filtro do topo para visualizá-lo.
            </p>
          </div>
        ) : propertyRanking && (propertyRanking.top.length > 0 || propertyRanking.bottom.length > 0 || propertyRanking.withoutBookings.length > 0) ? (
          <div className="group rounded-2xl border border-neutral-200/60 bg-brand-white p-6 shadow-2xs transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-gold/45 hover:shadow-[0_18px_42px_rgba(201,162,39,0.14)]">
            <div className="mb-6">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-text-dark transition-colors group-hover:text-brand-gold">
                <Award className="h-4 w-4 text-brand-blue transition-colors group-hover:text-brand-gold" />
                Ranking de Propriedades
                <InfoTooltip
                  label="O que é Ranking de Propriedades"
                  description="As 3 propriedades com melhor e as 3 com pior RevPAR no mês corrente, para identificar onde vale revisar preço ou ocupação."
                />
              </h3>
              <p className="mt-1 text-[11px] font-semibold text-brand-text-medium">
                Melhor e pior RevPAR — {monthLabel}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <div className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Melhor desempenho
                </div>
                {propertyRanking.top.length === 0 ? (
                  <p className="text-xs font-medium text-brand-text-medium">Sem dados suficientes.</p>
                ) : (
                  <ul className="space-y-2.5">
                    {propertyRanking.top.map((property, idx) => (
                      <li
                        key={property.propertyId}
                        className="flex items-center justify-between gap-3 rounded-xl bg-brand-bg px-3 py-2.5"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-[10px] font-bold text-emerald-600">
                            {idx + 1}
                          </span>
                          <span className="truncate text-sm font-semibold text-brand-text-dark">
                            {property.propertyName}
                          </span>
                        </div>
                        <span className="shrink-0 text-sm font-bold text-emerald-600">
                          {formatCurrency(
                            property.revpar,
                            (propertyCurrencyMap[property.propertyId] || org?.currency || 'EUR') as CurrencyCode
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <div className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-red-600">
                  <TrendingDown className="h-3.5 w-3.5" />
                  Pior desempenho
                </div>
                {propertyRanking.bottom.length === 0 ? (
                  <p className="text-xs font-medium text-brand-text-medium">Sem dados suficientes.</p>
                ) : (
                  <ul className="space-y-2.5">
                    {propertyRanking.bottom.map((property, idx) => (
                      <li
                        key={property.propertyId}
                        className="flex items-center justify-between gap-3 rounded-xl bg-brand-bg px-3 py-2.5"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-[10px] font-bold text-red-600">
                            {idx + 1}
                          </span>
                          <span className="truncate text-sm font-semibold text-brand-text-dark">
                            {property.propertyName}
                          </span>
                        </div>
                        <span className="shrink-0 text-sm font-bold text-red-600">
                          {formatCurrency(
                            property.revpar,
                            (propertyCurrencyMap[property.propertyId] || org?.currency || 'EUR') as CurrencyCode
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {propertyRanking.withoutBookings.length > 0 && (
              <p className="mt-5 border-t border-brand-bg pt-3.5 text-[10px] font-semibold text-brand-text-medium">
                {propertyRanking.withoutBookings.length} propriedade{propertyRanking.withoutBookings.length !== 1 ? 's' : ''} sem reservas este mês
                {': '}
                {propertyRanking.withoutBookings.map(p => p.propertyName).join(', ')}
              </p>
            )}
          </div>
        ) : null}

        {/* Story 39.6 — Card "Hoje": check-ins, check-outs e limpezas do dia corrente. Posicionado
            antes de "Próximas Chegadas" (AC da Story 39.6). Sem item de "mensagens" — sem fonte de
            dado real no schema atual (ver Description da story, não inventado). */}
        <div className="group rounded-2xl border border-neutral-200/60 bg-brand-white p-6 shadow-2xs transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-gold/45 hover:shadow-[0_18px_42px_rgba(201,162,39,0.14)]">
          <div className="mb-6">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-text-dark transition-colors group-hover:text-brand-gold">
              <CalendarDays className="h-4 w-4 text-brand-blue transition-colors group-hover:text-brand-gold" />
              Hoje
              <InfoTooltip
                label="O que é o card Hoje"
                description="Check-ins, check-outs e limpezas agendadas para hoje."
              />
            </h3>
            <p className="mt-1 text-[11px] font-semibold text-brand-text-medium">
              {now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div>
              <div className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                <LogIn className="h-3.5 w-3.5" />
                Check-ins ({todayCheckIns.length})
              </div>
              {todayCheckIns.length === 0 ? (
                <p className="text-xs font-medium text-brand-text-medium">Nenhum check-in hoje.</p>
              ) : (
                <ul className="space-y-2">
                  {todayCheckIns.map(r => (
                    <li key={r.id}>
                      <Link
                        href={`/${locale}/reservations/${r.id}`}
                        className="block truncate rounded-xl bg-brand-bg px-3 py-2 text-xs font-semibold text-brand-text-dark transition-colors hover:bg-emerald-500/10 hover:text-emerald-700"
                      >
                        {r.guest_name || 'Hóspede'} &middot; {getReservationPropertyName(r)}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <div className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-brand-blue">
                <LogOut className="h-3.5 w-3.5" />
                Check-outs ({todayCheckOuts.length})
              </div>
              {todayCheckOuts.length === 0 ? (
                <p className="text-xs font-medium text-brand-text-medium">Nenhum check-out hoje.</p>
              ) : (
                <ul className="space-y-2">
                  {todayCheckOuts.map(r => (
                    <li key={r.id}>
                      <Link
                        href={`/${locale}/reservations/${r.id}`}
                        className="block truncate rounded-xl bg-brand-bg px-3 py-2 text-xs font-semibold text-brand-text-dark transition-colors hover:bg-brand-blue/10 hover:text-brand-blue"
                      >
                        {r.guest_name || 'Hóspede'} &middot; {getReservationPropertyName(r)}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <div className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-brand-gold">
                <Sparkles className="h-3.5 w-3.5" />
                Limpezas ({todayCleanings.length})
              </div>
              {todayCleanings.length === 0 ? (
                <p className="text-xs font-medium text-brand-text-medium">Nenhuma limpeza agendada hoje.</p>
              ) : (
                <ul className="space-y-2">
                  {todayCleanings.map(c => {
                    const content = (
                      <div className="flex items-center justify-between gap-2 rounded-xl bg-brand-bg px-3 py-2 text-xs font-semibold text-brand-text-dark transition-colors hover:bg-brand-gold/10 hover:text-brand-gold">
                        <span className="truncate">
                          {c.propertyName}
                          {c.scheduledTime ? ` · ${c.scheduledTime.slice(0, 5)}` : ''}
                        </span>
                        <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase text-brand-text-medium">
                          {c.status}
                        </span>
                      </div>
                    )
                    return (
                      <li key={c.id}>
                        {c.reservationId ? (
                          <Link href={`/${locale}/reservations/${c.reservationId}`}>{content}</Link>
                        ) : (
                          content
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="group rounded-2xl border border-neutral-200/60 bg-brand-white p-6 shadow-2xs transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-gold/45 hover:shadow-[0_18px_42px_rgba(201,162,39,0.14)]">
            <div className="mb-6">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-text-dark transition-colors group-hover:text-brand-gold">
                <Clock className="h-4 w-4 text-brand-blue transition-colors group-hover:text-brand-gold" />
                Próximas Chegadas
                <InfoTooltip
                  label="O que é Próximas Chegadas"
                  description="Reservas com check-in nos próximos 7 dias."
                />
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

          <div className="group rounded-2xl border border-neutral-200/60 bg-brand-white p-6 shadow-2xs transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-gold/45 hover:shadow-[0_18px_42px_rgba(201,162,39,0.14)]">
            <div className="mb-6">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-text-dark transition-colors group-hover:text-brand-gold">
                <LogOut className="h-4 w-4 text-brand-blue transition-colors group-hover:text-brand-gold" />
                Próximas Saídas
                <InfoTooltip
                  label="O que é Próximas Saídas"
                  description="Reservas com check-out nos próximos 7 dias e o status da limpeza correspondente — para saber quais propriedades já estão prontas para o próximo hóspede."
                />
              </h3>
              <p className="mt-1 text-[11px] font-semibold text-brand-text-medium">Próximos 7 dias</p>
            </div>

            {upcomingCheckOuts && upcomingCheckOuts.length > 0 ? (
              <div className="space-y-3">
                {upcomingCheckOuts.map((reservation) => {
                  const checkOutDate = new Date(reservation.check_out)

                  const rawListing = reservation.property_listings
                  const listing = Array.isArray(rawListing) ? rawListing[0] : rawListing
                  const rawProperty = listing?.properties
                  const property = Array.isArray(rawProperty) ? rawProperty[0] : rawProperty
                  const propertyName = property?.name || 'Propriedade'

                  const rawGuest = reservation.guests
                  const guest = Array.isArray(rawGuest) ? rawGuest[0] : rawGuest
                  const guestName = guest
                    ? `${guest.first_name || ''} ${guest.last_name || ''}`.trim()
                    : reservation.guest_name || 'Hóspede Importado'

                  const cleaningStatus = cleaningStatusByReservationId.get(reservation.id)
                  const cleaningBadge = cleaningStatus
                    ? CLEANING_STATUS_LABEL[cleaningStatus]
                    : { label: 'Sem limpeza agendada', className: 'bg-brand-text-medium/10 text-brand-text-medium' }

                  return (
                    <Link
                      key={reservation.id}
                      href={`/${locale}/reservations/${reservation.id}`}
                      className="flex items-center justify-between rounded-xl bg-brand-bg p-3 transition-all duration-150 hover:-translate-y-0.5 hover:bg-brand-blue/5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-brand-text-dark">{guestName}</p>
                        <p className="truncate text-sm text-brand-text-medium">{propertyName}</p>
                        <span className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${cleaningBadge.className}`}>
                          {cleaningBadge.label}
                        </span>
                      </div>
                      <div className="text-right ml-3 shrink-0">
                        <p className="text-sm font-semibold text-brand-blue">
                          {checkOutDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="rounded-xl bg-brand-bg py-8 text-center text-brand-text-medium">
                <LogOut className="mx-auto mb-2 h-12 w-12 text-brand-text-medium" />
                <p className="text-sm font-semibold">Nenhuma saída prevista</p>
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

        {/* Story 39.6 — Painel de Alertas: concentração por propriedade (>40%, nova) e por canal
            (reaproveitada da Story 39.3, `channelRevenue.ts`). Os 4 gatilhos do sino (hóspede
            placeholder, falha de sync, pagamento pendente, ocupação baixa) NÃO aparecem aqui —
            regra explícita da spec-fonte, ficam exclusivos do sino (AC da Story 39.6). */}
        <div className="group rounded-2xl border border-neutral-200/60 bg-brand-white p-6 shadow-2xs transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-gold/45 hover:shadow-[0_18px_42px_rgba(201,162,39,0.14)]">
            <div className="mb-6">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-text-dark transition-colors group-hover:text-brand-gold">
                <ShieldAlert className="h-4 w-4 text-brand-blue transition-colors group-hover:text-brand-gold" />
                Painel de Alertas
                <InfoTooltip
                  label="O que é o Painel de Alertas"
                  description="Avisa quando a receita do mês está concentrada demais numa única propriedade (mais de 40%) — sinal de risco caso essa propriedade tenha algum problema."
                />
              </h3>
              <p className="mt-1 text-[11px] font-semibold text-brand-text-medium">
                Riscos de concentração de receita — {monthLabel}
              </p>
            </div>

            <div className="space-y-3">
              {selectedPropertyId ? (
                <p className="text-xs font-medium text-brand-text-medium">
                  Concentração por propriedade compara várias propriedades — selecione &ldquo;Todas as propriedades&rdquo; no filtro do topo para visualizá-la.
                </p>
              ) : propertyConcentrationAlert ? (
                <div className="flex items-start gap-3 rounded-xl bg-red-500/5 px-4 py-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  <p className="text-xs font-semibold text-brand-text-dark">
                    Concentração por Propriedade: <span className="text-red-600">{propertyConcentrationAlert.propertyName}</span> representa{' '}
                    {Math.round(propertyConcentrationAlert.revenuePercent)}% da receita bruta do mês (limiar: {PROPERTY_CONCENTRATION_THRESHOLD}%).
                  </p>
                </div>
              ) : (
                <p className="text-xs font-medium text-brand-text-medium">
                  Nenhuma propriedade concentra mais de {PROPERTY_CONCENTRATION_THRESHOLD}% da receita bruta do mês.
                </p>
              )}

              {channelRevenueEntries
                .filter(([, result]) => result.concentrationAlert)
                .map(([cur, result]) => (
                  <div key={cur} className="flex items-start gap-3 rounded-xl bg-brand-gold/10 px-4 py-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold" />
                    <p className="text-xs font-semibold text-brand-text-dark">
                      Concentração por Canal ({cur}): <span className="text-brand-gold">{result.concentrationAlert!.label}</span> representa{' '}
                      {Math.round(result.concentrationAlert!.revenuePercent)}% da receita (limiar: {CHANNEL_CONCENTRATION_THRESHOLD}%).
                    </p>
                  </div>
                ))}

              {!propertyConcentrationAlert &&
                !selectedPropertyId &&
                channelRevenueEntries.every(([, result]) => !result.concentrationAlert) && (
                  <p className="text-xs font-medium text-brand-text-medium">
                    Nenhum canal concentra mais de {CHANNEL_CONCENTRATION_THRESHOLD}% da receita do mês.
                  </p>
                )}
            </div>
        </div>
      </main>
      </div>
    </AuthLayout>
  )
}
