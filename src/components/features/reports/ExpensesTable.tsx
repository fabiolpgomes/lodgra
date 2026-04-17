'use client'

import { ExportToExcelButton } from './ExportToExcelButton'
import { formatCurrency, type CurrencyCode } from '@/lib/utils/currency'

const categoryLabels: Record<string, string> = {
  cleaning: 'Limpeza',
  maintenance: 'Manutenção',
  utilities: 'Utilidades',
  taxes: 'Impostos',
  insurance: 'Seguros',
  supplies: 'Suprimentos',
  repairs: 'Reparos',
  marketing: 'Marketing',
  management: 'Gestão',
  mortgage: 'Hipoteca',
  other: 'Outros',
}

interface ExpenseRow {
  id: string
  expense_date: string
  description: string
  category: string
  amount: number | string
  currency: string | null
  notes?: string | null
  properties?: { name: string; currency: string } | null
}

interface ExpensesTableProps {
  expenses: ExpenseRow[]
  startDate: string
  endDate: string
}

export function ExpensesTable({ expenses, startDate, endDate }: ExpensesTableProps) {
  // Totalizar por moeda
  const totalsByCurrency = expenses.reduce((acc: Record<string, number>, e) => {
    const currency = e.currency || e.properties?.currency || 'EUR'
    acc[currency] = (acc[currency] || 0) + Number(e.amount)
    return acc
  }, {})

  const exportData = expenses.map(e => ({
    'Data': new Date(e.expense_date).toLocaleDateString('pt-BR'),
    'Propriedade': e.properties?.name || '-',
    'Descrição': e.description,
    'Categoria': categoryLabels[e.category] || e.category,
    'Moeda': e.currency || e.properties?.currency || 'EUR',
    'Valor': Number(e.amount).toFixed(2),
  }))

  // Agrupar por categoria e moeda
  const byCategory = expenses.reduce((acc: Record<string, Record<string, number>>, e) => {
    const cat = e.category || 'other'
    const currency = e.currency || e.properties?.currency || 'EUR'
    if (!acc[cat]) acc[cat] = {}
    acc[cat][currency] = (acc[cat][currency] || 0) + Number(e.amount)
    return acc
  }, {})

  // Para percentagens, agrupar total por categoria (somando todas as moedas — apenas para ordenação)
  const categoryTotalMixed = Object.entries(byCategory)
    .map(([category, currencies]) => ({
      category,
      currencies,
      mixedTotal: Object.values(currencies).reduce((s, v) => s + v, 0),
    }))
    .sort((a, b) => b.mixedTotal - a.mixedTotal)

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Despesas Detalhadas</h3>
            <p className="text-sm text-gray-600">
              {expenses.length} despesa(s) no período
            </p>
          </div>
          <ExportToExcelButton
            data={exportData}
            filename={`despesas_${startDate}_${endDate}`}
            sheetName="Despesas"
          />
        </div>

        {expenses.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>Nenhuma despesa registrada no período selecionado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Propriedade
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descrição
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoria
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {new Date(expense.expense_date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {expense.properties?.name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {expense.description}
                      {expense.notes && (
                        <span className="block text-xs text-gray-500 mt-1">{expense.notes}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                        {categoryLabels[expense.category] || expense.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-red-600 text-right">
                      {formatCurrency(expense.amount, (expense.currency || expense.properties?.currency || 'EUR') as CurrencyCode)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 font-semibold">
                {Object.entries(totalsByCurrency).map(([currency, total]) => (
                  <tr key={currency}>
                    <td colSpan={4} className="px-4 py-3 text-sm text-gray-900 text-right">
                      TOTAL ({currency}):
                    </td>
                    <td className="px-4 py-3 text-sm text-red-600 text-right">
                      {formatCurrency(total, currency as CurrencyCode)}
                    </td>
                  </tr>
                ))}
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Análise por Categoria */}
      {categoryTotalMixed.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Despesas por Categoria</h3>
          <div className="space-y-3">
            {categoryTotalMixed.map(({ category, currencies }) => (
              <div key={category}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">
                    {categoryLabels[category] || category}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {Object.entries(currencies)
                      .map(([cur, amt]) => formatCurrency(amt, cur as CurrencyCode))
                      .join(' + ')}
                  </span>
                </div>
                {/* Barra de progresso por moeda */}
                {Object.entries(currencies).map(([cur, amt]) => {
                  const currencyTotal = totalsByCurrency[cur] || 1
                  const percentage = (amt / currencyTotal) * 100
                  return (
                    <div key={cur} className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-500 w-8">{cur}</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-red-500 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-12 text-right">{percentage.toFixed(0)}%</span>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
