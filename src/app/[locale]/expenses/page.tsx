import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Receipt, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { getUserAccess } from '@/lib/auth/getUserAccess'
import { Button } from '@/components/ui/button'
import { ExpensesFilter } from '@/components/expenses/ExpensesFilter'
import { parsePage, getRange, PAGE_SIZE } from '@/lib/utils/pagination'

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const params = await searchParams
  const page = parsePage(params)
  const { from, to } = getRange(page)

  const supabase = await createClient()
  const access = await getUserAccess(supabase)

  if (!access) {
    redirect('/login')
  }

  const { profile, propertyIds } = access
  const userRole = profile.role
  const canCreate = userRole === 'admin' || userRole === 'gestor'
  const canEdit = canCreate

  // Buscar todas as propriedades para o filtro
  let propertiesQuery = supabase
    .from('properties')
    .select('id, name, currency')
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (propertyIds) {
    propertiesQuery = propertiesQuery.in('id', propertyIds)
  }

  const { data: allProperties = [] } = await propertiesQuery

  // Paginado: data limitada + count total
  let dataQuery = supabase
    .from('expenses')
    .select(`*, properties!inner(id, name, currency)`, { count: 'exact' })
    .order('expense_date', { ascending: false })
    .range(from, to)

  if (propertyIds) {
    dataQuery = dataQuery.in('property_id', propertyIds)
  }

  const { data: expenses, count: totalCount, error } = await dataQuery

  if (error) {
    console.error('Erro ao buscar despesas:', error)
  }

  return (
    <AuthLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Receipt className="h-8 w-8 text-red-600" />
              <h2 className="text-3xl font-bold text-gray-900">Despesas</h2>
            </div>
            <p className="text-gray-600">Gerencie todas as despesas das propriedades</p>
          </div>
          {canCreate && (
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
          )}
        </div>


        {/* Filter + Search + List */}
        <ExpensesFilter
          expenses={(expenses || []) as unknown as Parameters<typeof ExpensesFilter>[0]['expenses']}
          properties={allProperties as Parameters<typeof ExpensesFilter>[0]['properties']}
          canCreate={canCreate}
          canEdit={canEdit}
          pagination={{ page, total: totalCount ?? 0, pageSize: PAGE_SIZE }}
        />
      </div>
    </AuthLayout>
  )
}
