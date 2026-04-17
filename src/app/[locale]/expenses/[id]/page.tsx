import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Receipt, ArrowLeft, Edit, Building2, StickyNote, CreditCard } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { DeleteExpenseButton } from '@/components/features/expenses/DeleteExpenseButton'
import { formatCurrency } from '@/lib/utils/currency'
import { AuthLayout } from '@/components/common/layout/AuthLayout'
import { getUserRole } from '@/lib/auth/getUserRole'
import { Button } from '@/components/common/ui/button'
import { Badge } from '@/components/common/ui/badge'

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

export default async function ExpenseDetailsPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const userRole = await getUserRole(supabase)
  const canEdit = userRole === 'admin' || userRole === 'gestor'
  const canDelete = userRole === 'admin'

  const { data: expense, error } = await supabase
    .from('expenses')
    .select(`
      *,
      properties!inner(
        id,
        name,
        address,
        city,
        country
      )
    `)
    .eq('id', id)
    .single()

  if (error || !expense) {
    notFound()
  }

  const property = expense.properties

  return (
    <AuthLayout>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
          <Link href="/" className="hover:text-gray-900">Dashboard</Link>
          <span>/</span>
          <Link href="/expenses" className="hover:text-gray-900">Despesas</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">Detalhes</span>
        </div>

        {/* Back Button */}
        <Link
          href="/expenses"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Despesas
        </Link>

        {/* Header com Ações */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Receipt className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {expense.description}
                </h2>
                <div className="flex items-center gap-3 mt-1">
                  <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                    {categoryLabels[expense.category] || expense.category}
                  </Badge>
                  <span className="text-sm text-gray-600">
                    Criada em {new Date(expense.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              {canEdit && (
                <Button asChild>
                  <Link href={`/expenses/${id}/edit`}>
                    <Edit className="h-4 w-4" />
                    Editar
                  </Link>
                </Button>
              )}
              {canDelete && (
                <DeleteExpenseButton
                  expenseId={id}
                  description={expense.description}
                />
              )}
            </div>
          </div>
        </div>

        {/* Grid de Conteúdo */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Detalhes da Despesa */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Detalhes da Despesa
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Data da Despesa</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {new Date(expense.expense_date).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Categoria</p>
                  <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                    {categoryLabels[expense.category] || expense.category}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Descrição</p>
                  <p className="text-gray-900">{expense.description}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Valor</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(expense.amount, expense.currency || 'EUR')}
                  </p>
                </div>
              </div>
            </div>

            {/* Propriedade */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Propriedade
              </h3>
              {property ? (
                <div>
                  <Link
                    href={`/properties/${property.id}`}
                    className="text-xl font-semibold text-blue-600 hover:text-blue-700"
                  >
                    {property.name}
                  </Link>
                  {property.address && (
                    <p className="text-sm text-gray-600 mt-1">
                      {property.address}
                    </p>
                  )}
                  <p className="text-sm text-gray-600">
                    {property.city}{property.country ? `, ${property.country}` : ''}
                  </p>
                </div>
              ) : (
                <p className="text-gray-500">Propriedade não encontrada</p>
              )}
            </div>

            {/* Notas */}
            {expense.notes && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <StickyNote className="h-5 w-5" />
                  Notas
                </h3>
                <p className="text-gray-700 whitespace-pre-wrap">{expense.notes}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Resumo Financeiro */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Resumo Financeiro
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Valor</span>
                  <span className="text-2xl font-bold text-red-600">
                    {formatCurrency(expense.amount, expense.currency || 'EUR')}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Moeda</span>
                  <span className="text-gray-900 font-medium">
                    {expense.currency || 'EUR'}
                  </span>
                </div>
              </div>
            </div>

            {/* Informações Adicionais */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Informações Adicionais
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-600 mb-1">Criada em</p>
                  <p className="text-gray-900">
                    {new Date(expense.created_at).toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className="pt-3 border-t">
                  <p className="text-gray-600 mb-1">Última Atualização</p>
                  <p className="text-gray-900">
                    {new Date(expense.updated_at).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </AuthLayout>
  )
}
