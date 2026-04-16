import Link from 'next/link'
import { Plus, Receipt, TrendingDown, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils/currency'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default async function ExpensesPage() {
  const supabase = await createClient()

  const { data: expenses, error } = await supabase
    .from('expenses')
    .select(`
      *,
      properties!inner(
        id,
        name,
        currency
      )
    `)
    .order('expense_date', { ascending: false })

  if (error) {
    console.error('Erro ao buscar despesas:', error)
  }


  const totalExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0

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

  return (
    <AuthLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Receipt className="h-8 w-8 text-red-600" />
              <h2 className="text-3xl font-bold text-gray-900">Despesas</h2>
            </div>
            <p className="text-gray-600">Gerencie todas as despesas das propriedades</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="expenses/export">
                <FileText className="h-5 w-5" />
                Exportar PDF
              </Link>
            </Button>
            <Button asChild>
              <Link href="/expenses/new">
                <Plus className="h-5 w-5" />
                Nova Despesa
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
              <span className="text-sm text-gray-500">Total</span>
            </div>
            <h3 className="text-3xl font-bold text-gray-900">{expenses?.length || 0}</h3>
            <p className="text-sm text-gray-600 mt-1">Despesas</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 col-span-3">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-500">Valor Total</span>
            </div>
            <h3 className="text-3xl font-bold text-red-600">
              {formatCurrency(totalExpenses, 'EUR')}
            </h3>
            <p className="text-sm text-gray-600 mt-1">Todas as despesas</p>
          </div>
        </div>

        {/* Lista de Despesas */}
        {!expenses || expenses.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Receipt className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Nenhuma despesa cadastrada
            </h3>
            <p className="text-gray-600 mb-6">
              Comece adicionando sua primeira despesa para controlar custos
            </p>
            <Button asChild>
              <Link href="/expenses/new">
                <Plus className="h-5 w-5" />
                Adicionar Primeira Despesa
              </Link>
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Propriedade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descrição
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoria
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(expense.expense_date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {expense.properties.name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{expense.description}</div>
                      {expense.notes && (
                        <div className="text-xs text-gray-500 mt-1">{expense.notes}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                        {categoryLabels[expense.category] || expense.category}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-red-600">
                      {formatCurrency(expense.amount, expense.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </AuthLayout>
  )
}
