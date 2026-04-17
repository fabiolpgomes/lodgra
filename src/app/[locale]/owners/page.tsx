import Link from 'next/link'
import { Users, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AuthLayout } from '@/components/common/layout/AuthLayout'
import { OwnersFilter } from '@/components/features/owners/OwnersFilter'
import { getUserRole } from '@/lib/auth/getUserRole'
import { Button } from '@/components/common/ui/button'
import { parsePage, getRange, PAGE_SIZE } from '@/lib/utils/pagination'

export default async function OwnersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const params = await searchParams
  const page = parsePage(params)
  const { from, to } = getRange(page)

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const userRole = await getUserRole(supabase)
  const canEdit = userRole === 'admin' || userRole === 'gestor'
  const canDelete = userRole === 'admin'

  // Proprietários paginados + contagem de propriedades em paralelo
  const [{ data: owners, count: totalCount }, { data: propertyCounts }] = await Promise.all([
    supabase.from('owners').select('*', { count: 'exact' }).order('full_name').range(from, to),
    supabase.from('properties').select('owner_id').not('owner_id', 'is', null),
  ])

  const countMap: Record<string, number> = {}
  propertyCounts?.forEach((p) => {
    countMap[p.owner_id] = (countMap[p.owner_id] || 0) + 1
  })

  return (
    <AuthLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Users className="h-8 w-8 text-blue-600" />
              <h2 className="text-3xl font-bold text-gray-900">Proprietários</h2>
            </div>
            <p className="text-gray-600">Gerencie os proprietários dos imóveis</p>
          </div>
          {canEdit && (
            <Button asChild>
              <Link href="/owners/new" className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Novo Proprietário
              </Link>
            </Button>
          )}
        </div>

        {/* Filter + Search + List */}
        <OwnersFilter
          owners={owners || []}
          countMap={countMap}
          canEdit={canEdit}
          canDelete={canDelete}
          pagination={{ page, total: totalCount ?? 0, pageSize: PAGE_SIZE }}
        />
      </div>
    </AuthLayout>
  )
}
