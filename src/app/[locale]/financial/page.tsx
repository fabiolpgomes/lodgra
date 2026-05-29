import { TrendingUp, TrendingDown, DollarSign, Percent, BarChart3 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency, groupByCurrency, type CurrencyCode } from '@/lib/utils/currency'
import { ProfitCard } from '@/components/features/dashboard/ProfitCard'
import { AuthLayout } from '@/components/common/layout/AuthLayout'
import { calcManagementFee, calcOwnerNet } from '@/lib/financial/calculations'
import { CurrencyStack } from '@/components/common/ui/CurrencyStack'
import { MonthNavigator } from '@/components/common/ui/MonthNavigator'
import { calculateRevenueForReservation } from '@/lib/financial/revenue-calculator'

export default async function FinancialPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const params = await searchParams
  const monthParam = params.month || new Date().toISOString().slice(0, 7)
  const [mYear, mMonth] = monthParam.split('-').map(Number)
  const monthStart = `${monthParam}-01`
  const monthEnd = `${monthParam}-${String(new Date(mYear, mMonth, 0).getDate()).padStart(2, '0')}`

  const supabase = await createClient()

  // Buscar TODAS as reservas confirmadas para cálculo de distribuição proporcional
  const { data: reservations } = await supabase
    .from('reservations')
    .select(`
      id,
      total_amount,
      currency,
      check_in,
      check_out,
      property_listings!inner(
        property_id,
        properties!inner(id, currency)
      )
    `)
    .eq('status', 'confirmed')

  // Buscar despesas do mês seleccionado
  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount, currency, property_id, properties(id, currency)')
    .gte('expense_date', monthStart)
    .lte('expense_date', monthEnd)

  // Buscar propriedades com management_percentage e owner
  const { data: properties } = await supabase
    .from('properties')
    .select('id, name, currency, management_percentage, owners(full_name)')
    .eq('is_active', true)

  // Helper: property.currency tem prioridade sobre reservation.currency
  // (Airbnb imports gravam 'EUR' mesmo para propriedades BRL)
  function getResCurrency(r: { currency?: string | null; property_listings?: unknown }): CurrencyCode {
    const listing = r.property_listings
    const lObj = Array.isArray(listing) ? listing[0] : listing
    const prop = (lObj as { properties?: { currency?: string } | { currency?: string }[] } | null)?.properties
    const propObj = Array.isArray(prop) ? prop[0] : prop
    return ((propObj?.currency || r.currency || 'EUR') as CurrencyCode)
  }

  // Calcular receita por moeda usando distribuição proporcional
  const monthKey = `${mYear}-${String(mMonth).padStart(2, '0')}`
  const revenueByCurrency = groupByCurrency(
    (reservations || []).flatMap(r => {
      const revenueBreakdown = calculateRevenueForReservation({
        id: r.id,
        totalAmount: Number(r.total_amount || 0),
        checkIn: typeof r.check_in === 'string' ? r.check_in : r.check_in.toISOString().split('T')[0],
        checkOut: typeof r.check_out === 'string' ? r.check_out : r.check_out.toISOString().split('T')[0],
        currency: getResCurrency(r),
        status: 'confirmed'
      })

      // Obter apenas o valor alocado ao mês selecionado
      const monthlyValue = revenueBreakdown.monthlyBreakdown.find(m => m.month === monthKey)?.value || 0

      return monthlyValue > 0 ? [{
        currency: getResCurrency(r),
        amount: monthlyValue
      }] : []
    })
  )

  // Calcular despesas por moeda (expense.currency > property.currency > EUR)
  const expensesByCurrency = groupByCurrency(
    expenses?.map(e => {
      const prop = e.properties as { currency?: string } | { currency?: string }[] | null
      const propObj = Array.isArray(prop) ? prop[0] : prop
      return {
        currency: (e.currency || propObj?.currency || 'EUR') as CurrencyCode,
        amount: Number(e.amount)
      }
    }) || []
  )

  // Calcular lucro por moeda
  const profitByCurrency: Record<string, { revenue: number; expenses: number; profit: number }> = {}
  
  const allCurrencies = new Set([
    ...Object.keys(revenueByCurrency),
    ...Object.keys(expensesByCurrency)
  ])

  allCurrencies.forEach(currency => {
    const revenue = revenueByCurrency[currency as CurrencyCode] || 0
    const expense = expensesByCurrency[currency as CurrencyCode] || 0
    profitByCurrency[currency] = {
      revenue,
      expenses: expense,
      profit: revenue - expense
    }
  })

  // Análise por propriedade
  const propertyAnalysis = properties?.map(property => {
    const propertyRevenue = (reservations || [])
      .filter(r => {
        const listing = r.property_listings
        const lObj = Array.isArray(listing) ? listing[0] : listing
        return (lObj as { property_id?: string } | null)?.property_id === property.id
      })
      .reduce((sum, r) => {
        const revenueBreakdown = calculateRevenueForReservation({
          id: r.id,
          totalAmount: Number(r.total_amount || 0),
          checkIn: typeof r.check_in === 'string' ? r.check_in : r.check_in.toISOString().split('T')[0],
          checkOut: typeof r.check_out === 'string' ? r.check_out : r.check_out.toISOString().split('T')[0],
          currency: getResCurrency(r),
          status: 'confirmed'
        })
        const monthlyValue = revenueBreakdown.monthlyBreakdown.find(m => m.month === monthKey)?.value || 0
        return sum + monthlyValue
      }, 0) || 0

    const propertyExpenses = expenses
      ?.filter(e => e.property_id === property.id)
      .reduce((sum, e) => sum + Number(e.amount), 0) || 0

    const mgmtPct = Number(property.management_percentage ?? 0)
    const managementFee = calcManagementFee(propertyRevenue, mgmtPct)
    const ownerNet = calcOwnerNet(propertyRevenue, mgmtPct)
    const owner = property.owners as unknown as { full_name: string } | null

    return {
      ...property,
      revenue: propertyRevenue,
      expenses: propertyExpenses,
      profit: propertyRevenue - propertyExpenses,
      profitMargin: propertyRevenue > 0 ? ((propertyRevenue - propertyExpenses) / propertyRevenue) * 100 : 0,
      management_percentage: mgmtPct,
      management_fee: managementFee,
      owner_net: ownerNet,
      owner_name: owner?.full_name ?? null,
    }
  }) || []

  // Filtrar apenas propriedades com receita ou despesas no mês
  const activePropertyAnalysis = propertyAnalysis.filter(p => p.revenue > 0 || p.expenses > 0)

  // Ordenar por lucro
  activePropertyAnalysis.sort((a, b) => b.profit - a.profit)

  return (
    <AuthLayout>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="be-icon w-10 h-10 bg-[#ECFDF5]">
                <DollarSign className="h-5 w-5 text-[#059669]" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Análise Financeira</h2>
            </div>
            <p className="text-[10px] font-black uppercase tracking-wider text-lodgra-navy/20 ml-14">
              Receitas, despesas e lucro do mês seleccionado
            </p>
          </div>
          <MonthNavigator currentMonth={monthParam} />
        </div>

        {/* Cards de Lucro por Moeda */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {Object.entries(profitByCurrency)
            .sort(([currencyA], [currencyB]) => currencyA.localeCompare(currencyB))
            .map(([currency, data]) => (
              <ProfitCard
                key={currency}
                revenue={data.revenue}
                expenses={data.expenses}
                currency={currency}
              />
            ))}
        </div>

        {/* Análise por Propriedade */}
        <div className="be-card overflow-hidden rounded-none border border-lodgra-blue/10">
          <div className="px-5 py-4 border-b border-lodgra-blue/10 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-lodgra-blue" />
            <h3 className="text-xs font-black text-lodgra-blue uppercase tracking-widest font-display">Análise por Propriedade</h3>
          </div>

          <div className="w-full">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-3 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider max-w-[240px]">
                    Propriedade
                  </th>
                  <th className="px-2 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                    Receita
                  </th>
                  <th className="px-2 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                    Comissão
                  </th>
                  <th className="px-2 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                    Líquido
                  </th>
                  <th className="px-2 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                    Despesas
                  </th>
                  <th className="px-2 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                    Lucro
                  </th>
                  <th className="px-2 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                    Margem
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activePropertyAnalysis.map((property) => {
                  const truncatedName = property.name.length > 40
                    ? property.name.substring(0, 40) + '...'
                    : property.name

                  return (
                    <tr key={property.id} className="hover:bg-gray-50/60">
                      <td className="px-3 py-3 max-w-[240px]">
                        <div className="flex items-start gap-2">
                          {property.currency && (() => {
                            const badgeColor = property.currency === 'EUR' ? 'bg-brand-50 text-brand-700 ring-brand-200'
                              : property.currency === 'BRL' ? 'bg-green-50 text-green-700 ring-green-200'
                              : property.currency === 'USD' ? 'bg-yellow-50 text-yellow-700 ring-yellow-200'
                              : property.currency === 'GBP' ? 'bg-purple-50 text-purple-700 ring-purple-200'
                              : 'bg-gray-100 text-gray-700 ring-gray-200'
                            return (
                              <span className={`mt-0.5 inline-flex items-center justify-center min-w-[2.5rem] h-5 px-1.5 text-[10px] font-bold uppercase tracking-widest rounded ring-1 shrink-0 ${badgeColor}`}>
                                {property.currency}
                              </span>
                            )
                          })()}
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-gray-900 truncate" title={property.name}>
                              {truncatedName}
                            </div>
                            {property.owner_name && (
                              <div className="text-xs text-gray-600 mt-0.5 truncate">{property.owner_name}</div>
                            )}
                            {property.management_percentage > 0 && (
                              <span className="text-[9px] bg-brand-50 text-brand-700 px-1 py-0.5 rounded-full font-medium inline-block mt-1">
                                {property.management_percentage}% gestão
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <TrendingUp className="h-3 w-3 text-green-600" />
                          <span className="text-xs font-medium text-gray-900">
                            {formatCurrency(property.revenue, property.currency as CurrencyCode)}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-right">
                        <span className="text-xs font-medium text-orange-600">
                          {property.management_percentage > 0
                            ? formatCurrency(property.management_fee, property.currency as CurrencyCode)
                            : '—'}
                        </span>
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-right">
                        <span className="text-xs font-medium text-teal-600">
                          {formatCurrency(property.owner_net, property.currency as CurrencyCode)}
                        </span>
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <TrendingDown className="h-3 w-3 text-red-600" />
                          <span className="text-xs font-medium text-gray-900">
                            {formatCurrency(property.expenses, property.currency as CurrencyCode)}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-right">
                        <span className={`text-xs font-bold ${
                          property.profit >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(property.profit, property.currency as CurrencyCode)}
                        </span>
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <Percent className="h-3 w-3 text-gray-500" />
                          <span className={`text-xs font-bold ${
                            property.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {property.profitMargin.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Resumo Geral */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="be-card p-5 border border-lodgra-blue/10 rounded-none shadow-none">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-lodgra-blue/5 rounded-none">
                <TrendingUp className="h-4 w-4 text-lodgra-blue" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-lodgra-navy/30 font-display">Receitas</span>
            </div>
            <div className="text-lodgra-blue">
              <CurrencyStack totals={revenueByCurrency} size="lg" showEmpty={true} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-wider text-lodgra-navy/20 mt-2">Total receitas confirmadas</p>
          </div>

          <div className="be-card p-5 border border-lodgra-blue/10 rounded-none shadow-none">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-red-50 rounded-none">
                <TrendingDown className="h-4 w-4 text-red-600" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-lodgra-navy/30 font-display">Despesas</span>
            </div>
            <div className="text-red-600">
              <CurrencyStack totals={expensesByCurrency} size="lg" showEmpty={true} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-wider text-lodgra-navy/20 mt-2">Total despesas registradas</p>
          </div>

          <div className="be-card p-5 border border-lodgra-blue/10 rounded-none shadow-none" style={{ backgroundColor: '#FFFFFF' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 rounded-none">
                <BarChart3 className="h-4 w-4" style={{ color: '#1E3A8A' }} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest font-display" style={{ color: '#1E3A8A' }}>Lucro</span>
            </div>
            <div className="space-y-1.5">
              {Object.entries(profitByCurrency).map(([currency, data]) => (
                <div key={currency} className="flex items-center gap-2">
                  <span className={`inline-flex items-center justify-center min-w-[2.5rem] h-5 px-1.5 text-[10px] font-black uppercase tracking-widest rounded-none ring-1 shrink-0 ${
                    currency === 'EUR' ? 'bg-white text-[#1E3A8A] ring-[#1E3A8A]/20' :
                    currency === 'BRL' ? 'bg-white text-[#1E3A8A] ring-[#1E3A8A]/20' :
                    currency === 'USD' ? 'bg-white text-[#1E3A8A] ring-[#1E3A8A]/20' :
                    'bg-white text-[#1E3A8A] ring-[#1E3A8A]/20'
                  }`}>{currency}</span>
                  <span className={`text-2xl font-black tabular-nums font-display ${data.profit >= 0 ? '' : 'text-red-600'}`} style={{ color: data.profit >= 0 ? '#1E3A8A' : undefined }}>
                    {formatCurrency(data.profit, currency as CurrencyCode)}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[10px] font-black uppercase tracking-wider mt-2" style={{ color: '#1E3A8A' }}>Receita menos despesas</p>
          </div>
        </div>
      </main>
    </AuthLayout>
  )
}
