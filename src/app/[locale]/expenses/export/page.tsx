import { requireRole } from '@/lib/auth/requireRole'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AuthLayout } from '@/components/common/layout/AuthLayout'
import { LazyExpensesPdfGenerator as ExpensesPdfGenerator } from '@/components/common/lazy/LazyPdfGenerators'
import { getUserPropertyIds } from '@/lib/auth/getUserProperties'
import { FileText } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ExpensesExportPage() {
  const auth = await requireRole(['admin', 'gestor'])
  if (!auth.authorized) redirect('/login')

  const supabase = await createClient()
  const userPropertyIds = await getUserPropertyIds(supabase)

  let propertiesQuery = supabase
    .from('properties')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  if (userPropertyIds) {
    propertiesQuery = propertiesQuery.in('id', userPropertyIds)
  }

  const { data: properties } = await propertiesQuery

  return (
    <AuthLayout>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="h-8 w-8 text-red-600" />
            <h1 className="text-3xl font-bold text-gray-900">Exportar Despesas</h1>
          </div>
          <p className="text-gray-600">
            Gere um relatorio em PDF com todas as despesas dentro de um periodo especifico
          </p>
        </div>

        {/* Generator Component */}
        <ExpensesPdfGenerator properties={properties || []} />

        {/* Info Section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-red-50 rounded-lg p-6 border border-red-200">
            <h3 className="text-lg font-semibold text-red-900 mb-2">O que esta incluido?</h3>
            <ul className="text-sm text-red-800 space-y-2">
              <li>✓ Todas as despesas registradas no periodo</li>
              <li>✓ Agrupamento por propriedade</li>
              <li>✓ Resumo por categoria</li>
              <li>✓ Descricao e notas de cada despesa</li>
              <li>✓ Subtotais por propriedade</li>
              <li>✓ Valor total consolidado</li>
            </ul>
          </div>

          <div className="bg-green-50 rounded-lg p-6 border border-green-200">
            <h3 className="text-lg font-semibold text-green-900 mb-2">Como usar?</h3>
            <ol className="text-sm text-green-800 space-y-2">
              <li>1. Selecione a propriedade (ou todas)</li>
              <li>2. Escolha a categoria (ou todas)</li>
              <li>3. Defina o periodo desejado</li>
              <li>4. Clique em &quot;Gerar PDF&quot;</li>
              <li>5. O arquivo sera aberto para download</li>
            </ol>
          </div>
        </div>
      </main>
    </AuthLayout>
  )
}
