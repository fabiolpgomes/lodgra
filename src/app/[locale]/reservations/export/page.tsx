import { requireRole } from '@/lib/auth/requireRole'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { LazyReservationsPdfGenerator as ReservationsPdfGenerator } from '@/components/lazy/LazyPdfGenerators'
import { getUserPropertyIds } from '@/lib/auth/getUserProperties'
import { FileText } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ReservationsExportPage() {
  // Allow all authenticated roles to access
  const auth = await requireRole(['admin', 'gestor', 'viewer', 'guest'])
  if (!auth.authorized) redirect('/login')

  const supabase = await createClient()
  const userPropertyIds = await getUserPropertyIds(supabase)

  // Fetch properties accessible to user
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
            <FileText className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Exportar Reservas</h1>
          </div>
          <p className="text-gray-600">
            Gere um relatório em PDF com todas as reservas dentro de um período específico
          </p>
        </div>

        {/* Generator Component */}
        <ReservationsPdfGenerator
          properties={properties || []}
          userRole={auth.role || 'viewer'}
        />

        {/* Info Section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">O que está incluído?</h3>
            <ul className="text-sm text-blue-800 space-y-2">
              <li>✓ Todas as reservas confirmadas no período</li>
              <li>✓ Dados do hóspede (nome, email)</li>
              <li>✓ Datas de check-in e check-out</li>
              <li>✓ Número de noites e valor da reserva</li>
              <li>✓ Informações da propriedade</li>
              <li>✓ Resumo com totalizações</li>
            </ul>
          </div>

          <div className="bg-green-50 rounded-lg p-6 border border-green-200">
            <h3 className="text-lg font-semibold text-green-900 mb-2">Como usar?</h3>
            <ol className="text-sm text-green-800 space-y-2">
              <li>1. Selecione a propriedade (ou todas)</li>
              <li>2. Escolha o período desejado</li>
              <li>3. Clique em &quot;Gerar PDF&quot;</li>
              <li>4. O arquivo será baixado automaticamente</li>
              <li>5. Você pode imprimir ou compartilhar</li>
            </ol>
          </div>
        </div>
      </main>
    </AuthLayout>
  )
}
