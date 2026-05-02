import { TrendingUp, TrendingDown, DollarSign, Percent, BarChart3 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency, groupByCurrency, type CurrencyCode } from '@/lib/utils/currency'
import { ProfitCard } from '@/components/features/dashboard/ProfitCard'
import { AuthLayout } from '@/components/common/layout/AuthLayout'
import { calcManagementFee, calcOwnerNet } from '@/lib/financial/calculations'
import { CurrencyStack } from '@/components/common/ui/CurrencyStack'

export default async function FinancialPage() {
  const supabase = await createClient()

  // Buscar reservas confirmadas com property.currency como fonte de verdade
  const { data: reservations } = await supabase
    .from('reservations')
    .select(`
      total_amount,
      currency,
      property_listings!inner(
        property_id,
        properties!inner(id, currency)
      )
    `)
    .eq('status', 'confirmed')

  // Buscar despesas com property currency como fallback
  const { data: expenses } = await supabase
    .from('expenses')
    .select('amount, currency, property_id, properties(id, currency)')

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

  // Calcular receita por moeda usando property.currency
  const revenueByCurrency = groupByCurrency(
    reservations?.map(r => ({
      currency: getResCurrency(r),
      amount: r.total_amount ? Number(r.total_amount) : 0
    })) || []
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
    const propertyRevenue = reservations
      ?.filter(r => {
        const listing = r.property_listings
        const lObj = Array.isArray(listing) ? listing[0] : listing
        return (lObj as { property_id?: string } | null)?.property_id === property.id
      })
      .reduce((sum, r) => sum + (r.total_amount ? Number(r.total_amount) : 0), 0) || 0

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

  // Ordenar por lucro
  propertyAnalysis.sort((a, b) => b.profit - a.profit)

  return (
    <AuthLayout>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 rounded-xl">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Análise Financeira</h2>
            </div>
            <p className="text-gray-500 text-sm ml-14">
              Visão completa de receitas, despesas e lucro líquido por propriedade
            </p>
          </div>
        </div>

        {/* Cards de Lucro por Moeda */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {Object.entries(profitByCurrency).map(([currency, data]) => (
            <ProfitCard
              key={currency}
              revenue={data.revenue}
              expenses={data.expenses}
              currency={currency}
            />
          ))}
        </div>

        {/* Análise por Propriedade */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-gray-400" />
            <h3 className="text-base font-semibold text-gray-900">Análise por Propriedade</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Propriedade
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Receita Bruta
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Comissão Gestão
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Líquido Proprietário
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Despesas
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lucro
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Margem
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {propertyAnalysis.map((property) => (
                  <tr key={property.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{property.name}</div>
                      {property.owner_name && (
                        <div className="text-xs text-gray-500 mt-0.5">{property.owner_name}</div>
                      )}
                      {property.management_percentage > 0 && (
                        <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">
                          {property.management_percentage}% gestão
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(property.revenue, property.currency as CurrencyCode)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-sm font-medium text-orange-600">
                        {property.management_percentage > 0
                          ? formatCurrency(property.management_fee, property.currency as CurrencyCode)
                          : '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-sm font-medium text-teal-600">
                        {formatCurrency(property.owner_net, property.currency as CurrencyCode)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        <TrendingDown className="h-4 w-4 text-red-600" />
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(property.expenses, property.currency as CurrencyCode)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className={`text-sm font-bold ${
                        property.profit >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(property.profit, property.currency as CurrencyCode)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Percent className="h-4 w-4 text-gray-400" />
                        <span className={`text-sm font-bold ${
                          property.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {property.profitMargin.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Resumo Geral */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-green-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-green-100 rounded-xl">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Receitas</span>
            </div>
            <div className="text-green-600">
              <CurrencyStack totals={revenueByCurrency} size="lg" showEmpty={true} />
            </div>
            <p className="text-sm text-gray-500 mt-2">Total receitas confirmadas</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-red-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-red-100 rounded-xl">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Despesas</span>
            </div>
            <div className="text-red-600">
              <CurrencyStack totals={expensesByCurrency} size="lg" showEmpty={true} />
            </div>
            <p className="text-sm text-gray-500 mt-2">Total despesas registradas</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-blue-100 rounded-xl">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Lucro</span>
            </div>
            <div className="space-y-1.5">
              {Object.entries(profitByCurrency).map(([currency, data]) => (
                <div key={currency} className="flex items-center gap-2">
                  <span className={`inline-flex items-center justify-center min-w-[2.5rem] h-5 px-1.5 text-[10px] font-bold uppercase tracking-widest rounded ring-1 shrink-0 ${
                    currency === 'EUR' ? 'bg-blue-50 text-blue-700 ring-blue-200' :
                    currency === 'BRL' ? 'bg-green-50 text-green-700 ring-green-200' :
                    currency === 'USD' ? 'bg-yellow-50 text-yellow-700 ring-yellow-200' :
                    'bg-purple-50 text-purple-700 ring-purple-200'
                  }`}>{currency}</span>
                  <span className={`text-2xl font-bold tabular-nums ${data.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(data.profit, currency as CurrencyCode)}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-2">Receita menos despesas</p>
          </div>
        </div>
      </main>
    </AuthLayout>
  )
}
