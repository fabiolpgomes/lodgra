import Link from 'next/link'
import {
  ArrowUpRight,
  BarChart3,
  Building2,
  CalendarDays,
  DollarSign,
  Download,
  Percent,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react'
import { redirect } from 'next/navigation'
import { AuthLayout } from '@/components/common/layout/AuthLayout'
import { PremiumCard, PremiumMetricCard, PremiumPageHeader, PremiumPageShell } from '@/components/common/layout/PremiumPage'
import { requireRole } from '@/lib/auth/requireRole'
import { createClient } from '@/lib/supabase/server'
import { calcManagementFee } from '@/lib/financial/calculations'
import { calculateRevenueForReservation } from '@/lib/financial/revenue-calculator'
import { formatCurrency, type CurrencyCode } from '@/lib/utils/currency'
import { normalizeChannelName } from '@/lib/utils/channels'

type MoneyMap = Record<string, number>

type PropertyRow = {
  id: string
  name: string
  currency?: string | null
  management_percentage?: number | null
  owners?: { full_name?: string | null } | { full_name?: string | null }[] | null
}

type ReservationRow = {
  id: string
  check_in: string
  check_out: string
  total_amount?: number | string | null
  currency?: string | null
  source?: string | null
  property_listings?: {
    property_id?: string | null
    properties?: { id?: string; name?: string; currency?: string | null } | { id?: string; name?: string; currency?: string | null }[] | null
  } | Array<{
    property_id?: string | null
    properties?: { id?: string; name?: string; currency?: string | null } | { id?: string; name?: string; currency?: string | null }[] | null
  }> | null
}

type ExpenseRow = {
  amount?: number | string | null
  currency?: string | null
  property_id?: string | null
  category?: string | null
  description?: string | null
  expense_date?: string | null
  properties?: { currency?: string | null } | { currency?: string | null }[] | null
}

type PropertyStats = {
  id: string
  name: string
  ownerName: string
  currency: string
  managementPercentage: number
  revenue: number
  commission: number
  expenses: number
  ownerNet: number
  reservations: number
  nights: number
  availableNights: number
}

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function addMoney(target: MoneyMap, currency: string, amount: number) {
  target[currency] = (target[currency] || 0) + amount
}

function sumMoney(values: MoneyMap[]) {
  return values.reduce((acc, item) => {
    Object.entries(item).forEach(([currency, amount]) => addMoney(acc, currency, amount))
    return acc
  }, {} as MoneyMap)
}

function formatMoneyMap(values: MoneyMap) {
  const entries = Object.entries(values)
    .filter(([, amount]) => Math.abs(amount) > 0.005)
    .sort(([a], [b]) => a.localeCompare(b))

  if (entries.length === 0) return '-'

  return (
    <div className="space-y-1">
      {entries.map(([currency, amount]) => (
        <div key={currency} className="whitespace-nowrap tabular-nums">
          {formatCurrency(amount, currency as CurrencyCode)}
        </div>
      ))}
    </div>
  )
}

function getListing(reservation: ReservationRow) {
  const listing = reservation.property_listings
  return Array.isArray(listing) ? listing[0] : listing
}

function getPropertyFromListing(reservation: ReservationRow) {
  const property = getListing(reservation)?.properties
  return Array.isArray(property) ? property[0] : property
}

function getOwnerName(property: PropertyRow) {
  const owner = Array.isArray(property.owners) ? property.owners[0] : property.owners
  return owner?.full_name || 'Sem proprietário'
}

function getExpenseCurrency(expense: ExpenseRow, propertyById: Map<string, PropertyRow>) {
  const property = Array.isArray(expense.properties) ? expense.properties[0] : expense.properties
  const fallback = expense.property_id ? propertyById.get(expense.property_id)?.currency : null
  return expense.currency || property?.currency || fallback || 'EUR'
}

function monthKey(year: number, monthIndex: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`
}

function getNights(checkIn: string, checkOut: string) {
  const start = new Date(checkIn)
  const end = new Date(checkOut)
  return Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
}

function moneyValue(values: MoneyMap) {
  return Object.values(values).reduce((sum, value) => sum + value, 0)
}

function BarRow({ label, value, max, meta }: { label: string; value: number; max: number; meta?: string }) {
  const width = max > 0 ? Math.max(3, Math.round((value / max) * 100)) : 0

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-wide text-brand-text-dark">{label}</span>
        <span className="text-xs font-semibold tabular-nums text-brand-text-medium">{meta}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-brand-bg">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-blue to-brand-gold transition-all"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  )
}

function getYearRange(year: number) {
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`,
  }
}

export default async function CompanyDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ year?: string }>
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams])
  const auth = await requireRole(['admin', 'gestor'])

  if (!auth.authorized) {
    redirect(`/${locale}/onboarding/pendente`)
  }

  if (!auth.organizationId) {
    redirect(`/${locale}/onboarding`)
  }

  const selectedYear = Number(query.year || new Date().getFullYear())
  const safeYear = Number.isFinite(selectedYear) ? selectedYear : new Date().getFullYear()
  const { start, end } = getYearRange(safeYear)
  const supabase = await createClient()

  const { data: propertiesData } = await supabase
    .from('properties')
    .select('id, name, currency, management_percentage, owners(full_name)')
    .eq('organization_id', auth.organizationId)
    .eq('is_active', true)
    .order('name')

  const properties = (propertiesData || []) as PropertyRow[]
  const propertyIds = properties.map((property) => property.id)
  const propertyById = new Map(properties.map((property) => [property.id, property]))

  const [reservationsResult, expensesResult, futureReservationsResult] = propertyIds.length > 0
    ? await Promise.all([
      supabase
        .from('reservations')
        .select(`
          id,
          check_in,
          check_out,
          total_amount,
          currency,
          source,
          property_listings!inner(
            property_id,
            properties!inner(id, name, currency)
          )
        `)
        .eq('status', 'confirmed')
        .lte('check_in', end)
        .gte('check_out', start)
        .in('property_listings.property_id', propertyIds),
      supabase
        .from('expenses')
        .select('amount, currency, property_id, category, description, expense_date, properties(currency)')
        .gte('expense_date', start)
        .lte('expense_date', end)
        .in('property_id', propertyIds)
        .order('expense_date', { ascending: false }),
      supabase
        .from('reservations')
        .select(`
          id,
          check_in,
          check_out,
          total_amount,
          currency,
          source,
          property_listings!inner(
            property_id,
            properties!inner(id, name, currency)
          )
        `)
        .eq('status', 'confirmed')
        .gte('check_out', new Date().toISOString().split('T')[0])
        .in('property_listings.property_id', propertyIds)
        .order('check_in', { ascending: true }),
    ])
    : [{ data: [] }, { data: [] }, { data: [] }]

  const reservations = (reservationsResult.data || []) as ReservationRow[]
  const expenses = (expensesResult.data || []) as ExpenseRow[]
  const futureReservations = (futureReservationsResult.data || []) as ReservationRow[]

  const monthly = MONTHS.map((label, index) => ({
    label,
    key: monthKey(safeYear, index),
    revenue: {} as MoneyMap,
    commission: {} as MoneyMap,
    expenses: {} as MoneyMap,
    ownerNet: {} as MoneyMap,
    reservations: 0,
    nights: 0,
  }))

  const statsByProperty = new Map<string, PropertyStats>()
  properties.forEach((property) => {
    const daysInYear = safeYear % 4 === 0 ? 366 : 365
    statsByProperty.set(property.id, {
      id: property.id,
      name: property.name,
      ownerName: getOwnerName(property),
      currency: property.currency || 'EUR',
      managementPercentage: Number(property.management_percentage || 0),
      revenue: 0,
      commission: 0,
      expenses: 0,
      ownerNet: 0,
      reservations: 0,
      nights: 0,
      availableNights: daysInYear,
    })
  })

  const platformRevenue = new Map<string, { revenue: MoneyMap; reservations: number }>()
  const ownerStats = new Map<string, { ownerName: string; revenue: MoneyMap; commission: MoneyMap; expenses: MoneyMap; ownerNet: MoneyMap; properties: Set<string> }>()

  reservations.forEach((reservation) => {
    const listing = getListing(reservation)
    const propertyId = listing?.property_id
    if (!propertyId) return

    const stat = statsByProperty.get(propertyId)
    const property = propertyById.get(propertyId)
    if (!stat || !property) return

    const propertyCurrency = getPropertyFromListing(reservation)?.currency || property.currency || reservation.currency || 'EUR'
    const totalAmount = Number(reservation.total_amount || 0)
    const nights = getNights(reservation.check_in, reservation.check_out)
    const source = normalizeChannelName(reservation.source || 'manual')

    stat.reservations += 1
    stat.nights += nights

    if (!platformRevenue.has(source)) {
      platformRevenue.set(source, { revenue: {}, reservations: 0 })
    }
    const platform = platformRevenue.get(source)
    if (platform) {
      platform.reservations += 1
    }

    const breakdown = calculateRevenueForReservation({
      id: reservation.id,
      totalAmount,
      checkIn: reservation.check_in,
      checkOut: reservation.check_out,
      currency: propertyCurrency as CurrencyCode,
      status: 'confirmed',
    })

    breakdown.monthlyBreakdown
      .filter((item) => item.month.startsWith(`${safeYear}-`))
      .forEach((item) => {
        const index = Number(item.month.slice(5, 7)) - 1
        if (index < 0 || index > 11) return

        const revenue = Number(item.value || 0)
        const commission = calcManagementFee(revenue, stat.managementPercentage)
        const ownerNet = revenue - commission

        stat.revenue += revenue
        stat.commission += commission
        stat.ownerNet += ownerNet
        if (platform) addMoney(platform.revenue, propertyCurrency, revenue)

        addMoney(monthly[index].revenue, propertyCurrency, revenue)
        addMoney(monthly[index].commission, propertyCurrency, commission)
        addMoney(monthly[index].ownerNet, propertyCurrency, ownerNet)
      })
  })

  expenses.forEach((expense) => {
    if (!expense.property_id) return
    const stat = statsByProperty.get(expense.property_id)
    if (!stat) return

    const amount = Number(expense.amount || 0)
    const currency = getExpenseCurrency(expense, propertyById)
    const date = expense.expense_date ? new Date(expense.expense_date) : null
    const monthIndex = date && date.getFullYear() === safeYear ? date.getMonth() : -1

    stat.expenses += amount
    stat.ownerNet -= amount
    if (monthIndex >= 0) {
      addMoney(monthly[monthIndex].expenses, currency, amount)
      addMoney(monthly[monthIndex].ownerNet, currency, -amount)
    }
  })

  statsByProperty.forEach((stat) => {
    if (!ownerStats.has(stat.ownerName)) {
      ownerStats.set(stat.ownerName, {
        ownerName: stat.ownerName,
        revenue: {},
        commission: {},
        expenses: {},
        ownerNet: {},
        properties: new Set<string>(),
      })
    }
    const owner = ownerStats.get(stat.ownerName)
    if (!owner) return
    owner.properties.add(stat.name)
    addMoney(owner.revenue, stat.currency, stat.revenue)
    addMoney(owner.commission, stat.currency, stat.commission)
    addMoney(owner.expenses, stat.currency, stat.expenses)
    addMoney(owner.ownerNet, stat.currency, stat.ownerNet)
  })

  monthly.forEach((item) => {
    item.reservations = reservations.filter((reservation) => reservation.check_in.startsWith(item.key)).length
    item.nights = reservations
      .filter((reservation) => reservation.check_in.startsWith(item.key))
      .reduce((sum, reservation) => sum + getNights(reservation.check_in, reservation.check_out), 0)
  })

  const propertyStats = Array.from(statsByProperty.values()).sort((a, b) => b.revenue - a.revenue)
  const activePropertyStats = propertyStats.filter((item) => item.revenue > 0 || item.expenses > 0)
  const ownerRows = Array.from(ownerStats.values()).sort((a, b) => moneyValue(b.revenue) - moneyValue(a.revenue))
  const platformRows = Array.from(platformRevenue.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => moneyValue(b.revenue) - moneyValue(a.revenue))

  const totalRevenue = sumMoney(monthly.map((item) => item.revenue))
  const totalCommission = sumMoney(monthly.map((item) => item.commission))
  const totalExpenses = sumMoney(monthly.map((item) => item.expenses))
  const totalOwnerNet = sumMoney(monthly.map((item) => item.ownerNet))
  const totalReservations = reservations.length
  const totalNights = reservations.reduce((sum, reservation) => sum + getNights(reservation.check_in, reservation.check_out), 0)
  const totalAvailableNights = propertyStats.reduce((sum, property) => sum + property.availableNights, 0)
  const occupancy = totalAvailableNights > 0 ? Math.min(100, Math.round((totalNights / totalAvailableNights) * 100)) : 0
  const maxMonthlyRevenue = Math.max(...monthly.map((item) => moneyValue(item.revenue)), 0)
  const maxPropertyRevenue = Math.max(...propertyStats.map((item) => item.revenue), 0)

  const forecast90 = futureReservations.reduce((acc, reservation) => {
    const property = getPropertyFromListing(reservation)
    const currency = property?.currency || reservation.currency || 'EUR'
    addMoney(acc, currency, Number(reservation.total_amount || 0))
    return acc
  }, {} as MoneyMap)

  return (
    <AuthLayout>
      <PremiumPageShell maxWidth="max-w-[1500px]" className="pb-28">
        <PremiumPageHeader
          title="Dashboard Empresa"
          description="Resultado anual consolidado para sócios: propriedades, comissões, repasses e retorno financeiro do negócio."
          badge={`Ano ${safeYear}`}
          icon={BarChart3}
          actions={(
            <>
              <Link
                href={`/${locale}/dashboard/empresa?year=${safeYear - 1}`}
                className="rounded-full border border-neutral-200 bg-brand-white px-4 py-2 text-xs font-bold text-brand-text-dark transition-all hover:border-brand-gold/45 hover:bg-brand-bg hover:text-brand-gold"
              >
                {safeYear - 1}
              </Link>
              <Link
                href={`/${locale}/dashboard/empresa?year=${safeYear + 1}`}
                className="rounded-full border border-neutral-200 bg-brand-white px-4 py-2 text-xs font-bold text-brand-text-dark transition-all hover:border-brand-gold/45 hover:bg-brand-bg hover:text-brand-gold"
              >
                {safeYear + 1}
              </Link>
              <Link
                href={`/${locale}/reports/financeiro?start_date=${start}&end_date=${end}`}
                className="inline-flex items-center gap-2 rounded-full bg-brand-blue px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-brand-blue/90"
              >
                <Download className="h-3.5 w-3.5" />
                Exportar
              </Link>
            </>
          )}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <PremiumMetricCard
            label="Receita administrada"
            value={formatMoneyMap(totalRevenue)}
            type="BRUTO"
            description={`${totalReservations} reservas confirmadas no ano`}
            icon={DollarSign}
            tone="success"
          />
          <PremiumMetricCard
            label="Comissão Lodgra"
            value={formatMoneyMap(totalCommission)}
            type="EMPRESA"
            description="Receita gerencial do negócio"
            icon={Wallet}
            tone="gold"
          />
          <PremiumMetricCard
            label="Despesas proprietários"
            value={formatMoneyMap(totalExpenses)}
            type="CUSTOS"
            description="Custos lançados nas propriedades"
            icon={TrendingUp}
            tone="danger"
          />
          <PremiumMetricCard
            label="Repasse proprietários"
            value={formatMoneyMap(totalOwnerNet)}
            type="LÍQUIDO"
            description="Receita após comissão e despesas"
            icon={Users}
            tone="blue"
          />
          <PremiumMetricCard
            label="Ocupação anual"
            value={`${occupancy}%`}
            type={`${totalNights} noites`}
            description={`${properties.length} propriedades ativas`}
            icon={Percent}
            tone="blue"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <PremiumCard as="section">
            <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-brand-text-dark transition-colors group-hover:text-brand-gold">
                  Evolução mensal
                </h2>
                <p className="mt-1 text-xs font-semibold text-brand-text-medium">
                  Receita administrada e comissão acumulada em {safeYear}
                </p>
              </div>
              <span className="rounded-full bg-brand-blue/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-brand-blue">
                Dados Supabase
              </span>
            </div>
            <div className="space-y-4">
              {monthly.map((item) => (
                <BarRow
                  key={item.key}
                  label={item.label}
                  value={moneyValue(item.revenue)}
                  max={maxMonthlyRevenue}
                  meta={`${formatMoneyMap(item.revenue)} · ${item.reservations} reservas`}
                />
              ))}
            </div>
          </PremiumCard>

          <PremiumCard as="section">
            <div className="mb-5">
              <h2 className="text-sm font-black uppercase tracking-widest text-brand-text-dark transition-colors group-hover:text-brand-gold">
                Retorno do negócio
              </h2>
              <p className="mt-1 text-xs font-semibold text-brand-text-medium">
                Comissão de gestão como receita direta da empresa.
              </p>
            </div>
            <div className="space-y-5">
              <div className="rounded-2xl border border-brand-blue/10 bg-brand-blue p-5 text-white">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-black uppercase tracking-widest text-white/70">Resultado empresa</span>
                  <ArrowUpRight className="h-5 w-5 text-brand-gold" />
                </div>
                <div className="mt-4 text-3xl font-black tracking-tight">{formatMoneyMap(totalCommission)}</div>
                <p className="mt-3 text-xs font-semibold text-white/70">
                  Valor antes de despesas internas da Lodgra, que ainda não aparecem nos lançamentos de propriedades.
                </p>
              </div>
              <div className="space-y-3">
                {platformRows.slice(0, 5).map((platform) => (
                  <div key={platform.name} className="flex items-center justify-between gap-3 border-b border-brand-bg pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="text-xs font-bold text-brand-text-dark">{platform.name}</p>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-text-medium">{platform.reservations} reservas</p>
                    </div>
                    <div className="text-right text-xs font-black text-brand-text-dark">{formatMoneyMap(platform.revenue)}</div>
                  </div>
                ))}
                {platformRows.length === 0 && (
                  <p className="text-sm font-semibold text-brand-text-medium">Sem reservas confirmadas no período.</p>
                )}
              </div>
            </div>
          </PremiumCard>
        </div>

        <PremiumCard as="section" className="overflow-hidden p-0">
          <div className="flex flex-col gap-2 border-b border-brand-bg px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-brand-blue transition-colors group-hover:text-brand-gold" />
              <h2 className="text-xs font-black uppercase tracking-widest text-brand-text-dark transition-colors group-hover:text-brand-gold">
                Resultado por propriedade
              </h2>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-text-medium">
              {activePropertyStats.length} propriedades com movimento
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full">
              <thead>
                <tr className="border-b border-brand-bg">
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-wider text-brand-text-medium">Propriedade</th>
                  <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-wider text-brand-text-medium">Receita</th>
                  <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-wider text-brand-text-medium">Comissão</th>
                  <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-wider text-brand-text-medium">Despesas</th>
                  <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-wider text-brand-text-medium">Repasse</th>
                  <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-wider text-brand-text-medium">Ocupação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-bg">
                {activePropertyStats.map((property) => {
                  const occupancyRate = property.availableNights > 0
                    ? Math.min(100, Math.round((property.nights / property.availableNights) * 100))
                    : 0
                  return (
                    <tr key={property.id} className="transition-colors hover:bg-brand-bg/70">
                      <td className="px-4 py-4">
                        <div className="max-w-[340px]">
                          <p className="truncate text-sm font-bold text-brand-text-dark">{property.name}</p>
                          <p className="mt-1 text-xs font-semibold text-brand-text-medium">
                            {property.ownerName} · {property.managementPercentage}% gestão · {property.reservations} reservas
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-bold tabular-nums text-brand-text-dark">
                        {formatCurrency(property.revenue, property.currency as CurrencyCode)}
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-bold tabular-nums text-brand-gold">
                        {formatCurrency(property.commission, property.currency as CurrencyCode)}
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-bold tabular-nums text-red-600">
                        {formatCurrency(property.expenses, property.currency as CurrencyCode)}
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-bold tabular-nums text-emerald-600">
                        {formatCurrency(property.ownerNet, property.currency as CurrencyCode)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="ml-auto w-36">
                          <BarRow label={`${occupancyRate}%`} value={property.revenue} max={maxPropertyRevenue} meta={`${property.nights} noites`} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {activePropertyStats.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm font-semibold text-brand-text-medium">
                      Sem receita ou despesas registradas para {safeYear}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </PremiumCard>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <PremiumCard as="section" className="overflow-hidden p-0">
            <div className="border-b border-brand-bg px-5 py-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-brand-text-dark transition-colors group-hover:text-brand-gold">
                Resultado por proprietário
              </h2>
            </div>
            <div className="divide-y divide-brand-bg">
              {ownerRows.slice(0, 8).map((owner) => (
                <div key={owner.ownerName} className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-[1fr_auto]">
                  <div>
                    <p className="text-sm font-bold text-brand-text-dark">{owner.ownerName}</p>
                    <p className="mt-1 text-xs font-semibold text-brand-text-medium">
                      {owner.properties.size} propriedades
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-left sm:text-right">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-brand-text-medium">Comissão</p>
                      <div className="text-sm font-black text-brand-gold">{formatMoneyMap(owner.commission)}</div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-brand-text-medium">Repasse</p>
                      <div className="text-sm font-black text-emerald-600">{formatMoneyMap(owner.ownerNet)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </PremiumCard>

          <PremiumCard as="section">
            <div className="mb-5 flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-brand-blue transition-colors group-hover:text-brand-gold" />
              <h2 className="text-xs font-black uppercase tracking-widest text-brand-text-dark transition-colors group-hover:text-brand-gold">
                Previsão de caixa
              </h2>
            </div>
            <div className="rounded-2xl border border-brand-gold/20 bg-brand-gold/10 p-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-brand-text-medium">
                Reservas futuras confirmadas
              </p>
              <div className="mt-3 text-3xl font-black tracking-tight text-brand-text-dark">{formatMoneyMap(forecast90)}</div>
              <p className="mt-2 text-xs font-semibold text-brand-text-medium">
                {futureReservations.length} reservas a partir de hoje, usando valores confirmados no Supabase.
              </p>
            </div>
            <div className="mt-5 space-y-3">
              {propertyStats.slice(0, 5).map((property) => (
                <BarRow
                  key={property.id}
                  label={property.name}
                  value={property.revenue}
                  max={maxPropertyRevenue}
                  meta={formatCurrency(property.revenue, property.currency as CurrencyCode)}
                />
              ))}
            </div>
          </PremiumCard>
        </div>
      </PremiumPageShell>
    </AuthLayout>
  )
}
